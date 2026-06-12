-- =============================================================
-- PressCI — Migration 005 : nouveaux modes de paiement
-- Ajout de MTN Money (mtn_money) et Moov Money (moov_money)
-- sur les tickets, les encaissements et les dépenses.
-- =============================================================

alter table public.tickets
  drop constraint if exists tickets_mode_paiement_check;
alter table public.tickets
  add constraint tickets_mode_paiement_check
  check (mode_paiement in ('cash', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'a_recuperer'));

alter table public.encaissements
  drop constraint if exists encaissements_mode_paiement_check;
alter table public.encaissements
  add constraint encaissements_mode_paiement_check
  check (mode_paiement in ('cash', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'a_recuperer'));

alter table public.depenses
  drop constraint if exists depenses_mode_paiement_check;
alter table public.depenses
  add constraint depenses_mode_paiement_check
  check (mode_paiement in ('cash', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'banque'));
