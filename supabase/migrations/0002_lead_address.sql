-- Full meeting address. Private (visible after assignment) like the contact,
-- so it lives with the other private details and inherits their RLS.
alter table lead_private_details add column if not exists address text;
