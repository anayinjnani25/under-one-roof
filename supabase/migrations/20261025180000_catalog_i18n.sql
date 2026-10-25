-- Telugu / Hindi text for the catalog. Shape:
--   categories.i18n = { "te": { "title", "accent", "blurb", "care" }, "hi": { ... } }
--   products.i18n   = { "te": { "name", "mini", "description" },     "hi": { ... } }
-- Any missing field falls back to the English column on the site.
-- Drafts are loaded from supabase/catalog-i18n.json (machine-drafted: have a
-- native speaker review before launch).
alter table public.categories add column i18n jsonb not null default '{}'::jsonb;
alter table public.products   add column i18n jsonb not null default '{}'::jsonb;
