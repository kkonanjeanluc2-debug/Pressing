-- =============================================================
-- PressCI — Migration 019
-- 1. Couleur sur les articles (pour identifier les vêtements)
-- 2. Catégorie sur les tarifs (vêtement | forfait)
-- 3. Catalogue par défaut étendu (34 articles)
-- 4. Insertion des nouveaux articles sur tous les comptes existants
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Couleur optionnelle sur chaque article d'un ticket
-- ---------------------------------------------------------------
alter table public.articles_ticket
  add column if not exists couleur text;

-- ---------------------------------------------------------------
-- 2. Catégorie sur les tarifs
-- ---------------------------------------------------------------
alter table public.tarifs
  add column if not exists categorie text not null default 'vetement'
    check (categorie in ('vetement', 'forfait'));

-- ---------------------------------------------------------------
-- 3. Catalogue par défaut étendu — trigger sur les nouveaux comptes
-- ---------------------------------------------------------------
create or replace function public.inserer_tarifs_defaut()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.tarifs where owner_id = new.owner_id) then
    return new;
  end if;
  insert into public.tarifs (owner_id, type_article, prix_defaut) values
    -- Vêtements homme
    (new.owner_id, 'Chemise manches longues', 500),
    (new.owner_id, 'Chemise manches courtes', 500),
    (new.owner_id, 'T-shirt / Polo', 400),
    (new.owner_id, 'Pantalon', 700),
    (new.owner_id, 'Jean', 800),
    (new.owner_id, 'Short', 500),
    (new.owner_id, 'Costume 2 pièces', 2500),
    (new.owner_id, 'Costume 3 pièces', 3500),
    (new.owner_id, 'Veste', 1500),
    (new.owner_id, 'Manteau / Blouson', 2000),
    (new.owner_id, 'Cravate', 300),
    -- Vêtements femme
    (new.owner_id, 'Robe', 1500),
    (new.owner_id, 'Robe longue', 2000),
    (new.owner_id, 'Jupe', 800),
    (new.owner_id, 'Jupe longue', 1000),
    (new.owner_id, 'Blouse / Chemisier', 800),
    (new.owner_id, 'Tailleur 2 pièces', 2500),
    -- Vêtements africains
    (new.owner_id, 'Boubou', 2000),
    (new.owner_id, 'Boubou grand complet', 3000),
    (new.owner_id, 'Ensemble africain', 2500),
    (new.owner_id, 'Kaftan', 2000),
    (new.owner_id, 'Agbada', 3500),
    (new.owner_id, 'Pagne (2,5m)', 1500),
    -- Linge de maison
    (new.owner_id, 'Drap simple', 1000),
    (new.owner_id, 'Drap double', 1500),
    (new.owner_id, 'Taie d''oreiller', 300),
    (new.owner_id, 'Couette simple', 2500),
    (new.owner_id, 'Couette double', 3500),
    (new.owner_id, 'Couverture', 1500),
    (new.owner_id, 'Serviette de bain', 500),
    (new.owner_id, 'Rideau (le m²)', 800),
    -- Accessoires
    (new.owner_id, 'Chaussures (paire)', 1000),
    (new.owner_id, 'Sac / Sacoche', 1500),
    (new.owner_id, 'Écharpe', 300);
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 4. Insérer les nouveaux articles pour les comptes existants
--    (uniquement si le nom n'existe pas déjà, insensible à la casse)
-- ---------------------------------------------------------------
insert into public.tarifs (owner_id, type_article, prix_defaut)
select distinct t.owner_id, n.type_article, n.prix_defaut
from (select distinct owner_id from public.tarifs) t
cross join (
  values
    ('Chemise manches longues', 500),
    ('Chemise manches courtes', 500),
    ('T-shirt / Polo', 400),
    ('Jean', 800),
    ('Short', 500),
    ('Manteau / Blouson', 2000),
    ('Cravate', 300),
    ('Robe longue', 2000),
    ('Jupe longue', 1000),
    ('Blouse / Chemisier', 800),
    ('Tailleur 2 pièces', 2500),
    ('Boubou grand complet', 3000),
    ('Ensemble africain', 2500),
    ('Kaftan', 2000),
    ('Agbada', 3500),
    ('Pagne (2,5m)', 1500),
    ('Drap simple', 1000),
    ('Drap double', 1500),
    ('Taie d''oreiller', 300),
    ('Couette simple', 2500),
    ('Couette double', 3500),
    ('Couverture', 1500),
    ('Serviette de bain', 500),
    ('Rideau (le m²)', 800),
    ('Chaussures (paire)', 1000),
    ('Sac / Sacoche', 1500),
    ('Écharpe', 300)
) as n(type_article, prix_defaut)
where not exists (
  select 1 from public.tarifs existing
  where existing.owner_id = t.owner_id
    and lower(existing.type_article) = lower(n.type_article)
);
