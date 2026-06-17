-- =============================================================
-- PressCI — Migration 020
-- Catalogue complet de vêtements adapté à la Côte d'Ivoire
-- • 86 nouveaux articles ajoutés sans doublon
-- • Mise à jour du trigger pour les nouveaux comptes
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Mise à jour du trigger inserer_tarifs_defaut (nouveaux comptes)
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
    -- ===== VÊTEMENTS HOMME =====
    -- Chemises & hauts
    (new.owner_id, 'Chemise habillée', 500),
    (new.owner_id, 'Chemise manches longues', 500),
    (new.owner_id, 'Chemise manches courtes', 500),
    (new.owner_id, 'Chemise en wax', 600),
    (new.owner_id, 'T-shirt', 400),
    (new.owner_id, 'Polo', 500),
    (new.owner_id, 'Pull', 800),
    (new.owner_id, 'Gilet', 600),
    -- Pantalons & bas
    (new.owner_id, 'Pantalon de costume', 800),
    (new.owner_id, 'Pantalon en jean', 800),
    (new.owner_id, 'Pantalon de travail', 700),
    (new.owner_id, 'Short', 500),
    -- Costumes & complets
    (new.owner_id, 'Veste de costume', 1000),
    (new.owner_id, 'Costume complet (veste + pantalon)', 2500),
    (new.owner_id, 'Costume 2 pièces', 2500),
    (new.owner_id, 'Costume 3 pièces', 3500),
    (new.owner_id, 'Smoking', 3000),
    -- Tenues africaines homme
    (new.owner_id, 'Boubou homme', 2000),
    (new.owner_id, 'Grand boubou (grand complet)', 3000),
    (new.owner_id, 'Kaftan', 2000),
    (new.owner_id, 'Djellaba', 2000),
    (new.owner_id, 'Saharienne', 1500),
    -- Manteaux & vestes homme
    (new.owner_id, 'Manteau', 2000),
    (new.owner_id, 'Blouson', 1500),
    (new.owner_id, 'Veste en cuir', 2000),
    -- Accessoires homme
    (new.owner_id, 'Cravate', 300),
    (new.owner_id, 'Nœud papillon', 300),
    -- ===== VÊTEMENTS FEMME =====
    -- Robes & jupes
    (new.owner_id, 'Robe courte', 1000),
    (new.owner_id, 'Robe longue', 2000),
    (new.owner_id, 'Robe de soirée', 2500),
    (new.owner_id, 'Robe de mariée', 5000),
    (new.owner_id, 'Robe de baptême', 3000),
    (new.owner_id, 'Jupe droite', 800),
    (new.owner_id, 'Jupe longue', 1000),
    (new.owner_id, 'Jupe évasée', 1000),
    (new.owner_id, 'Jupe en wax', 1000),
    -- Hauts femme
    (new.owner_id, 'Blouse', 700),
    (new.owner_id, 'Chemisier', 700),
    (new.owner_id, 'Top', 400),
    (new.owner_id, 'Body', 500),
    -- Ensembles femme
    (new.owner_id, 'Tailleur (veste + jupe)', 2500),
    (new.owner_id, 'Tailleur-pantalon', 2500),
    (new.owner_id, 'Combinaison', 1500),
    (new.owner_id, 'Ensemble wax (haut + jupe ou pantalon)', 2000),
    (new.owner_id, 'Pagne cousu', 2000),
    -- Tenues traditionnelles femme
    (new.owner_id, 'Kabba (tenue traditionnelle CI)', 2500),
    (new.owner_id, 'Attié (tenue de fête)', 2000),
    (new.owner_id, 'Broderie anglaise', 2000),
    (new.owner_id, 'Boubou femme', 2000),
    -- Manteaux & vestes femme
    (new.owner_id, 'Manteau femme', 2000),
    (new.owner_id, 'Veste femme', 1000),
    -- ===== TENUES AFRICAINES & CÉRÉMONIE =====
    (new.owner_id, 'Boubou en bazin riche', 3000),
    (new.owner_id, 'Grand boubou brodé', 4000),
    (new.owner_id, 'Agbada', 3500),
    (new.owner_id, 'Tenue en tissu kita', 3000),
    (new.owner_id, 'Ensemble en tissu fani', 2500),
    (new.owner_id, 'Tenue en pagne wax Woodin/Vlisco', 3000),
    (new.owner_id, 'Tenue en soie', 4000),
    (new.owner_id, 'Ensemble africain', 2500),
    (new.owner_id, 'Pagne (2,5m)', 1500),
    (new.owner_id, 'Tenue de cérémonie (mariage)', 5000),
    (new.owner_id, 'Tenue de cérémonie (baptême)', 3000),
    (new.owner_id, 'Tenue de cérémonie (deuil)', 2000),
    (new.owner_id, 'Costume de danse traditionnelle', 3000),
    (new.owner_id, 'Tenue de chef/notabilité', 5000),
    (new.owner_id, 'Tenue de célébration Tabaski', 3000),
    (new.owner_id, 'Tenue de célébration Noël', 2500),
    (new.owner_id, 'Tenue de célébration Pâques', 2500),
    -- ===== UNIFORMES & TENUES DE TRAVAIL =====
    (new.owner_id, 'Uniforme scolaire (chemise + short/jupe)', 700),
    (new.owner_id, 'Blouse de médecin / infirmier', 800),
    (new.owner_id, 'Tenue de cuisinier / tablier', 700),
    (new.owner_id, 'Uniforme de sécurité / gardien', 800),
    (new.owner_id, 'Tenue militaire', 1000),
    (new.owner_id, 'Blouse de laborantin', 800),
    (new.owner_id, 'Tenue de commis de bureau', 800),
    (new.owner_id, 'Veste de travail', 800),
    (new.owner_id, 'Salopette', 800),
    -- ===== LINGE DE MAISON =====
    (new.owner_id, 'Drap simple', 1000),
    (new.owner_id, 'Drap double', 1500),
    (new.owner_id, 'Drap de lit queen', 2000),
    (new.owner_id, 'Drap de lit king', 2500),
    (new.owner_id, 'Housse de couette', 2000),
    (new.owner_id, 'Taie d''oreiller', 300),
    (new.owner_id, 'Couette simple', 2500),
    (new.owner_id, 'Couette double', 3500),
    (new.owner_id, 'Couverture', 1500),
    (new.owner_id, 'Couverture bébé', 800),
    (new.owner_id, 'Jeté de canapé', 1500),
    (new.owner_id, 'Nappe de table', 800),
    (new.owner_id, 'Serviette de table', 300),
    (new.owner_id, 'Rideau voilage', 500),
    (new.owner_id, 'Rideau opaque', 700),
    (new.owner_id, 'Rideau wax', 800),
    (new.owner_id, 'Tour de lit bébé', 1000),
    -- ===== BAIN =====
    (new.owner_id, 'Serviette de bain petite', 400),
    (new.owner_id, 'Serviette de bain grande', 600),
    (new.owner_id, 'Peignoir de bain', 1500),
    (new.owner_id, 'Tapis de bain', 800),
    -- ===== ARTICLES DÉLICATS & SPÉCIAUX =====
    (new.owner_id, 'Costume de baptême', 2000),
    (new.owner_id, 'Voile de mariée', 3000),
    (new.owner_id, 'Tenue de communion', 1500),
    (new.owner_id, 'Déguisement', 1000),
    (new.owner_id, 'Costume de théâtre', 1500),
    (new.owner_id, 'Maillot de bain', 800),
    (new.owner_id, 'Sous-vêtements délicats (dentelle)', 500),
    (new.owner_id, 'Sous-vêtements délicats (soie)', 600),
    (new.owner_id, 'Veste en similicuir', 1500),
    (new.owner_id, 'Manteau en laine', 3000),
    (new.owner_id, 'Pull en cachemire', 2000),
    (new.owner_id, 'Sac en tissu', 800),
    -- ===== ACCESSOIRES =====
    (new.owner_id, 'Chaussures (paire)', 1000),
    (new.owner_id, 'Sac / Sacoche', 1500),
    (new.owner_id, 'Écharpe', 300);
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- 2. Ajouter les nouveaux articles aux comptes existants
--    (NOT EXISTS insensible à la casse → aucun doublon)
-- ---------------------------------------------------------------
insert into public.tarifs (owner_id, type_article, prix_defaut)
select distinct t.owner_id, n.type_article, n.prix_defaut
from (select distinct owner_id from public.tarifs) t
cross join (
  values
    -- Vêtements homme
    ('Chemise habillée', 500),
    ('Chemise en wax', 600),
    ('T-shirt', 400),
    ('Polo', 500),
    ('Veste de costume', 1000),
    ('Pantalon de costume', 800),
    ('Pantalon de travail', 700),
    ('Djellaba', 2000),
    ('Saharienne', 1500),
    ('Costume complet (veste + pantalon)', 2500),
    ('Smoking', 3000),
    ('Veste en cuir', 2000),
    ('Pull', 800),
    ('Gilet', 600),
    ('Nœud papillon', 300),
    -- Vêtements femme
    ('Robe courte', 1000),
    ('Robe de soirée', 2500),
    ('Robe de mariée', 5000),
    ('Tailleur-pantalon', 2500),
    ('Jupe droite', 800),
    ('Jupe évasée', 1000),
    ('Jupe en wax', 1000),
    ('Blouse', 700),
    ('Chemisier', 700),
    ('Top', 400),
    ('Body', 500),
    ('Combinaison', 1500),
    ('Ensemble wax (haut + jupe ou pantalon)', 2000),
    ('Pagne cousu', 2000),
    ('Kabba (tenue traditionnelle CI)', 2500),
    ('Attié (tenue de fête)', 2000),
    ('Broderie anglaise', 2000),
    ('Boubou femme', 2000),
    ('Manteau femme', 2000),
    ('Veste femme', 1000),
    ('Robe de baptême', 3000),
    -- Tenues africaines & cérémonie
    ('Boubou en bazin riche', 3000),
    ('Grand boubou brodé', 4000),
    ('Tenue en tissu kita', 3000),
    ('Ensemble en tissu fani', 2500),
    ('Tenue en pagne wax Woodin/Vlisco', 3000),
    ('Tenue en soie', 4000),
    ('Tenue de cérémonie (mariage)', 5000),
    ('Tenue de cérémonie (baptême)', 3000),
    ('Tenue de cérémonie (deuil)', 2000),
    ('Costume de danse traditionnelle', 3000),
    ('Tenue de chef/notabilité', 5000),
    ('Tenue de célébration Tabaski', 3000),
    ('Tenue de célébration Noël', 2500),
    ('Tenue de célébration Pâques', 2500),
    -- Uniformes & tenues de travail
    ('Uniforme scolaire (chemise + short/jupe)', 700),
    ('Blouse de médecin / infirmier', 800),
    ('Tenue de cuisinier / tablier', 700),
    ('Uniforme de sécurité / gardien', 800),
    ('Tenue militaire', 1000),
    ('Blouse de laborantin', 800),
    ('Tenue de commis de bureau', 800),
    ('Veste de travail', 800),
    ('Salopette', 800),
    -- Linge de maison
    ('Drap de lit queen', 2000),
    ('Drap de lit king', 2500),
    ('Housse de couette', 2000),
    ('Jeté de canapé', 1500),
    ('Nappe de table', 800),
    ('Serviette de table', 300),
    ('Rideau voilage', 500),
    ('Rideau opaque', 700),
    ('Rideau wax', 800),
    ('Couverture bébé', 800),
    ('Tour de lit bébé', 1000),
    -- Bain
    ('Serviette de bain petite', 400),
    ('Serviette de bain grande', 600),
    ('Peignoir de bain', 1500),
    ('Tapis de bain', 800),
    -- Articles délicats & spéciaux
    ('Costume de baptême', 2000),
    ('Voile de mariée', 3000),
    ('Tenue de communion', 1500),
    ('Déguisement', 1000),
    ('Costume de théâtre', 1500),
    ('Maillot de bain', 800),
    ('Sous-vêtements délicats (dentelle)', 500),
    ('Sous-vêtements délicats (soie)', 600),
    ('Veste en similicuir', 1500),
    ('Manteau en laine', 3000),
    ('Pull en cachemire', 2000),
    ('Sac en tissu', 800)
) as n(type_article, prix_defaut)
where not exists (
  select 1 from public.tarifs existing
  where existing.owner_id = t.owner_id
    and lower(existing.type_article) = lower(n.type_article)
);
