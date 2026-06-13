-- Colonne logo_url dans profils : chaque propriétaire peut uploader son logo
-- pour qu'il apparaisse sur les documents (caisse, comptabilité, tickets).
ALTER TABLE profils ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ⚠️  Créer manuellement dans Supabase Dashboard > Storage :
--   Nom du bucket : logos
--   Accès public  : oui (Public bucket)
--   Taille max    : 2 MB
--   Types autorisés : image/png, image/jpeg, image/webp, image/svg+xml
--
-- Puis ajouter ces politiques RLS sur le bucket logos :
--   INSERT  : auth.uid()::text = (storage.foldername(name))[1]
--   UPDATE  : auth.uid()::text = (storage.foldername(name))[1]
--   DELETE  : auth.uid()::text = (storage.foldername(name))[1]
--   SELECT  : true  (public read)
