-- 003_dream_cycle_result_persistence.sql
-- Forward migration to persist exact Dream Cycle result_json, language_json, and status lifecycle

DO $$
DECLARE
    legacy_count INTEGER;
BEGIN
    -- 1. Preflight check: reject legacy rows in dream_cycle_runs lacking canonical result provenance
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'dream_cycle_runs'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'dream_cycle_runs' AND column_name = 'result_json'
        ) THEN
            SELECT COUNT(*) INTO legacy_count FROM dream_cycle_runs;
            IF legacy_count > 0 THEN
                RAISE EXCEPTION 'Cannot apply migration 003_dream_cycle_result_persistence: found % legacy rows in dream_cycle_runs without canonical result provenance. Manual data resolution required.', legacy_count;
            END IF;
        END IF;
    END IF;

    -- 2. Add status column and check constraint
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'dream_cycle_runs' AND column_name = 'status'
    ) THEN
        ALTER TABLE dream_cycle_runs
        ADD COLUMN status VARCHAR NOT NULL DEFAULT 'processing';

        ALTER TABLE dream_cycle_runs
        ADD CONSTRAINT chk_dream_cycle_run_status
        CHECK (status IN ('processing', 'complete'));
    END IF;

    -- 3. Add result_json column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'dream_cycle_runs' AND column_name = 'result_json'
    ) THEN
        ALTER TABLE dream_cycle_runs
        ADD COLUMN result_json JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;

    -- 4. Add language_json column
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'dream_cycle_runs' AND column_name = 'language_json'
    ) THEN
        ALTER TABLE dream_cycle_runs
        ADD COLUMN language_json JSONB NULL;
    END IF;
END $$;
