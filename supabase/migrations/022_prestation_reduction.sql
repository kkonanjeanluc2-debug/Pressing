-- Type de prestation par article (lavage, repassage, etc.)
alter table articles_ticket add column if not exists prestation text;

-- Réduction appliquée sur le ticket (montant en FCFA)
alter table tickets add column if not exists reduction integer not null default 0;
