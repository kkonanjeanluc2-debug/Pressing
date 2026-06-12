-- =============================================================
-- PressCI — Migration 009 : super administrateur
-- Le super admin (opérateur de la plateforme) accède aux
-- statistiques globales : comptes, pressings, abonnements, revenus.
-- Les données sont servies par une API serveur (service role) ;
-- cette table sert uniquement à vérifier le droit d'accès.
-- =============================================================

create table if not exists public.super_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.super_admins enable row level security;

-- Chacun peut seulement vérifier s'il est lui-même super admin.
-- Aucune policy d'écriture : la gestion se fait en SQL / service role.
create policy "super_admins_select_self" on public.super_admins
  for select using (user_id = auth.uid());

-- Compte fondateur (kkonanjeanluc2@gmail.com)
insert into public.super_admins (user_id)
values ('b5d96522-810c-4c57-b040-bd368e835f1e')
on conflict (user_id) do nothing;
