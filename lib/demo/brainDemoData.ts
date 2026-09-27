/**
 * Deterministic Demo Seed Data for Dr. Wolf Brain Dashboard.
 * Strict Truth Boundary: Used ONLY when explicit ?demo=1 is present.
 */

export interface BrainDashboardData {
  player: {
    id: string
    chesscom_username: string | null
    estimated_rating: number | null
    created_at: string | null
  }
  summary: {
    sessions_played: number
    episodes_analyzed: number
    last_updated: string | null
    last_updated_label?: string
  }
  skills: Array<{
    concept: string
    label: string
    mastery_score: number | null
    evidence_count: number
    trend: string
    last_updated: string | null
  }>
  hypotheses: Array<{
    concept: string
    label: string
    description: string
    state: string
    consumer_state: string
    observed_count: number
    evidence_count: number
    observed_label?: string
    trend: string
  }>
  current_focus: {
    concept: string | null
    label: string | null
    rationale: string | null
    stage: string | null
    stage_number?: number
    board_preview: {
      fen: string
      source_label: string
      episode_id?: string
      arrow?: { from: [number, number]; to: [number, number] }
    } | null
  }
  why_asked: {
    narrative: string | null
    evidence_citations: Array<{
      episode_id: string
      move_number: number
      fen: string
      trigger_type: string
      concept: string
      concept_label: string
      reasoning_outcome?: string | null
      move_outcome?: string | null
      created_at?: string | null
    }>
    evidence_list?: string[]
  }
  recent_sessions: Array<{
    id: string
    session_number: number
    date_label: string
    started_at: string | null
    engine_elo: number
    status: string
    graded_episode_count: number
    reasoning_counts: {
      recognized: number
      partial: number
      missed: number
    }
    focus_concept: string | null
    focus_concept_label: string | null
  }>
  recent_belief_updates: Array<{
    id: string
    claim_type: string
    concept: string
    concept_label: string
    old_value: any
    new_value: any
    reason: string | null
    created_at: string | null
  }>
}

export const DEMO_BRAIN_DATA: BrainDashboardData = {
  player: {
    id: 'demo-player-alex',
    chesscom_username: 'Alex (Demo)',
    estimated_rating: 1600,
    created_at: '2024-04-01T00:00:00Z',
  },
  summary: {
    sessions_played: 3,
    episodes_analyzed: 12,
    last_updated: '2024-04-17T18:30:00Z',
    last_updated_label: 'Today',
  },
  skills: [
    {
      concept: 'tactical_awareness',
      label: 'Tactical Awareness',
      mastery_score: 74.0,
      evidence_count: 8,
      trend: 'improving',
      last_updated: '2024-04-17T18:30:00Z',
    },
    {
      concept: 'opponent_threat_detection',
      label: 'Opponent Threat Detection',
      mastery_score: 61.0,
      evidence_count: 7,
      trend: 'improving',
      last_updated: '2024-04-17T18:30:00Z',
    },
    {
      concept: 'king_safety',
      label: 'King Safety Awareness',
      mastery_score: 68.0,
      evidence_count: 5,
      trend: 'stable',
      last_updated: '2024-04-16T12:00:00Z',
    },
    {
      concept: 'calculation_depth',
      label: 'Calculation Depth',
      mastery_score: 57.0,
      evidence_count: 4,
      trend: 'declining',
      last_updated: '2024-04-15T10:00:00Z',
    },
    {
      concept: 'endgame_technique',
      label: 'Endgame Technique',
      mastery_score: null, // null renders 'Not enough evidence yet'
      evidence_count: 1,
      trend: 'new',
      last_updated: null,
    },
  ],
  hypotheses: [
    {
      concept: 'tunnel_vision_after_attack',
      label: 'Tunnel vision after finding an attack',
      description: 'You tend to focus on your attacking idea and miss opponent counterplay.',
      state: 'well_supported',
      consumer_state: 'Well-supported',
      observed_count: 4,
      evidence_count: 7,
      observed_label: 'Seen in 4 Think First episodes',
      trend: 'improving',
    },
    {
      concept: 'stops_calculating_early',
      label: 'Stops calculating after first candidate',
      description: 'You often consider one good move and stop before checking alternatives.',
      state: 'developing',
      consumer_state: 'Developing',
      observed_count: 2,
      evidence_count: 4,
      observed_label: 'Seen in 2 episodes',
      trend: 'stable',
    },
    {
      concept: 'misses_defensive_resources',
      label: 'Misses defensive resources',
      description: 'Sometimes overlooks defensive moves for either side.',
      state: 'needs_evidence',
      consumer_state: 'Needs evidence',
      observed_count: 0,
      evidence_count: 0,
      observed_label: '',
      trend: 'new',
    },
  ],
  current_focus: {
    concept: 'opponent_threat_detection',
    label: 'Opponent Threat Detection',
    rationale: 'You often miss your opponent\'s counterplay after spotting your own attacking idea. We\'re working on noticing threats before committing to a move.',
    stage: 'recognize',
    stage_number: 2,
    board_preview: {
      fen: 'r2q1rk1/pp1b1ppp/2n1pn2/2bp4/2P5/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9',
      source_label: 'From Episode #21',
      episode_id: 'ep-demo-21',
      arrow: {
        from: [5, 3], // d3
        to: [3, 5],   // f5
      },
    },
  },
  why_asked: {
    narrative:
      'In 4 of your last 7 comparable Think First positions, you identified your own attacking idea but missed the opponent\'s counterplay. I asked this question to test whether you would spot the threat before moving.',
    evidence_citations: [
      {
        episode_id: 'ep-demo-14',
        move_number: 14,
        fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
        trigger_type: 'opponent_threat',
        concept: 'opponent_threat_detection',
        concept_label: 'Opponent Threat Detection',
        reasoning_outcome: 'recognized',
        move_outcome: 'best',
        created_at: '2024-04-17T18:00:00Z',
      },
      {
        episode_id: 'ep-demo-21',
        move_number: 21,
        fen: 'r2q1rk1/pp1b1ppp/2n1pn2/2bp4/2P5/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9',
        trigger_type: 'opponent_threat',
        concept: 'opponent_threat_detection',
        concept_label: 'Opponent Threat Detection',
        reasoning_outcome: 'partial',
        move_outcome: 'acceptable',
        created_at: '2024-04-14T16:00:00Z',
      },
      {
        episode_id: 'ep-demo-28',
        move_number: 28,
        fen: 'r1bqk2r/ppp2ppp/2n5/3np3/1bB5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 6',
        trigger_type: 'opponent_threat',
        concept: 'opponent_threat_detection',
        concept_label: 'Opponent Threat Detection',
        reasoning_outcome: 'recognized',
        move_outcome: 'best',
        created_at: '2024-04-12T14:00:00Z',
      },
    ],
    evidence_list: ['Episode #14', 'Episode #21', 'Episode #28', 'Episode #31'],
  },
  recent_sessions: [
    {
      id: 'sess-1',
      session_number: 1,
      date_label: 'Apr 12, 2024',
      started_at: '2024-04-12T14:30:00Z',
      engine_elo: 850,
      status: 'completed',
      graded_episode_count: 3,
      reasoning_counts: {
        recognized: 2,
        partial: 0,
        missed: 1,
      },
      focus_concept: 'opponent_threat_detection',
      focus_concept_label: 'Opponent Threat Detection',
    },
    {
      id: 'sess-2',
      session_number: 2,
      date_label: 'Apr 14, 2024',
      started_at: '2024-04-14T16:15:00Z',
      engine_elo: 900,
      status: 'completed',
      graded_episode_count: 4,
      reasoning_counts: {
        recognized: 3,
        partial: 1,
        missed: 0,
      },
      focus_concept: 'tactical_awareness',
      focus_concept_label: 'Tactical Awareness',
    },
    {
      id: 'sess-3',
      session_number: 3,
      date_label: 'Apr 17, 2024',
      started_at: '2024-04-17T18:00:00Z',
      engine_elo: 950,
      status: 'completed',
      graded_episode_count: 5,
      reasoning_counts: {
        recognized: 4,
        partial: 0,
        missed: 1,
      },
      focus_concept: 'opponent_threat_detection',
      focus_concept_label: 'Opponent Threat Detection',
    },
  ],
  recent_belief_updates: [
    {
      id: 'bc-1',
      claim_type: 'skill',
      concept: 'opponent_threat_detection',
      concept_label: 'Threat detection',
      old_value: 54,
      new_value: 61,
      reason: 'Consolidated in Session 3',
      created_at: '2024-04-17T18:30:00Z',
    },
    {
      id: 'bc-2',
      claim_type: 'hypothesis',
      concept: 'tunnel_vision_after_attack',
      concept_label: 'Tunnel vision',
      old_value: 'Developing',
      new_value: 'Well-supported',
      reason: 'Consistent evidence across 4 episodes',
      created_at: '2024-04-14T16:30:00Z',
    },
  ],
}
