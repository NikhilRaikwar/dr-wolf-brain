import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import chess
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from sqlalchemy.pool import StaticPool

# Use in-memory SQLite with StaticPool for fast, isolated unit test suite by default
if not os.environ.get("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.db import Base, get_db
from app import models
from app.main import app

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

from unittest.mock import patch
from app.chess.stockfish import EvalResult
from app.routers.session import engine_adapter

@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def ensure_engine_ready():
    """Ensure engine methods return valid outputs if Stockfish binary is not installed locally."""
    if not engine_adapter._binary_available:
        def mock_analyze(fen, depth=None, multipv=1):
            board = chess.Board(fen)
            if board.is_checkmate():
                white_won = (board.turn == chess.BLACK)
                return EvalResult(
                    best_move="",
                    best_move_san="",
                    eval_white_cp=100000 if white_won else -100000,
                    mate_white=0 if white_won else -0,
                    pv=[],
                    top_moves=[],
                )
            return EvalResult(
                best_move="",
                best_move_san="",
                eval_white_cp=0,
                mate_white=None,
                pv=[],
                top_moves=[],
            )

        def mock_choose_move(fen, strength=None):
            b = chess.Board(fen)
            legal = list(b.legal_moves)
            return legal[0].uci() if legal else "e7e5"

        with patch.object(engine_adapter, "choose_training_move", side_effect=mock_choose_move), \
             patch.object(engine_adapter, "analyze", side_effect=mock_analyze), \
             patch.object(engine_adapter, "eval_after", return_value=0):
            yield
    else:
        yield

@pytest.fixture(scope="function")
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
