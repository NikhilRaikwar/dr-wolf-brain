import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    CheckConstraint,
    UniqueConstraint,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.types import TypeDecorator, CHAR
from app.db import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses CHAR(36).
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            return str(uuid.UUID(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class Player(Base):
    __tablename__ = "players"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    chesscom_username = Column(String, nullable=True)
    estimated_rating = Column(Integer, nullable=False, default=800)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Game(Base):
    __tablename__ = "games"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String, nullable=False)  # 'chesscom' | 'pgn'
    external_ref = Column(String, nullable=True)
    played_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint("source IN ('chesscom', 'pgn')", name="chk_game_source"),
    )


class Position(Base):
    __tablename__ = "positions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    game_id = Column(GUID(), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    move_number = Column(Integer, nullable=False)
    fen = Column(String, nullable=False)
    concept = Column(String, nullable=True, index=True)
    engine = Column(JSON, nullable=False, default=dict)
    observed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Session(Base):
    __tablename__ = "sessions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    engine_elo = Column(Integer, nullable=False)
    player_color = Column(String, nullable=False, default="white")
    current_fen = Column(
        String,
        nullable=False,
        default="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    )
    moves_uci = Column(JSON, nullable=False, default=list)
    ply_count = Column(Integer, nullable=False, default=0)
    interruptions_used = Column(Integer, nullable=False, default=0)
    last_interruption_ply = Column(Integer, nullable=True)
    last_trigger_type = Column(String, nullable=True)
    status = Column(String, nullable=False, default="active")
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("player_color IN ('white', 'black')", name="chk_player_color"),
        CheckConstraint("status IN ('active', 'completed', 'abandoned')", name="chk_session_status"),
    )


class Episode(Base):
    __tablename__ = "episodes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    session_id = Column(GUID(), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    move_number = Column(Integer, nullable=False)
    fen = Column(String, nullable=False)
    trigger_evidence = Column(JSON, nullable=False)
    learner_reasoning = Column(JSON, nullable=False)
    learner_action = Column(JSON, nullable=False)
    engine_truth = Column(JSON, nullable=False)
    reasoning_outcome = Column(String, nullable=True)
    move_outcome = Column(String, nullable=True)
    move_quality_cp_loss = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "reasoning_outcome IN ('recognized', 'partial', 'missed')",
            name="chk_reasoning_outcome",
        ),
        CheckConstraint(
            "move_outcome IN ('best', 'acceptable', 'inaccurate', 'mistake')",
            name="chk_move_outcome",
        ),
    )


class Skill(Base):
    __tablename__ = "skills"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    concept = Column(String, nullable=False)
    mastery_score = Column(Float, nullable=True)
    evidence_count = Column(Integer, nullable=False, default=0)
    trend = Column(String, nullable=False, default="new")
    last_updated = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("player_id", "concept", name="uq_player_skill_concept"),
    )


class Hypothesis(Base):
    __tablename__ = "hypotheses"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    concept = Column(String, nullable=False)
    description = Column(String, nullable=False)
    confidence = Column(Float, nullable=False, default=0.5)
    state = Column(String, nullable=False, default="suspected")
    observed_count = Column(Integer, nullable=False, default=0)
    trend = Column(String, nullable=False, default="new")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("player_id", "concept", name="uq_player_hyp_concept"),
        CheckConstraint("confidence >= 0.05 AND confidence <= 0.95", name="chk_hyp_confidence"),
        CheckConstraint(
            "state IN ('suspected', 'needs_evidence', 'developing', 'well_supported')",
            name="chk_hyp_state",
        ),
    )


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(String, nullable=False)  # 'imported_position' | 'think_first_episode'
    source_id = Column(GUID(), nullable=False)
    claim_type = Column(String, nullable=False)   # 'skill' | 'hypothesis'
    concept = Column(String, nullable=False)
    direction = Column(String, nullable=False)    # 'supports' | 'contradicts' | 'seeds'
    observed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('imported_position', 'think_first_episode')",
            name="chk_ev_source_type",
        ),
        CheckConstraint(
            "claim_type IN ('skill', 'hypothesis')",
            name="chk_ev_claim_type",
        ),
        CheckConstraint(
            "direction IN ('supports', 'contradicts', 'seeds')",
            name="chk_ev_direction",
        ),
        CheckConstraint(
            "NOT (source_type = 'imported_position' AND claim_type = 'hypothesis' AND direction IN ('supports', 'contradicts'))",
            name="no_import_hypothesis_claims",
        ),
    )


class BeliefChange(Base):
    __tablename__ = "belief_changes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    player_id = Column(GUID(), ForeignKey("players.id", ondelete="CASCADE"), nullable=False, index=True)
    claim_type = Column(String, nullable=False)  # 'skill' | 'hypothesis'
    concept = Column(String, nullable=False)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "claim_type IN ('skill', 'hypothesis')",
            name="chk_belief_claim_type",
        ),
    )


class TransferPosition(Base):
    __tablename__ = "transfer_positions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    fen = Column(String, nullable=False)
    concept = Column(String, nullable=False, index=True)
    difficulty = Column(Integer, nullable=False)
    tactical_theme = Column(String, nullable=True)
    source = Column(String, nullable=True)
    verified = Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint("difficulty >= 1 AND difficulty <= 5", name="chk_tp_difficulty"),
    )


class DreamCycleRun(Base):
    __tablename__ = "dream_cycle_runs"

    session_id = Column(GUID(), ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True)
    ran_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
