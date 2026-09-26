INSERT INTO transfer_positions (fen, concept, difficulty, tactical_theme, source, verified) VALUES
-- King safety: Fool's mate final. Lesson: f/g pawn pushes + queen out = death.
('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 0 1',
 'king_safety', 1, 'mate_threat', 'hand_curated', TRUE),
-- Back-rank mate in 1 (White to play and mate).
('7k/8/6K1/8/8/8/8/3R4 w - - 0 1',
 'opponent_threat_detection', 1, 'back_rank_mate', 'hand_curated', TRUE),
-- Italian Game tabiya (matches PRD episode example). White to play.
('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 9',
 'tactical_awareness', 2, 'piece_activity', 'hand_curated', TRUE),
-- Starting position (sanity / pipeline test).
('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
 'tactical_awareness', 1, 'none', 'hand_curated', TRUE);
