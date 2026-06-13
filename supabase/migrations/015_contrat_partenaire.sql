-- =============================================================
-- PressCI — Migration 015 : contrat de partenariat + parrainage
-- Champs signature numérique sur la table partenaires.
-- Champ parraine_par dans profils pour tracer les parrainages.
-- =============================================================

-- Contrat et signatures sur la fiche partenaire
alter table public.partenaires
  add column if not exists contrat_contenu       text,
  add column if not exists signe_admin           boolean     not null default false,
  add column if not exists signe_admin_at        timestamptz,
  add column if not exists signe_admin_nom       text,
  add column if not exists signe_partenaire      boolean     not null default false,
  add column if not exists signe_partenaire_at   timestamptz,
  add column if not exists signe_partenaire_nom  text;

-- Code de parrainage utilisé lors de l'inscription
alter table public.profils
  add column if not exists parraine_par text;

-- Le partenaire peut mettre à jour sa propre signature
create policy "partenaires_self_update" on public.partenaires
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
