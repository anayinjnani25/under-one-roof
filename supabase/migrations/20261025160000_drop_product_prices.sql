-- Prices are never published: shoppers ask for them on WhatsApp.
-- Remove the column entirely so they can't be read through the public API.
alter table public.products drop column price;
