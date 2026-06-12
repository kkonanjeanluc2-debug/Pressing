-- =============================================================
-- PressCI — Migration 006 : profil du propriétaire
-- Compte « personne physique » ou « entreprise » (raison sociale,
-- RCCM, NCC). Ces informations apparaissent sur les documents
-- (rapports de caisse, tickets PDF, états comptables), y compris
-- quand c'est un agent qui les édite.
-- =============================================================

create table if not exists public.profils (
  user_id uuid primary key references auth.users (id) on delete cascade,
  type_compte text not null default 'personne'
    check (type_compte in ('personne', 'entreprise')),
  -- Nom complet (personne physique) ou raison sociale (entreprise)
  nom text not null,
  rccm text,
  ncc text,
  telephone text,
  created_at timestamptz default now()
);

alter table public.profils enable row level security;

-- Lecture : soi-même, ou les agents des pressings du propriétaire
-- (nécessaire pour afficher les infos sur les documents)
create policy "profils_select" on public.profils
  for select using (
    user_id = auth.uid()
    or user_id in (
      select owner_id from public.pressings
      where id in (select public.agent_pressing_ids())
    )
  );

create policy "profils_insert" on public.profils
  for insert with check (user_id = auth.uid());
create policy "profils_update" on public.profils
  for update using (user_id = auth.uid());
