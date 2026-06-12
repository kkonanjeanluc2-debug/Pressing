-- =============================================================
-- PressCI — Migration 008 : permission « gérer les vêtements »
-- Un agent autorisé (permissions->gerer_vetements) peut ajouter
-- et modifier le catalogue de vêtements de son propriétaire.
-- =============================================================

create or replace function public.peut_gerer_vetements(p_owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_owner_id = auth.uid()
  or exists (
    select 1
    from public.agents a
    join public.pressings p on p.id = a.pressing_id
    where a.user_id = auth.uid()
      and a.actif = true
      and p.owner_id = p_owner_id
      and coalesce((a.permissions->>'gerer_vetements')::boolean, false) = true
  )
$$;

drop policy if exists "tarifs_insert" on public.tarifs;
drop policy if exists "tarifs_update" on public.tarifs;
drop policy if exists "tarifs_delete" on public.tarifs;

create policy "tarifs_insert" on public.tarifs
  for insert with check (public.peut_gerer_vetements(owner_id));
create policy "tarifs_update" on public.tarifs
  for update using (public.peut_gerer_vetements(owner_id));
create policy "tarifs_delete" on public.tarifs
  for delete using (public.peut_gerer_vetements(owner_id));
