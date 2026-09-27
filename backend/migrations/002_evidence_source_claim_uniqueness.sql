-- 002_evidence_source_claim_uniqueness.sql
-- Forward migration to enforce logical evidence record uniqueness

DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    -- 1. Preflight check: detect whether duplicate logical evidence rows exist
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT source_type, source_id, claim_type, concept
        FROM evidence_records
        GROUP BY source_type, source_id, claim_type, concept
        HAVING COUNT(*) > 1
    ) dups;

    IF dup_count > 0 THEN
        RAISE EXCEPTION 'Cannot apply unique constraint uq_evidence_source_claim_concept: found % duplicate evidence record groups in evidence_records. Manual resolution required.', dup_count;
    END IF;

    -- 2. Add unique constraint if not already present
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_evidence_source_claim_concept'
    ) THEN
        ALTER TABLE evidence_records
        ADD CONSTRAINT uq_evidence_source_claim_concept
        UNIQUE (source_type, source_id, claim_type, concept);
    END IF;
END $$;
