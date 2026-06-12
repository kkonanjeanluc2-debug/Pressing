-- =============================================================
-- PressCI — Schéma initial
-- Gestion de pressing mobile-first pour la Côte d'Ivoire
-- =============================================================

-- ---------------------------------------------------------------
-- Table: pressings
-- ---------------------------------------------------------------
create table if not exists public.pressings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade not null,
  nom text not null,
  telephone text,
  adresse text,
  commune text,
  logo_url text,
  ticket_counter integer not null default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Table: clients
-- ---------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references public.pressings (id) on delete cascade not null,
  nom text not null,
  telephone text not null,
  email text,
  solde_creance integer not null default 0,
  nombre_depots integer not null default 0,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Table: tickets
-- ---------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references public.pressings (id) on delete cascade not null,
  client_id uuid references public.clients (id) not null,
  numero text not null,
  statut text not null default 'nouveau'
    check (statut in ('nouveau', 'en_traitement', 'pret', 'recupere', 'annule')),
  montant_total integer not null check (montant_total >= 0),
  montant_paye integer not null default 0 check (montant_paye >= 0),
  mode_paiement text
    check (mode_paiement in ('cash', 'wave', 'orange_money', 'a_recuperer')),
  date_depot timestamptz default now(),
  date_prevue timestamptz not null,
  date_recuperation timestamptz,
  notes text,
  sms_envoye boolean not null default false,
  sms_envoye_at timestamptz,
  created_at timestamptz default now(),
  -- Le numéro (#001, #002…) est unique par pressing
  unique (pressing_id, numero)
);

-- ---------------------------------------------------------------
-- Table: articles_ticket
-- ---------------------------------------------------------------
create table if not exists public.articles_ticket (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets (id) on delete cascade not null,
  type_article text not null,
  quantite integer not null default 1 check (quantite > 0),
  prix_unitaire integer not null check (prix_unitaire >= 0),
  sous_total integer not null check (sous_total >= 0)
);

-- ---------------------------------------------------------------
-- Table: tarifs
-- ---------------------------------------------------------------
create table if not exists public.tarifs (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references public.pressings (id) on delete cascade not null,
  type_article text not null,
  prix_defaut integer not null check (prix_defaut >= 0),
  actif boolean not null default true
);

-- ---------------------------------------------------------------
-- Table: abonnements
-- ---------------------------------------------------------------
create table if not exists public.abonnements (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references public.pressings (id) on delete cascade not null,
  plan text not null default 'gratuit' check (plan in ('gratuit', 'pro', 'reseau')),
  statut text not null default 'actif' check (statut in ('actif', 'expire', 'suspendu')),
  date_debut timestamptz default now(),
  date_fin timestamptz,
  cinetpay_transaction_id text,
  montant integer,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Table: encaissements (journal de caisse)
-- ---------------------------------------------------------------
create table if not exists public.encaissements (
  id uuid primary key default gen_random_uuid(),
  pressing_id uuid references public.pressings (id) on delete cascade not null,
  ticket_id uuid references public.tickets (id) on delete cascade not null,
  montant integer not null check (montant > 0),
  mode_paiement text not null
    check (mode_paiement in ('cash', 'wave', 'orange_money', 'a_recuperer')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------
-- Index de performance
-- ---------------------------------------------------------------
create index if not exists idx_tickets_pressing_statut on public.tickets (pressing_id, statut);
create index if not exists idx_tickets_pressing_date on public.tickets (pressing_id, date_depot desc);
create index if not exists idx_clients_pressing_tel on public.clients (pressing_id, telephone);
create index if not exists idx_articles_ticket on public.articles_ticket (ticket_id);
create index if not exists idx_encaissements_pressing_date on public.encaissements (pressing_id, created_at desc);
create index if not exists idx_abonnements_pressing on public.abonnements (pressing_id, statut);

-- ---------------------------------------------------------------
-- Fonction utilitaire : pressing(s) de l'utilisateur connecté
-- ---------------------------------------------------------------
create or replace function public.user_pressing_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.pressings where owner_id = auth.uid()
$$;

-- ---------------------------------------------------------------
-- Fonction : numéro de ticket séquentiel par pressing (#001, #002…)
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
  -- Vérifie que l'appelant est bien le propriétaire du pressing
  if not exists (
    select 1 from public.pressings
    where id = p_pressing_id and owner_id = auth.uid()
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

-- ---------------------------------------------------------------
-- Fonction : vérification de la limite du plan gratuit (20 tickets/mois)
-- Appelée côté serveur avant chaque création de ticket.
-- ---------------------------------------------------------------
create or replace function public.peut_creer_ticket(p_pressing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_plan text;
  v_count integer;
begin
  select a.plan into v_plan
  from public.abonnements a
  where a.pressing_id = p_pressing_id
    and a.statut = 'actif'
    and (a.date_fin is null or a.date_fin > now())
  order by a.created_at desc
  limit 1;

  if v_plan is null then
    v_plan := 'gratuit';
  end if;

  if v_plan in ('pro', 'reseau') then
    return true;
  end if;

  select count(*) into v_count
  from public.tickets t
  where t.pressing_id = p_pressing_id
    and t.created_at >= date_trunc('month', now());

  return v_count < 20;
end;
$$;

-- ---------------------------------------------------------------
-- Trigger : maintien des compteurs client (nombre_depots, solde_creance)
-- ---------------------------------------------------------------
create or replace function public.maj_compteurs_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  v_client_id := coalesce(new.client_id, old.client_id);

  update public.clients c
  set
    nombre_depots = (
      select count(*) from public.tickets t
      where t.client_id = v_client_id and t.statut <> 'annule'
    ),
    solde_creance = (
      select coalesce(sum(t.montant_total - t.montant_paye), 0)
      from public.tickets t
      where t.client_id = v_client_id and t.statut <> 'annule'
    )
  where c.id = v_client_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_maj_compteurs_client on public.tickets;
create trigger trg_maj_compteurs_client
after insert or update of montant_total, montant_paye, statut or delete
on public.tickets
for each row execute function public.maj_compteurs_client();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.pressings enable row level security;
alter table public.clients enable row level security;
alter table public.tickets enable row level security;
alter table public.articles_ticket enable row level security;
alter table public.tarifs enable row level security;
alter table public.abonnements enable row level security;
alter table public.encaissements enable row level security;

-- pressings : le propriétaire gère son pressing
create policy "pressings_select" on public.pressings
  for select using (owner_id = auth.uid());
create policy "pressings_insert" on public.pressings
  for insert with check (owner_id = auth.uid());
create policy "pressings_update" on public.pressings
  for update using (owner_id = auth.uid());
create policy "pressings_delete" on public.pressings
  for delete using (owner_id = auth.uid());

-- clients
create policy "clients_select" on public.clients
  for select using (pressing_id in (select public.user_pressing_ids()));
create policy "clients_insert" on public.clients
  for insert with check (pressing_id in (select public.user_pressing_ids()));
create policy "clients_update" on public.clients
  for update using (pressing_id in (select public.user_pressing_ids()));
create policy "clients_delete" on public.clients
  for delete using (pressing_id in (select public.user_pressing_ids()));

-- tickets
create policy "tickets_select" on public.tickets
  for select using (pressing_id in (select public.user_pressing_ids()));
create policy "tickets_insert" on public.tickets
  for insert with check (pressing_id in (select public.user_pressing_ids()));
create policy "tickets_update" on public.tickets
  for update using (pressing_id in (select public.user_pressing_ids()));
create policy "tickets_delete" on public.tickets
  for delete using (pressing_id in (select public.user_pressing_ids()));

-- articles_ticket (via le ticket parent)
create policy "articles_select" on public.articles_ticket
  for select using (
    ticket_id in (
      select id from public.tickets
      where pressing_id in (select public.user_pressing_ids())
    )
  );
create policy "articles_insert" on public.articles_ticket
  for insert with check (
    ticket_id in (
      select id from public.tickets
      where pressing_id in (select public.user_pressing_ids())
    )
  );
create policy "articles_update" on public.articles_ticket
  for update using (
    ticket_id in (
      select id from public.tickets
      where pressing_id in (select public.user_pressing_ids())
    )
  );
create policy "articles_delete" on public.articles_ticket
  for delete using (
    ticket_id in (
      select id from public.tickets
      where pressing_id in (select public.user_pressing_ids())
    )
  );

-- tarifs
create policy "tarifs_select" on public.tarifs
  for select using (pressing_id in (select public.user_pressing_ids()));
create policy "tarifs_insert" on public.tarifs
  for insert with check (pressing_id in (select public.user_pressing_ids()));
create policy "tarifs_update" on public.tarifs
  for update using (pressing_id in (select public.user_pressing_ids()));
create policy "tarifs_delete" on public.tarifs
  for delete using (pressing_id in (select public.user_pressing_ids()));

-- abonnements : lecture seule pour le gérant.
-- Les écritures passent par le webhook CinetPay (service role, bypass RLS),
-- sauf la création de l'abonnement gratuit à l'inscription.
create policy "abonnements_select" on public.abonnements
  for select using (pressing_id in (select public.user_pressing_ids()));
create policy "abonnements_insert_gratuit" on public.abonnements
  for insert with check (
    pressing_id in (select public.user_pressing_ids()) and plan = 'gratuit'
  );

-- encaissements
create policy "encaissements_select" on public.encaissements
  for select using (pressing_id in (select public.user_pressing_ids()));
create policy "encaissements_insert" on public.encaissements
  for insert with check (pressing_id in (select public.user_pressing_ids()));

-- ---------------------------------------------------------------
-- Realtime sur les tickets (tableau de bord en temps réel)
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.tickets;

-- ---------------------------------------------------------------
-- Tarifs par défaut insérés à la création d'un pressing
-- ---------------------------------------------------------------
create or replace function public.inserer_tarifs_defaut()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tarifs (pressing_id, type_article, prix_defaut) values
    (new.id, 'Chemise', 500),
    (new.id, 'Pantalon', 700),
    (new.id, 'Costume 2 pièces', 2500),
    (new.id, 'Costume 3 pièces', 3500),
    (new.id, 'Robe', 1500),
    (new.id, 'Boubou', 2000),
    (new.id, 'Drap', 1000),
    (new.id, 'Couette', 3000),
    (new.id, 'Veste', 1500),
    (new.id, 'Jupe', 800);
  return new;
end;
$$;

drop trigger if exists trg_tarifs_defaut on public.pressings;
create trigger trg_tarifs_defaut
after insert on public.pressings
for each row execute function public.inserer_tarifs_defaut();
