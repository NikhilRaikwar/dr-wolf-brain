CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chesscom_username TEXT,
  estimated_rating INT NOT NULL DEFAULT 800,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('chesscom','pgn')),
  external_ref TEXT,
  played_at TIMESTAMPTZ,
  result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_games_player_played_at ON games(player_id, played_at DESC);

-- Position-level imported evidence (PRD §8.5: every claim points at a board state)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  move_number INT NOT NULL,
  fen TEXT NOT NULL,
  concept TEXT,                       -- e.g. 'opponent_threat_detection'
  engine JSONB NOT NULL DEFAULT '{}',  -- {best_move, eval_cp, swing_cp, ...}
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_positions_player_concept ON positions(player_id, concept);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  engine_elo INT NOT NULL,
  player_color TEXT NOT NULL DEFAULT 'white' CHECK (player_color IN ('white','black')),
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves_uci JSONB NOT NULL DEFAULT '[]'::jsonb,
  ply_count INT NOT NULL DEFAULT 0,
  interruptions_used INT NOT NULL DEFAULT 0,
  last_interruption_ply INT,
  last_trigger_type TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  move_number INT NOT NULL,
  fen TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'prompted' CHECK (status IN ('prompted','answered','committed','graded')),
  trigger_evidence JSONB NOT NULL,   -- {type, detected_by, engine_facts{threat,key_squares,key_pieces,eval_before,eval_if_missed}}
  learner_reasoning JSONB,           -- {question_asked, choice, free_text, squares_highlighted}
  learner_action JSONB,              -- {move_played}
  engine_truth JSONB,                -- {best_move, best_eval, played_eval, cp_loss, concept}
  reasoning_outcome TEXT CHECK (reasoning_outcome IN ('recognized','partial','missed')),
  move_outcome TEXT CHECK (move_outcome IN ('best','acceptable','inaccurate','mistake')),
  move_quality_cp_loss INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_episodes_session_id ON episodes(session_id);
CREATE INDEX IF NOT EXISTS idx_episodes_player_id ON episodes(player_id);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,              -- 'tactical_awareness' | 'opponent_threat_detection' | 'king_safety' | 'calculation_depth' | 'endgame_technique'
  mastery_score DOUBLE PRECISION,    -- NULL = not enough evidence (PRD §6.4)
  evidence_count INT NOT NULL DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'new',  -- 'new' | 'improving' | 'stable' | 'declining'
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, concept)
);

CREATE TABLE IF NOT EXISTS hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,              -- 'tunnel_vision_after_attack' | 'stops_calculating_early' | 'misses_defensive_resources'
  description TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0.05 AND 0.95),
  state TEXT NOT NULL DEFAULT 'suspected'
    CHECK (state IN ('suspected','needs_evidence','developing','well_supported')),
  observed_count INT NOT NULL DEFAULT 0,   -- meaningful tests (PRD §7)
  trend TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, concept)
);

-- The shared evidence primitive (PRD §8.5). The CHECK constraint enforces the
-- epistemology rule at the database level: imports can only SEED hypotheses.
CREATE TABLE IF NOT EXISTS evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('imported_position','think_first_episode')),
  source_id UUID NOT NULL,            -- positions.id or episodes.id
  claim_type TEXT NOT NULL CHECK (claim_type IN ('skill','hypothesis')),
  concept TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('supports','contradicts','seeds')),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_import_hypothesis_claims CHECK (
    NOT (source_type='imported_position' AND claim_type='hypothesis'
         AND direction IN ('supports','contradicts'))
  )
);
CREATE INDEX IF NOT EXISTS idx_evidence_records_query ON evidence_records(player_id, concept, claim_type);

CREATE TABLE IF NOT EXISTS belief_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('skill','hypothesis')),
  concept TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_belief_changes_player_time ON belief_changes(player_id, created_at DESC);

CREATE TABLE IF NOT EXISTS transfer_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fen TEXT NOT NULL,
  concept TEXT NOT NULL,
  difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  tactical_theme TEXT,
  source TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_transfer_positions_concept_diff ON transfer_positions(concept, difficulty);

CREATE TABLE IF NOT EXISTS dream_cycle_runs (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
