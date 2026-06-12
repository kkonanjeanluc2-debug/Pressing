-- =============================================================
-- PressCI — Migration 007
-- 1. Catalogue de vêtements partagé : les tarifs appartiennent au
--    propriétaire et sont visibles dans TOUS ses pressings.
-- 2. Abonnement au niveau du propriétaire/entreprise : le forfait
--    détermine le nombre de pressings autorisés.
-- =============================================================

-- ---------------------------------------------------------------
-- Propriétaire(s) dont l'utilisateur dépend (lui-même, ou le
-- propriétaire du pressing où il est agent)
-- ---------------------------------------------------------------
create or replace function public.mes_proprietaires()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid()
  union
  select p.owner_id from public.pressings p
  where p.id in (select public.agent_pressing_ids())
$$;

-- ---------------------------------------------------------------
-- 1. TARIFS (vêtements) au niveau propriétaire
-- ---------------------------------------------------------------
alter table public.tarifs
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

update public.tarifs t
set owner_id = p.owner_id
from public.pressings p
where p.id = t.pressing_id and t.owner_id is null;

-- Dédoublonner par propriétaire + nom (le catalogue devient commun)
delete from public.tarifs a
using public.tarifs b
where a.owner_id = b.owner_id
  and lower(a.type_article) = lower(b.type_article)
  and a.ctid > b.ctid;

alter table public.tarifs alter column owner_id set not null;
alter table public.tarifs alter column pressing_id drop not null;

-- Nouvelles policies basées sur le propriétaire
drop policy if exists "tarifs_select" on public.tarifs;
drop policy if exists "tarifs_insert" on public.tarifs;
drop policy if exists "tarifs_update" on public.tarifs;
drop policy if exists "tarifs_delete" on public.tarifs;

create policy "tarifs_select" on public.tarifs
  for select using (owner_id in (select public.mes_proprietaires()));
create policy "tarifs_insert" on public.tarifs
  for insert with check (owner_id = auth.uid());
create policy "tarifs_update" on public.tarifs
  for update using (owner_id = auth.uid());
create policy "tarifs_delete" on public.tarifs
  for delete using (owner_id = auth.uid());

create index if not exists idx_tarifs_owner on public.tarifs (owner_id);

-- Tarifs par défaut : uniquement au premier pressing du propriétaire
create or replace function public.inserer_tarifs_defaut()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.tarifs where owner_id = new.owner_id) then
    return new;
  end if;
  insert into public.tarifs (owner_id, type_article, prix_defaut) values
    (new.owner_id, 'Chemise', 500),
    (new.owner_id, 'Pantalon', 700),
    (new.owner_id, 'Costume 2 pièces', 2500),
    (new.owner_id, 'Costume 3 pièces', 3500),
    (new.owner_id, 'Robe', 1500),
    (new.owner_id, 'Boubou', 2000),
    (new.owner_id, 'Drap', 1000),
    (new.owner_id, 'Couette', 3000),
    (new.owner_id, 'Veste', 1500),
    (new.owner_id, 'Jupe', 800);
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 2. ABONNEMENT au niveau propriétaire
-- ---------------------------------------------------------------
alter table public.abonnements
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

update public.abonnements a
set owner_id = p.owner_id
from public.pressings p
where p.id = a.pressing_id and a.owner_id is null;

alter table public.abonnements alter column pressing_id drop not null;

drop policy if exists "abonnements_select" on public.abonnements;
drop policy if exists "abonnements_insert_gratuit" on public.abonnements;

create policy "abonnements_select" on public.abonnements
  for select using (
    owner_id = auth.uid()
    or owner_id in (select public.mes_proprietaires())
  );
create policy "abonnements_insert_gratuit" on public.abonnements
  for insert with check (owner_id = auth.uid() and plan = 'gratuit');

create index if not exists idx_abonnements_owner on public.abonnements (owner_id, statut);

-- ---------------------------------------------------------------
-- Plan actif d'un propriétaire
-- ---------------------------------------------------------------
create or replace function public.plan_proprietaire(p_owner_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select plan from public.abonnements
     where owner_id = p_owner_id
       and statut = 'actif'
       and (date_fin is null or date_fin > now())
     order by created_at desc
     limit 1),
    'gratuit'
  )
$$;

-- ---------------------------------------------------------------
-- Limite de tickets : quota GLOBAL du propriétaire (plan gratuit)
-- ---------------------------------------------------------------
create or replace function public.peut_creer_ticket(p_pressing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_owner uuid;
  v_plan text;
  v_count integer;
begin
  select owner_id into v_owner from public.pressings where id = p_pressing_id;
  if v_owner is null then
    return false;
  end if;

  v_plan := public.plan_proprietaire(v_owner);
  if v_plan in ('pro', 'reseau') then
    return true;
  end if;

  select count(*) into v_count
  from public.tickets t
  join public.pressings p on p.id = t.pressing_id
  where p.owner_id = v_owner
    and t.created_at >= date_trunc('month', now());

  return v_count < 20;
end;
$$;

-- ---------------------------------------------------------------
-- Limite de pressings selon le forfait :
-- gratuit = 1, pro = 1, réseau = illimité
-- ---------------------------------------------------------------
create or replace function public.verifier_limite_pressings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_count integer;
begin
  v_plan := public.plan_proprietaire(new.owner_id);
  if v_plan = 'reseau' then
    return new;
  end if;

  select count(*) into v_count from public.pressings where owner_id = new.owner_id;
  if v_count >= 1 then
    raise exception 'LIMITE_PRESSINGS';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limite_pressings on public.pressings;
create trigger trg_limite_pressings
before insert on public.pressings
for each row execute function public.verifier_limite_pressings();
