-- =============================================================
-- PressCI — Migration 018 : mode de paiement sur versements partenaires
-- =============================================================

alter table public.versements_partenaires
  add column if not exists mode_paiement text not null default 'cash'
    check (mode_paiement in ('cash', 'wave', 'orange_money', 'mtn_money', 'moov_money', 'virement bancaire'));
