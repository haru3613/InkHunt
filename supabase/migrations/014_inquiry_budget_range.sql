-- HAR-528 (v0.11 W1 Slice A): additive inquiries.budget_range column.
-- Foundation for the v0.11「詢價預算意圖」intake — the asker optionally picks a
-- categorical budget range on the inquiry form (threaded in Slice C, displayed
-- artist-side in Slice D). This is a qualifying preference field, the same class
-- as the shipped /artists budget FILTER (v0.3), NOT a payment or price/quote
-- calculation and NOT money-math.
--
-- ADDITIVE + REVERSIBLE: adds ONE nullable text column. No default, no CHECK
-- (the allowed value set is validated in the app layer in Slice C, keeping the
-- column trivially droppable), no backfill. Existing `inquiries` rows are
-- untouched — budget_range is NULL for every prior row.
--
-- Down-migration: `ALTER TABLE inquiries DROP COLUMN budget_range;`

ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS budget_range text;
