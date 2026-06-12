-- =============================================================
-- PressCI — Migration 004 : comptabilité SYSCOHADA (dépenses)
-- Journal des dépenses par pressing, imputées sur les comptes de
-- charges du plan comptable SYSCOHADA révisé (classe 6).
-- Les recettes (encaissements) alimentent automatiquement le
-- compte 706 « Services vendus » côté application.
-- =============================================================

create table if not exists public.depenses (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references public.pressings (id) on delete cascade not null,
  date_depense date not null default current_date,
  libelle text not null,
  -- Code du compte de charge SYSCOHADA (ex : 6051 Eau, 661 Salaires…)
  compte text not null,
  montant integer not null check (montant > 0),
  mode_paiement text not null
    check (mode_paiement in ('cash', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'banque')),
  reference text,
  created_at timestamptz default now()
);

create index if not exists idx_depenses_pressing_date
  on public.depenses (pressing_id, date_depense desc);

alter table public.depenses enable row level security;

-- ---------------------------------------------------------------
-- Droit de gestion des dépenses : propriétaire, ou agent actif
-- avec la permission gerer_depenses
-- ---------------------------------------------------------------
create or replace function public.peut_gerer_depenses(p_pressing_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.pressings
    where id = p_pressing_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.agents
    where pressing_id = p_pressing_id
      and user_id = auth.uid()
      and actif = true
      and coalesce((permissions->>'gerer_depenses')::boolean, false) = true
  )
$$;

-- Lecture : tous les membres du pressing
create policy "depenses_select" on public.depenses
  for select using (pressing_id in (select public.user_pressing_ids()));

-- Écriture : propriétaire ou agent autorisé
create policy "depenses_insert" on public.depenses
  for insert with check (public.peut_gerer_depenses(pressing_id));
create policy "depenses_update" on public.depenses
  for update using (public.peut_gerer_depenses(pressing_id));
create policy "depenses_delete" on public.depenses
  for delete using (public.peut_gerer_depenses(pressing_id));
