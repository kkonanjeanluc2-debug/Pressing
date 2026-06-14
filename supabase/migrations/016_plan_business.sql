-- =============================================================
-- PressCI — Migration 016 : plan Business (3 pressings)
-- Ajoute le plan intermédiaire entre Pro (1 pressing) et Réseau (illimité).
-- =============================================================

-- 1. Mettre à jour la contrainte check sur abonnements.plan
alter table public.abonnements
  drop constraint if exists abonnements_plan_check;

alter table public.abonnements
  add constraint abonnements_plan_check
  check (plan in ('gratuit', 'pro', 'business', 'reseau'));

-- 2. Mettre à jour la fonction de limite de pressings
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

  -- Réseau : illimité
  if v_plan = 'reseau' then
    return new;
  end if;

  select count(*) into v_count from public.pressings where owner_id = new.owner_id;

  -- Business : 3 pressings maximum
  if v_plan = 'business' then
    if v_count >= 3 then
      raise exception 'LIMITE_PRESSINGS';
    end if;
    return new;
  end if;

  -- Pro / Gratuit : 1 pressing maximum
  if v_count >= 1 then
    raise exception 'LIMITE_PRESSINGS';
  end if;
  return new;
end;
$$;

-- 3. Mettre à jour la fonction de limite de tickets
--    (Business bénéficie des mêmes illimiteds que Pro et Réseau)
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
  if v_plan in ('pro', 'business', 'reseau') then
    return true;
  end if;

  -- Gratuit : 20 tickets par mois
  select count(*) into v_count
  from public.tickets t
  join public.pressings p on p.id = t.pressing_id
  where p.owner_id = v_owner
    and t.created_at >= date_trunc('month', now());

  return v_count < 20;
end;
$$;
