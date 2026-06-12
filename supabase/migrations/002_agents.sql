-- =============================================================
-- PressCI — Migration 002 : agents et permissions
-- Le propriétaire crée des agents (téléphone + mot de passe)
-- rattachés à un pressing, avec des permissions granulaires.
-- L'agent ne voit que les données de son pressing (RLS).
-- =============================================================

-- ---------------------------------------------------------------
-- Table: agents
-- ---------------------------------------------------------------
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references public.pressings (id) on delete cascade not null,
  user_id uuid references auth.users (id) on delete cascade not null unique,
  nom text not null,
  telephone text not null,
  actif boolean not null default true,
  permissions jsonb not null default '{
    "creer_tickets": true,
    "changer_statut": true,
    "encaisser": true,
    "envoyer_sms": true,
    "gerer_clients": true,
    "voir_caisse": false,
    "voir_stats": false
  }'::jsonb,
  created_at timestamptz default now(),
  unique (pressing_id, telephone)
);

create index if not exists idx_agents_pressing on public.agents (pressing_id);
create index if not exists idx_agents_user on public.agents (user_id);

alter table public.agents enable row level security;

-- ---------------------------------------------------------------
-- Fonction : pressing(s) où l'utilisateur est agent actif
-- (security definer : bypass RLS de la table agents)
-- ---------------------------------------------------------------
create or replace function public.agent_pressing_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select pressing_id from public.agents
  where user_id = auth.uid() and actif = true
$$;

-- ---------------------------------------------------------------
-- user_pressing_ids inclut désormais le pressing de l'agent.
-- Toutes les policies existantes (tickets, clients, tarifs,
-- encaissements, articles) en héritent automatiquement.
-- ---------------------------------------------------------------
create or replace function public.user_pressing_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.pressings where owner_id = auth.uid()
  union
  select pid from public.agent_pressing_ids() as pid
$$;

-- ---------------------------------------------------------------
-- Policies de la table agents
-- ---------------------------------------------------------------
-- Le propriétaire gère les agents de ses pressings ;
-- un agent peut lire sa propre fiche (pour ses permissions).
create policy "agents_select" on public.agents
  for select using (
    pressing_id in (select id from public.pressings where owner_id = auth.uid())
    or user_id = auth.uid()
  );
create policy "agents_insert" on public.agents
  for insert with check (
    pressing_id in (select id from public.pressings where owner_id = auth.uid())
  );
create policy "agents_update" on public.agents
  for update using (
    pressing_id in (select id from public.pressings where owner_id = auth.uid())
  );
create policy "agents_delete" on public.agents
  for delete using (
    pressing_id in (select id from public.pressings where owner_id = auth.uid())
  );

-- ---------------------------------------------------------------
-- L'agent voit son pressing (lecture seule : update/delete restent
-- réservés au propriétaire par les policies existantes)
-- ---------------------------------------------------------------
create policy "pressings_select_agent" on public.pressings
  for select using (id in (select public.agent_pressing_ids()));

-- ---------------------------------------------------------------
-- next_ticket_numero : autorise le propriétaire OU un agent actif
-- ayant la permission creer_tickets
-- ---------------------------------------------------------------
create or replace function public.next_ticket_numero(p_pressing_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counter integer;
begin
  if not exists (
    select 1 from public.pressings
    where id = p_pressing_id and owner_id = auth.uid()
  ) and not exists (
    select 1 from public.agents
    where pressing_id = p_pressing_id
      and user_id = auth.uid()
      and actif = true
      and coalesce((permissions->>'creer_tickets')::boolean, false) = true
  ) then
    raise exception 'Accès refusé';
  end if;

  update public.pressings
  set ticket_counter = ticket_counter + 1
  where id = p_pressing_id
  returning ticket_counter into v_counter;

  return '#' || lpad(v_counter::text, 3, '0');
end;
$$;
