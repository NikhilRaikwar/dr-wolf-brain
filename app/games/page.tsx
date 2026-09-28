'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  DashboardShell,
  EmptyState,
} from '@/components/dashboard'
import { InteractiveChessboard } from '@/components/InteractiveChessboard'
import {
  Clock,
  FileText,
  Upload,
  User,
  ArrowRight,
  Shield,
  BookOpen,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react'

interface ImportedGame {
  id: string
  player_id: string
  source: 'chesscom' | 'pgn'
  external_ref: string | null
  played_at: string | null
  result: string | null
  opponent: string
  opening: string
  player_color: string
  positions_analyzed_count: number
  created_at: string
}

interface AnalyzedPosition {
  id: string
  move_number: number
  fen: string
  concept: string | null
  engine: {
    best_move?: string
    eval_white_cp?: number
    mate_white?: number | null
    cp_loss?: number
    played_move?: string
    outcome?: string
    facts?: Record<string, any>
    pv?: string[]
    player_color?: string
    opponent?: string
    opening?: string
  }
  observed_at: string
}

interface GameDetail {
  id: string
  player_id: string
  source: string
  external_ref: string | null
  played_at: string | null
  result: string | null
  created_at: string
  positions: AnalyzedPosition[]
}

const CONCEPT_LABELS: Record<string, string> = {
  tactical_awareness: 'Tactical Awareness',
  opponent_threat_detection: 'Opponent Threat Detection',
  king_safety: 'King Safety Awareness',
  calculation_depth: 'Calculation Depth',
  endgame_technique: 'Endgame Technique',
}

function GamesContent() {
  const searchParams = useSearchParams()
  const isDemoMode = searchParams.get('demo') === '1'

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [games, setGames] = useState<ImportedGame[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Modals state
  const [showChesscomModal, setShowChesscomModal] = useState<boolean>(false)
  const [showPgnModal, setShowPgnModal] = useState<boolean>(false)
  const [selectedGameDetail, setSelectedGameDetail] = useState<GameDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false)
  const [selectedPositionIndex, setSelectedPositionIndex] = useState<number>(0)

  // Import form state
  const [chesscomUsername, setChesscomUsername] = useState<string>('')
  const [chesscomMaxGames, setChesscomMaxGames] = useState<number>(10)
  const [pgnText, setPgnText] = useState<string>('')
  const [pgnMaxGames, setPgnMaxGames] = useState<number>(10)
  const [importing, setImporting] = useState<boolean>(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  // Initialize or fetch player
  useEffect(() => {
    let pid = typeof window !== 'undefined' ? localStorage.getItem('dr_wolf_player_id') : null
    const username = typeof window !== 'undefined' ? localStorage.getItem('dr_wolf_username') : null
    if (username && username !== 'Learner') {
      setChesscomUsername(username)
    }

    if (!pid) {
      // Auto-create local player
      fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chesscom_username: null, estimated_rating: 800 }),
      })
        .then((res) => res.json())
        .then((player) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('dr_wolf_player_id', player.id)
            localStorage.setItem('dr_wolf_rating', '800')
          }
          setPlayerId(player.id)
          fetchGames(player.id)
        })
        .catch(() => {
          setError('Could not initialize local player identity.')
          setLoading(false)
        })
    } else {
      setPlayerId(pid)
      fetchGames(pid)
    }
  }, [])

  const fetchGames = async (pid: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/games?player_id=${pid}`)
      if (res.ok) {
        const data: ImportedGame[] = await res.json()
        setGames(data)
      } else {
        setError(`Failed to fetch games (HTTP ${res.status})`)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend server')
    } finally {
      setLoading(false)
    }
  }

  const handleChesscomImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId) return
    if (!chesscomUsername.trim()) {
      setImportError('Please enter a Chess.com username.')
      return
    }

    setImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const res = await fetch('/api/import/chesscom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          username: chesscomUsername.trim(),
          max_games: chesscomMaxGames,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || `Import failed with status ${res.status}`)
      }

      setImportSuccess(
        `Imported ${data.games_imported} game${data.games_imported === 1 ? '' : 's'} (${data.positions_analyzed} positions analyzed at Stockfish depth 18). ${
          data.games_skipped_existing > 0
            ? `${data.games_skipped_existing} game(s) skipped as already imported.`
            : ''
        }`
      )

      // Refresh games list
      await fetchGames(playerId)
      setTimeout(() => {
        setShowChesscomModal(false)
        setImportSuccess(null)
      }, 2500)
    } catch (err: any) {
      setImportError(err.message || 'Failed to import games from Chess.com')
    } finally {
      setImporting(false)
    }
  }

  const handlePgnImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId) return
    if (!pgnText.trim()) {
      setImportError('Please paste valid PGN text or select a file.')
      return
    }

    setImporting(true)
    setImportError(null)
    setImportSuccess(null)

    try {
      const res = await fetch('/api/import/pgn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: playerId,
          pgn: pgnText.trim(),
          max_games: pgnMaxGames,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || `PGN import failed with status ${res.status}`)
      }

      setImportSuccess(
        `Imported ${data.games_imported} game${data.games_imported === 1 ? '' : 's'} (${data.positions_analyzed} key positions analyzed at Stockfish depth 18). ${
          data.games_skipped_existing > 0
            ? `${data.games_skipped_existing} game(s) were previously imported.`
            : ''
        }`
      )

      // Refresh games list
      await fetchGames(playerId)
      setPgnText('')
      setTimeout(() => {
        setShowPgnModal(false)
        setImportSuccess(null)
      }, 2500)
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse and import PGN')
    } finally {
      setImporting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      if (content) {
        setPgnText(content)
      }
    }
    reader.readAsText(file)
  }

  const openGameDetail = async (gameId: string) => {
    setLoadingDetail(true)
    setSelectedPositionIndex(0)
    try {
      const res = await fetch(`/api/games/${gameId}`)
      if (res.ok) {
        const detail: GameDetail = await res.json()
        setSelectedGameDetail(detail)
      }
    } catch (err) {
      console.error('Failed to load game detail:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const formatPlayedDate = (isoStr: string | null) => {
    if (!isoStr) return 'Recent'
    try {
      const d = new Date(isoStr)
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return 'Recent'
    }
  }

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Your Games
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Import, explore, and analyze your chess games with Stockfish 18 depth.
            </p>
          </div>

          {/* Top Actions: Import from Chess.com + Upload PGN */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setImportError(null)
                setImportSuccess(null)
                setShowChesscomModal(true)
              }}
              className="flex items-center gap-3 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] hover:bg-[#faf4ea] px-4 py-2.5 shadow-sm transition-all text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efe4d1] text-[#6d503b]">
                <User className="h-4 w-4" />
              </div>
              <div className="text-xs font-serif">
                <span className="font-bold text-[#2d170e] block">Import from Chess.com</span>
                <span className="text-[11px] text-[#6d503b]">Enter a public Chess.com username to import recent games.</span>
              </div>
            </button>

            <button
              onClick={() => {
                setImportError(null)
                setImportSuccess(null)
                setShowPgnModal(true)
              }}
              className="flex items-center gap-3 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] hover:bg-[#faf4ea] px-4 py-2.5 shadow-sm transition-all text-left"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efe4d1] text-[#6d503b]">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-xs font-serif">
                <span className="font-bold text-[#2d170e] block">Upload / Paste PGN</span>
                <span className="text-[11px] text-[#6d503b]">Analyze custom PGN files</span>
              </div>
            </button>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#845722] mb-3" />
            <p className="font-serif text-sm font-semibold text-[#2d170e]">Loading your games...</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800 font-serif flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
            {playerId && (
              <button
                onClick={() => fetchGames(playerId)}
                className="flex items-center gap-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-900 px-3 py-1.5 text-xs font-bold transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && games.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="No Imported Games Yet"
            message="Import from a public Chess.com username or upload PGN files to analyze historical games with Stockfish and seed initial hypotheses."
            hint="Imported games observe WHAT was played. To record WHY you played each move and build active cognitive evidence, start a Think First session."
            action={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowChesscomModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-5 py-2.5 font-serif text-xs font-bold text-[#fbf1dc] hover:bg-[#23120b] transition-all"
                >
                  <User className="h-4 w-4" />
                  <span>Import from Chess.com</span>
                </button>
                <Link
                  href={isDemoMode ? '/play?demo=1' : '/play'}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e5d8c5] bg-[#fffdfa] hover:bg-[#faf4ea] px-5 py-2.5 font-serif text-xs font-bold text-[#4a3224] transition-all"
                >
                  <span>Play Think First Session</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            }
          />
        )}

        {/* Real Games Table */}
        {!loading && !error && games.length > 0 && (
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] shadow-[0_2px_12px_rgba(60,35,18,0.03)] overflow-hidden font-serif">
            <div className="p-5 sm:p-6 border-b border-[#e5d8c5]/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#faf6ee]/50">
              <div>
                <h2 className="text-lg font-bold text-[#2d170e]">Persisted Imported Games</h2>
                <p className="text-xs text-[#6d503b] mt-0.5">
                  Showing {games.length} game{games.length === 1 ? '' : 's'} with engine-backed position analysis.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8c745f]">
                <Shield className="h-4 w-4 text-[#845722]" />
                <span>Stockfish 18 depth verified</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#e5d8c5] bg-[#fbf8f2] text-[#6d503b] font-bold">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Opponent</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Analyzed Moments</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5d8c5]/60 text-[#2d170e]">
                  {games.map((g) => {
                    const isWin = g.result === '1-0' && g.player_color === 'white' || g.result === '0-1' && g.player_color === 'black' || g.result === 'win'
                    const isDraw = g.result === '1/2-1/2' || g.result === 'draw'
                    const resultBadgeClass = isWin
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : isDraw
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'
                    const resultLabel = isWin ? 'Won' : isDraw ? 'Draw' : 'Lost'

                    return (
                      <tr key={g.id} className="hover:bg-[#faf6ee]/70 transition-colors">
                        <td className="py-3.5 px-4 text-xs text-[#6d503b] whitespace-nowrap">
                          {formatPlayedDate(g.played_at)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#2d170e]">
                          {g.opponent || 'Opponent'}
                        </td>
                        <td className="py-3.5 px-4 capitalize text-xs">
                          <span className="inline-flex items-center gap-1">
                            <span
                              className={`h-2.5 w-2.5 rounded-full border ${
                                g.player_color === 'white'
                                  ? 'bg-white border-neutral-400'
                                  : 'bg-neutral-900 border-neutral-900'
                              }`}
                            />
                            {g.player_color || 'White'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${resultBadgeClass}`}
                          >
                            {resultLabel} ({g.result || '*'})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 capitalize text-xs text-[#6d503b]">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f3ecdf] text-[#543b2c] font-semibold text-[11px]">
                            {g.source === 'chesscom' ? 'Chess.com' : 'PGN'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-[#845722]">
                          {g.positions_analyzed_count} key moment{g.positions_analyzed_count === 1 ? '' : 's'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openGameDetail(g.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#efe4d1] hover:bg-[#e4d4bd] text-[#2d170e] px-3 py-1 text-xs font-bold transition-all shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#845722]" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Epistemic Architecture Explanation Card */}
        <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-3 font-serif">
          <div className="flex items-center gap-2 text-sm font-bold text-[#2d170e]">
            <Shield className="h-4 w-4 text-[#845722]" />
            <h3>How Dr. Wolf Evaluates Imported Games</h3>
          </div>
          <p className="text-xs text-[#6d503b] leading-relaxed">
            Per the Dr. Wolf Brain product contract, imported PGN games reveal what happened on the board (accuracy, blunder points, and critical positions), but cannot directly observe your reasoning. Therefore, imported games contribute reduced-weight skill evidence (0.5x) and can only <strong>seed</strong> hypotheses — never confirm or refute them without interactive Think First evidence.
          </p>
        </div>
      </div>

      {/* Connect Chess.com Modal */}
      {showChesscomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-2xl font-serif space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5d8c5]/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efe4d1] text-[#6d503b]">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2d170e]">Import from Chess.com</h3>
                  <p className="text-[11px] text-[#6d503b]">Fetch recent games via official public API</p>
                </div>
              </div>
              <button
                onClick={() => !importing && setShowChesscomModal(false)}
                disabled={importing}
                className="rounded-lg p-1.5 text-[#8c745f] hover:bg-[#faf4ea]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleChesscomImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#2d170e] mb-1">
                  Chess.com Username
                </label>
                <input
                  type="text"
                  value={chesscomUsername}
                  onChange={(e) => setChesscomUsername(e.target.value)}
                  placeholder="e.g. hikaru, magnuscarlsen"
                  required
                  disabled={importing}
                  className="w-full rounded-xl border border-[#e5d8c5] bg-[#faf6ee] px-3.5 py-2 text-xs font-sans text-[#2d170e] focus:border-[#845722] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2d170e] mb-1">
                  Max Games to Import
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setChesscomMaxGames(count)}
                      disabled={importing}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        chesscomMaxGames === count
                          ? 'border-[#845722] bg-[#845722] text-[#fffdfa]'
                          : 'border-[#e5d8c5] bg-[#faf6ee] text-[#6d503b] hover:bg-[#efe4d1]'
                      }`}
                    >
                      {count} games
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#8c745f] mt-1.5">
                  Bounded import with Stockfish depth 18 analysis (max 12 positions per game).
                </p>
              </div>

              {importError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChesscomModal(false)}
                  disabled={importing}
                  className="rounded-xl border border-[#e5d8c5] bg-[#fffdfa] hover:bg-[#faf4ea] px-4 py-2 text-xs font-bold text-[#6d503b]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="flex items-center gap-2 rounded-xl bg-[#361f14] hover:bg-[#23120b] text-[#fbf1dc] px-5 py-2 text-xs font-bold transition-all disabled:opacity-60"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing with Stockfish...</span>
                    </>
                  ) : (
                    <span>Import Games</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload / Paste PGN Modal */}
      {showPgnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-2xl font-serif space-y-4">
            <div className="flex items-center justify-between border-b border-[#e5d8c5]/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efe4d1] text-[#6d503b]">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2d170e]">Import PGN Games</h3>
                  <p className="text-[11px] text-[#6d503b]">Paste PGN string or upload a .pgn file</p>
                </div>
              </div>
              <button
                onClick={() => !importing && setShowPgnModal(false)}
                disabled={importing}
                className="rounded-lg p-1.5 text-[#8c745f] hover:bg-[#faf4ea]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePgnImport} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-[#2d170e]">
                    PGN Content
                  </label>
                  <label className="text-[11px] font-bold text-[#845722] hover:underline cursor-pointer">
                    Upload .pgn file
                    <input
                      type="file"
                      accept=".pgn,.txt"
                      onChange={handleFileUpload}
                      disabled={importing}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  value={pgnText}
                  onChange={(e) => setPgnText(e.target.value)}
                  placeholder={`[Event "Live Chess"]\n[White "player"]\n[Black "opponent"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 ...`}
                  rows={6}
                  required
                  disabled={importing}
                  className="w-full rounded-xl border border-[#e5d8c5] bg-[#faf6ee] p-3 text-xs font-mono text-[#2d170e] focus:border-[#845722] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2d170e] mb-1">
                  Max Games in File
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setPgnMaxGames(count)}
                      disabled={importing}
                      className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                        pgnMaxGames === count
                          ? 'border-[#845722] bg-[#845722] text-[#fffdfa]'
                          : 'border-[#e5d8c5] bg-[#faf6ee] text-[#6d503b] hover:bg-[#efe4d1]'
                      }`}
                    >
                      {count} games
                    </button>
                  ))}
                </div>
              </div>

              {importError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPgnModal(false)}
                  disabled={importing}
                  className="rounded-xl border border-[#e5d8c5] bg-[#fffdfa] hover:bg-[#faf4ea] px-4 py-2 text-xs font-bold text-[#6d503b]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="flex items-center gap-2 rounded-xl bg-[#361f14] hover:bg-[#23120b] text-[#fbf1dc] px-5 py-2 text-xs font-bold transition-all disabled:opacity-60"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing with Stockfish...</span>
                    </>
                  ) : (
                    <span>Import & Analyze PGN</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Game Detail / Key Moments Review Modal */}
      {selectedGameDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] shadow-2xl font-serif flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-[#e5d8c5] flex items-center justify-between bg-[#faf6ee]/70">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#efe4d1] text-[#6d503b]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2d170e]">
                    Game Analysis & Key Moments
                  </h3>
                  <p className="text-xs text-[#6d503b]">
                    {selectedGameDetail.source === 'chesscom' ? 'Chess.com Historical' : 'Imported PGN'} · {formatPlayedDate(selectedGameDetail.played_at)} · Result: {selectedGameDetail.result || '*'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedGameDetail(null)}
                className="rounded-lg p-2 text-[#8c745f] hover:bg-[#faf4ea]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Board Preview Column */}
              <div className="md:col-span-6 flex flex-col items-center">
                {selectedGameDetail.positions.length > 0 ? (
                  <div className="w-full max-w-[340px]">
                    <InteractiveChessboard
                      fen={selectedGameDetail.positions[selectedPositionIndex]?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                      playerColor="white"
                      disabled={true}
                      onMakeMove={() => {}}
                    />
                    <div className="mt-2 text-center text-xs font-semibold text-[#8c745f]">
                      Position at Move #{selectedGameDetail.positions[selectedPositionIndex]?.move_number}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-[#8c745f]">
                    No critical positions flagged for this game.
                  </div>
                )}
              </div>

              {/* Moments List & Engine Facts Column */}
              <div className="md:col-span-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#e5d8c5]/60 pb-2">
                  <span className="text-xs font-bold text-[#2d170e]">
                    Analyzed Decision Moments ({selectedGameDetail.positions.length})
                  </span>
                  <span className="text-[11px] text-[#845722] font-semibold">
                    Stockfish 18 depth
                  </span>
                </div>

                {selectedGameDetail.positions.length === 0 ? (
                  <p className="text-xs text-[#6d503b]">
                    No tactical mistakes or severe evaluation swings were observed in this game.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {selectedGameDetail.positions.map((pos, idx) => {
                      const isSelected = idx === selectedPositionIndex
                      const conceptLabel = CONCEPT_LABELS[pos.concept || ''] || pos.concept || 'Tactical Awareness'
                      const outcome = pos.engine?.outcome || 'missed'
                      const isRecognized = outcome === 'recognized'
                      const isPartial = outcome === 'partial'
                      const badgeClass = isRecognized
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : isPartial
                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                        : 'bg-rose-100 text-rose-800 border-rose-200'

                      return (
                        <div
                          key={pos.id}
                          onClick={() => setSelectedPositionIndex(idx)}
                          className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                            isSelected
                              ? 'border-[#845722] bg-[#faf4ea] shadow-sm ring-1 ring-[#845722]'
                              : 'border-[#e5d8c5] bg-[#fffdfa] hover:bg-[#faf6ee]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#2d170e]">
                                Move #{pos.move_number}
                              </span>
                              <span className="text-[11px] font-semibold text-[#6d503b] bg-[#efe4d1] px-2 py-0.5 rounded">
                                {conceptLabel}
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badgeClass}`}>
                              {outcome}
                            </span>
                          </div>

                          {/* Engine Facts */}
                          <div className="mt-2 text-xs text-[#6d503b] space-y-1">
                            {pos.engine?.best_move && (
                              <div>
                                <strong className="text-[#2d170e]">Best Move:</strong> {pos.engine.best_move}
                                {pos.engine?.played_move && ` (Played: ${pos.engine.played_move})`}
                              </div>
                            )}
                            {pos.engine?.cp_loss !== undefined && pos.engine.cp_loss > 0 && (
                              <div>
                                <strong className="text-[#2d170e]">Evaluation Loss:</strong> {pos.engine.cp_loss}cp
                              </div>
                            )}
                            <p className="text-[11px] text-[#8c745f] italic pt-1">
                              {pos.engine?.outcome === 'missed'
                                ? 'This position contained a missed tactical opportunity.'
                                : 'Player found a solid tactical continuation in this position.'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Epistemic note */}
                <div className="rounded-xl bg-[#faf6ee] p-3 text-[11px] text-[#6d503b] border border-[#e5d8c5]/70 flex items-start gap-2">
                  <Shield className="h-4 w-4 text-[#845722] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Epistemic Guarantee:</strong> Claims here represent what happened on board (engine truth). Cognitive hypotheses are only seeded from this data.
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#e5d8c5] flex justify-end bg-[#faf6ee]/40">
              <button
                onClick={() => setSelectedGameDetail(null)}
                className="rounded-xl bg-[#361f14] hover:bg-[#23120b] text-[#fbf1dc] px-5 py-2 text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}

export default function YourGamesPage() {
  return (
    <Suspense fallback={null}>
      <GamesContent />
    </Suspense>
  )
}
