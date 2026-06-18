-- =============================================================
-- PressCI — Migration 021
-- Codes promo : 5% de réduction à l'abonnement
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Table des codes promo
-- ---------------------------------------------------------------
create table if not exists public.codes_promo (
  id           uuid    default gen_random_uuid() primary key,
  code         text    unique not null,
  reduction_pct integer not null default 5 check (reduction_pct between 1 and 100),
  actif        boolean not null default true,
  created_at   timestamptz default now()
);

alter table public.codes_promo enable row level security;

-- Les utilisateurs connectés peuvent lire les codes (pour valider leur code avant paiement)
create policy "codes_promo_select_auth" on public.codes_promo
  for select to authenticated using (true);

-- ---------------------------------------------------------------
-- 2. Colonne reduction_promo sur abonnements
--    (stocke le % de réduction promo appliqué à cet abonnement)
-- ---------------------------------------------------------------
alter table public.abonnements
  add column if not exists reduction_promo integer not null default 0;
