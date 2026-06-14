-- =============================================================
-- PressCI — Migration 017 : versements partenaires
-- Historique des versements de commission versés aux partenaires.
-- =============================================================

create table if not exists public.versements_partenaires (
  id          uuid           default gen_random_uuid() primary key,
  partenaire_id uuid         not null references public.partenaires(id) on delete cascade,
  montant     numeric(10,0)  not null check (montant > 0),
  commentaire text,
  verse_par   text           not null,
  created_at  timestamptz    default now() not null
);

create index if not exists versements_partenaires_partenaire_id_idx
  on public.versements_partenaires(partenaire_id);

alter table public.versements_partenaires enable row level security;

-- Chaque partenaire peut consulter ses propres versements
create policy "partenaire_voir_ses_versements"
  on public.versements_partenaires
  for select
  using (
    partenaire_id in (
      select id from public.partenaires where user_id = auth.uid()
    )
  );
