-- Migration 004: Game import idempotency uniqueness constraints
-- Enforces DB-level uniqueness on games(player_id, source, external_ref) and positions(game_id, move_number, fen)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM games
    WHERE external_ref IS NOT NULL
    GROUP BY player_id, source, external_ref
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: duplicate (player_id, source, external_ref) exist in games table.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM positions
    GROUP BY game_id, move_number, fen
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preflight check failed: duplicate (game_id, move_number, fen) exist in positions table.';
  END IF;
END $$;

ALTER TABLE games
  ADD CONSTRAINT uq_game_player_source_external_ref
  UNIQUE (player_id, source, external_ref);

ALTER TABLE positions
  ADD CONSTRAINT uq_position_game_move_fen
  UNIQUE (game_id, move_number, fen);
