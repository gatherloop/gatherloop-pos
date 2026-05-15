-- No-op: the backfill cannot be safely reversed without losing snapshot rows
-- that may have been edited or that overlap with the original 000005 backfill.
SELECT 1;
