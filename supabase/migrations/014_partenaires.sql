-- =============================================================
-- PressCI — Migration 014 : partenaires commerciaux
-- Comptes partenaires (personnes physiques ou entreprises)
-- liés par un contrat de commercialisation avec commission.
-- =============================================================

create table if not exists public.partenaires (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users (id) on delete set null,
  nom              text not null,
  type_compte      text not null default 'personne'
                     check (type_compte in ('personne', 'entreprise')),
  email            text not null unique,
  telephone        text,
  rccm             text,
  taux_commission  numeric(5, 2) not null default 10
                     check (taux_commission >= 0 and taux_commission <= 100),
  code_parrainage  text not null unique,
  statut           text not null default 'actif'
                     check (statut in ('actif', 'suspendu')),
  notes            text,
  created_at       timestamptz default now()
);

alter table public.partenaires enable row level security;

-- Le partenaire peut lire sa propre fiche (pour un futur portail partenaire)
create policy "partenaires_self_select" on public.partenaires
  for select using (user_id = auth.uid());
