-- =============================================================
-- PressCI — Migration 003 : ouverture / fermeture des pressings
-- Quand un agent se connecte, son pressing passe « ouvert » avec
-- l'heure d'ouverture ; à la déconnexion il passe « fermé » avec
-- l'heure de fermeture.
-- =============================================================

alter table public.pressings
  add column if not exists ouvert boolean not null default false,
  add column if not exists ouvert_depuis timestamptz,
  add column if not exists ferme_a timestamptz,
  add column if not exists ouvert_par text;

-- ---------------------------------------------------------------
-- Ouvrir le pressing (agent actif du pressing, ou propriétaire)
-- ---------------------------------------------------------------
create or replace function public.ouvrir_pressing(p_pressing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_agent text;
begin
  select nom into v_nom_agent
  from public.agents
  where pressing_id = p_pressing_id and user_id = auth.uid() and actif = true;

  if v_nom_agent is null and not exists (
    select 1 from public.pressings
    where id = p_pressing_id and owner_id = auth.uid()
  ) then
    raise exception 'Accès refusé';
  end if;

  -- Ne réinitialise pas l'heure si le pressing est déjà ouvert
  update public.pressings
  set ouvert = true,
      ouvert_depuis = now(),
      ferme_a = null,
      ouvert_par = coalesce(v_nom_agent, 'Propriétaire')
  where id = p_pressing_id and ouvert = false;
end;
$$;

-- ---------------------------------------------------------------
-- Fermer le pressing
-- ---------------------------------------------------------------
create or replace function public.fermer_pressing(p_pressing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.agents
    where pressing_id = p_pressing_id and user_id = auth.uid() and actif = true
  ) and not exists (
    select 1 from public.pressings
    where id = p_pressing_id and owner_id = auth.uid()
  ) then
    raise exception 'Accès refusé';
  end if;

  update public.pressings
  set ouvert = false,
      ferme_a = now()
  where id = p_pressing_id and ouvert = true;
end;
$$;
