-- Formules d'abonnement définies par le pressing (ex: "20 vêtements / 30 jours")
create table if not exists formules_abonnement (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  pressing_id     uuid references pressings(id) on delete cascade,
  nom             text not null,
  quota_vetements integer not null check (quota_vetements > 0),
  prix            integer not null default 0,
  actif           boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table formules_abonnement enable row level security;
create policy "proprio formule" on formules_abonnement
  using  (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Abonnements actifs / expirés des clients
create table if not exists abonnements_clients (
  id                  uuid primary key default gen_random_uuid(),
  pressing_id         uuid not null references pressings(id) on delete cascade,
  client_id           uuid not null references clients(id) on delete cascade,
  formule_id          uuid references formules_abonnement(id),
  nom_formule         text not null,
  quota_vetements     integer not null,
  vetements_utilises  integer not null default 0,
  prix                integer not null default 0,
  date_debut          timestamptz not null default now(),
  date_fin            timestamptz not null,
  statut              text not null default 'actif'
                        check (statut in ('actif', 'epuise', 'expire')),
  created_at          timestamptz not null default now()
);

alter table abonnements_clients enable row level security;

-- Propriétaire : accès complet
create policy "proprio abo client" on abonnements_clients
  using (
    pressing_id in (select id from pressings where owner_id = auth.uid())
  )
  with check (
    pressing_id in (select id from pressings where owner_id = auth.uid())
  );

-- Agents : lecture + mise à jour (déduction vêtements après ticket)
create policy "agent abo client select" on abonnements_clients
  for select using (
    pressing_id in (select pressing_id from agents where user_id = auth.uid() and actif = true)
  );

create policy "agent abo client update" on abonnements_clients
  for update using (
    pressing_id in (select pressing_id from agents where user_id = auth.uid() and actif = true)
  );

create policy "agent abo client insert" on abonnements_clients
  for insert with check (
    pressing_id in (select pressing_id from agents where user_id = auth.uid() and actif = true)
  );
