-- =============================================================
-- PressCI — Migration 010 : passage de CinetPay à GeniusPay
-- La colonne de référence de transaction devient générique.
-- =============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'abonnements'
      and column_name = 'cinetpay_transaction_id'
  ) then
    alter table public.abonnements
      rename column cinetpay_transaction_id to transaction_id;
  end if;
end $$;
