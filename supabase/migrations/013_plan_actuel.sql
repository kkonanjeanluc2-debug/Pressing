-- =============================================================
-- Migration 013 — Fonction utilitaire : plan actif de l'utilisateur courant
-- Fonctionne pour les propriétaires ET les agents (via le pressing associé).
-- =============================================================

create or replace function public.plan_actuel_utilisateur()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select public.plan_proprietaire(
    coalesce(
      -- Si l'utilisateur est un agent, on prend l'owner de son pressing
      (
        select p.owner_id
        from public.pressings p
        inner join public.agents a on a.pressing_id = p.id
        where a.user_id = auth.uid()
        limit 1
      ),
      -- Sinon l'utilisateur EST le propriétaire
      auth.uid()
    )
  )
$$;
