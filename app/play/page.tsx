'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  RotateCcw,
  Sparkles,
  Shield,
  Clock,
  ArrowLeft,
  Swords,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { InteractiveChessboard } from '@/components/InteractiveChessboard'
import { SocraticModal, InterruptionData } from '@/components/SocraticModal'
import { Chess } from 'chess.js'

interface SessionState {
  session_id: string
  requested_engine_elo: number
  effective_engine_elo: number | null
  engine_mode: string
  color: 'white' | 'black'
  fen: string
  moves_uci: string[]
  ply_count: number
  game_over: boolean
  result: string | null
}

export default function PlayPage() {
  const [session, setSession] = useState<SessionState | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isThinking, setIsThinking] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [activeInterruption, setActiveInterruption] = useState<InterruptionData | null>(null)
  const [justAnsweredPrompt, setJustAnsweredPrompt] = useState<boolean>(false)

  // Start fresh session or load existing
  const initializeSession = useCallback(async (savedSessionId?: string) => {
    setIsLoading(true)
    setErrorMsg(null)
    setActiveInterruption(null)
    try {
      if (savedSessionId) {
        const res = await fetch(`/api/session/${savedSessionId}/position`)
        if (res.ok) {
          const data = await res.json()
          setSession({
            session_id: data.session_id,
            requested_engine_elo: 900,
            effective_engine_elo: null,
            engine_mode: 'uci_elo',
            color: (data.player_color as 'white' | 'black') || 'white',
            fen: data.fen,
            moves_uci: data.moves_uci || [],
            ply_count: data.ply_count || 0,
            game_over: data.game_over || false,
            result: data.result || null,
          })

          if (data.interruption) {
            setActiveInterruption(data.interruption)
          }

          if (data.moves_uci && data.moves_uci.length > 0) {
            const last = data.moves_uci[data.moves_uci.length - 1]
            if (last.length >= 4) {
              setLastMove({ from: last.substring(0, 2), to: last.substring(2, 4) })
            }
          }
          setIsLoading(false)
          return
        }
      }

      // Start new live session on backend with real player_id
      const storedPlayerId = typeof window !== 'undefined' ? localStorage.getItem('dr_wolf_player_id') : null
      const startRes = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storedPlayerId ? { player_id: storedPlayerId } : {}),
      })

      if (!startRes.ok) {
        setSession(null)
        setErrorMsg(`Failed to start session: Backend returned HTTP ${startRes.status} (${startRes.statusText})`)
        setIsLoading(false)
        return
      }

      const startData = await startRes.json()
      setSession({
        session_id: startData.session_id,
        requested_engine_elo: startData.requested_engine_elo,
        effective_engine_elo: startData.effective_engine_elo,
        engine_mode: startData.engine_mode,
        color: startData.color || 'white',
        fen: startData.fen,
        moves_uci: [],
        ply_count: 0,
        game_over: false,
        result: null,
      })
      setLastMove(null)
      localStorage.setItem('dr_wolf_session_id', startData.session_id)
      window.history.replaceState(null, '', `/play?session_id=${startData.session_id}`)
    } catch (err: any) {
      setSession(null)
      setErrorMsg(err?.message || 'Could not connect to backend chess server at /api/session/start')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlSessionId = params.get('session_id')
    const storedSessionId = typeof window !== 'undefined' ? localStorage.getItem('dr_wolf_session_id') : null
    const sessionIdToLoad = urlSessionId || storedSessionId || undefined

    initializeSession(sessionIdToLoad)
  }, [initializeSession])

  const handleMakeMove = async (moveUci: string) => {
    if (!session || session.game_over || isThinking || activeInterruption) return

    setIsThinking(true)
    setErrorMsg(null)
    setJustAnsweredPrompt(false)

    // Parse player move from/to for visual feedback
    const pFrom = moveUci.substring(0, 2)
    const pTo = moveUci.substring(2, 4)
    setLastMove({ from: pFrom, to: pTo })

    try {
      const res = await fetch(`/api/session/${session.session_id}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ move_uci: moveUci }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Server rejected move: ${res.statusText}`)
      }

      const moveData = await res.json()

      // Update moves and last move highlight (highlighting engine move if made)
      const updatedMoves = [...session.moves_uci, moveData.player_move]
      if (moveData.engine_move) {
        updatedMoves.push(moveData.engine_move)
        const eFrom = moveData.engine_move.substring(0, 2)
        const eTo = moveData.engine_move.substring(2, 4)
        setLastMove({ from: eFrom, to: eTo })
      }

      setSession((prev) =>
        prev
          ? {
              ...prev,
              fen: moveData.fen,
              moves_uci: updatedMoves,
              ply_count: updatedMoves.length,
              game_over: moveData.game_over,
              result: moveData.result,
            }
          : null
      )

      // Handle server-authoritative Think First interruption
      if (moveData.interruption) {
        setActiveInterruption(moveData.interruption)
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error executing move')
      // Refresh current position to ensure client is in sync with server truth
      if (session) {
        initializeSession(session.session_id)
      }
    } finally {
      setIsThinking(false)
    }
  }

  const handleInterruptionAnswered = () => {
    setActiveInterruption(null)
    setJustAnsweredPrompt(true)
  }

  const [summaryData, setSummaryData] = useState<any | null>(null)
  const [isFinishing, setIsFinishing] = useState<boolean>(false)

  const handleFinishSession = async () => {
    if (!session || isFinishing) return
    setIsFinishing(true)
    setErrorMsg(null)

    try {
      // 1. Explicitly finish session on server (sets status="completed" and ended_at)
      const finishRes = await fetch(`/api/session/${session.session_id}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!finishRes.ok) {
        throw new Error(`Failed to finish session: HTTP ${finishRes.status}`)
      }

      // 2. Fetch real session summary (server grades all committed episodes on completed session)
      const summaryRes = await fetch(`/api/session/${session.session_id}/summary`)
      if (!summaryRes.ok) {
        throw new Error(`Failed to grade session: HTTP ${summaryRes.status}`)
      }
      const summary = await summaryRes.json()

      // 3. Trigger Dream Cycle belief consolidation
      try {
        await fetch('/api/dream-cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: session.session_id }),
        })
      } catch (dcErr) {
        console.warn('Dream cycle notification:', dcErr)
      }

      setSession((prev) => (prev ? { ...prev, game_over: true } : null))
      setSummaryData(summary)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error finishing session')
    } finally {
      setIsFinishing(false)
    }
  }

  const handleNewGame = () => {
    localStorage.removeItem('dr_wolf_session_id')
    setSummaryData(null)
    initializeSession()
  }

  // Format move pairs for notation table
  const formattedMoves: { moveNumber: number; white: string; black?: string }[] = []
  if (session && session.moves_uci) {
    try {
      const replayChess = new Chess()
      for (let i = 0; i < session.moves_uci.length; i += 2) {
        const whiteUci = session.moves_uci[i]
        const blackUci = session.moves_uci[i + 1]

        let whiteSan = whiteUci
        let blackSan = blackUci

        try {
          const wMove = replayChess.move({
            from: whiteUci.substring(0, 2),
            to: whiteUci.substring(2, 4),
            promotion: whiteUci.length > 4 ? whiteUci[4] : undefined,
          })
          if (wMove) whiteSan = wMove.san

          if (blackUci) {
            const bMove = replayChess.move({
              from: blackUci.substring(0, 2),
              to: blackUci.substring(2, 4),
              promotion: blackUci.length > 4 ? blackUci[4] : undefined,
            })
            if (bMove) blackSan = bMove.san
          }
        } catch {
          // fallback to UCI
        }

        formattedMoves.push({
          moveNumber: Math.floor(i / 2) + 1,
          white: whiteSan,
          black: blackSan,
        })
      }
    } catch {
      // fallback
    }
  }

  const engineLabel =
    session?.engine_mode === 'uci_elo' && session.effective_engine_elo
      ? `Stockfish (${session.effective_engine_elo} Elo)`
      : 'Training Engine'

  return (
    <main className="min-h-screen bg-[#f6eedb] text-[#361d14] flex flex-col">
      {/* 1. Header Bar */}
      <header className="sticky top-0 z-40 bg-[#f6eedb]/95 backdrop-blur-md border-b border-[#d8c09a] shadow-sm">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/overview"
              className="inline-flex items-center gap-1.5 font-serif-custom text-[15px] font-semibold text-[#654329] hover:text-[#2d170e] transition-colors"
            >
              <ArrowLeft size={17} />
              <span>Brain Dashboard</span>
            </Link>
            <span className="text-[#d8c09a]">|</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl leading-none select-none">♞</span>
              <span className="font-serif-custom text-xl font-bold text-[#2d170e]">
                Dr. Wolf Brain
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {session && (session.ply_count > 0 || session.game_over) && (
              <button
                type="button"
                onClick={handleFinishSession}
                disabled={isFinishing}
                className="inline-flex items-center gap-2 bg-[#361f14] hover:bg-[#23120b] text-[#fbf1dc] px-4 py-2 rounded-[6px] font-serif-custom text-[14px] font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <span>{isFinishing ? 'Grading...' : 'Finish & Grade'}</span>
              </button>
            )}
            <button
              onClick={handleNewGame}
              className="inline-flex items-center gap-2 bg-[#ecd4ab] hover:bg-[#e4c99c] border border-[#bfa075] text-[#381f14] px-4 py-2 rounded-[6px] font-serif-custom text-[14px] font-bold shadow-sm transition-all active:scale-[0.98]"
            >
              <RotateCcw size={15} />
              <span>New Game</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Play Stage */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-[#c8934f] border-t-transparent animate-spin mb-4" />
            <p className="font-serif-custom text-lg text-[#5c3e27] font-semibold">
              Setting up the board with Dr. Wolf...
            </p>
          </div>
        ) : errorMsg && !session ? (
          <div className="max-w-md mx-auto parchment-card p-6 text-center rounded-2xl border border-[#dec8af] bg-[#fffdfa] shadow-lg">
            <AlertCircle size={36} className="text-[#9b3822] mx-auto mb-3" />
            <h2 className="font-serif-custom text-xl font-bold text-[#2d170e] mb-2">
              Backend Server Unavailable
            </h2>
            <p className="font-serif-custom text-xs text-[#735843] mb-5 leading-relaxed">{errorMsg}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => initializeSession()}
                className="w-full sm:w-auto bg-[#381f14] hover:bg-[#23120b] text-[#fbf1dc] px-5 py-2.5 rounded-xl font-serif-custom text-xs font-bold transition-all"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left: Interactive Chess Board */}
              <div className="lg:col-span-7 flex flex-col items-center">
              {/* Opponent Badge Header */}
              <div className="w-full max-w-[480px] sm:max-w-[540px] mb-3 flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[5px] overflow-hidden border border-[#c49e6f] relative shadow-sm">
                    <Image
                      src="/dr_wolf_portrait.jpg"
                      alt="Dr. Wolf"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif-custom font-bold text-[15px] text-[#2d170e]">
                        Dr. Wolf
                      </span>
                      <span className="text-[11px] font-sans-custom uppercase px-2 py-0.5 rounded-full bg-[#faebd4] border border-[#d8be96] text-[#785233] font-semibold">
                        {engineLabel}
                      </span>
                    </div>
                    <p className="text-[12px] font-serif-custom text-[#785233]">
                      {isThinking ? (
                        <span className="text-[#b3782b] font-medium flex items-center gap-1.5 animate-pulse">
                          <Clock size={12} />
                          Thinking...
                        </span>
                      ) : session?.game_over ? (
                        <span className="text-[#528236] font-semibold">Game completed</span>
                      ) : (
                        'Your turn (White)'
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#785233] font-serif-custom">
                  <Shield size={14} className="text-[#528236]" />
                  <span>Server-authoritative</span>
                </div>
              </div>

              {/* Main Board Component */}
              <InteractiveChessboard
                fen={session?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                playerColor="white"
                isThinking={isThinking}
                disabled={session?.game_over || activeInterruption !== null}
                lastMove={lastMove}
                onMakeMove={handleMakeMove}
              />

              {/* Just Answered Notification Banner */}
              {justAnsweredPrompt && (
                <div className="mt-3 max-w-[480px] w-full bg-[#EBF5DF] border border-[#BBDC96] text-[#2D5A1E] px-4 py-3 rounded-xl text-xs font-serif-custom flex items-center gap-2.5 shadow-sm animate-in fade-in">
                  <CheckCircle2 size={16} className="text-[#4E8D2E] shrink-0" />
                  <div>
                    <strong className="block font-bold">Thinking Recorded</strong>
                    <span>Now execute your move on the board to commit your action.</span>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMsg && (
                <div className="mt-3 max-w-[480px] w-full bg-[#fde8e4] border border-[#e8a396] text-[#8b2b18] px-3.5 py-2 rounded-[6px] text-xs font-serif-custom flex items-center gap-2">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Right: Coach Dialogue & Game Notation */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              {/* Coach Dialogue Card */}
              <div className="parchment-window p-4 bg-[#ecd4ab] border border-[#bfa075] rounded-[10px] shadow-[0_12px_24px_rgba(65,36,18,0.16)]">
                <div className="flex items-center justify-between pb-3 border-b border-[#cca97f] mb-3">
                  <span className="font-serif-custom text-[14px] font-bold text-[#452718]">
                    Coach Dialogue
                  </span>
                  <span className="text-[11px] font-sans-custom uppercase tracking-wider font-semibold text-[#8b6343]">
                    Think First
                  </span>
                </div>

                <div className="bg-[#fbf4e6] border border-[#d8be96] rounded-[7px] p-3.5 flex items-start gap-3 shadow-sm">
                  <div className="w-11 h-11 rounded-[5px] overflow-hidden border border-[#c49e6f] flex-shrink-0 relative">
                    <Image
                      src="/dr_wolf_portrait.jpg"
                      alt="Dr. Wolf"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                      Dr. Wolf
                    </strong>
                    <p className="font-serif-custom text-[13px] text-[#4d3222] leading-snug mt-0.5">
                      {isThinking ? (
                        'Analyzing the position and choosing my reply...'
                      ) : activeInterruption ? (
                        'Pause for a moment. Look at the Socratic question and reflect before moving.'
                      ) : justAnsweredPrompt ? (
                        'Good reflection. Now make your move on the board.'
                      ) : session?.game_over ? (
                        session.result === '1-0' ? (
                          'Well played! Checkmate — you won this game.'
                        ) : session.result === '0-1' ? (
                          'Checkmate. A great learning game.'
                        ) : (
                          'The game concluded in a draw.'
                        )
                      ) : session?.ply_count === 0 ? (
                        'Make your opening move. Take your time to consider pawn structure and piece activity.'
                      ) : (
                        'Your move. Consider your opponent&apos;s threats and develop your pieces actively.'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Game Notation & Status Panel */}
              <div className="parchment-window p-4 bg-[#ecd4ab] border border-[#bfa075] rounded-[10px] shadow-[0_12px_24px_rgba(65,36,18,0.16)] flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-[#cca97f] mb-3">
                  <div className="flex items-center gap-2">
                    <Swords size={16} className="text-[#785233]" />
                    <span className="font-serif-custom text-[14px] font-bold text-[#452718]">
                      Move History
                    </span>
                  </div>
                  <span className="text-[12px] font-serif-custom text-[#785233]">
                    {session?.ply_count || 0} plies
                  </span>
                </div>

                {/* Move List Scroll Area */}
                <div className="bg-[#fbf4e6] border border-[#d8be96] rounded-[7px] p-3 flex-1 min-h-[180px] max-h-[260px] overflow-y-auto">
                  {formattedMoves.length === 0 ? (
                    <p className="font-serif-custom text-xs text-[#8c6d54] italic text-center py-10">
                      No moves played yet. White to open.
                    </p>
                  ) : (
                    <table className="w-full text-left font-serif-custom text-[13px]">
                      <thead>
                        <tr className="border-b border-[#dfc7a4] text-[#8c6d54] text-[11px] font-sans-custom uppercase">
                          <th className="pb-1 w-12">#</th>
                          <th className="pb-1 w-28">White</th>
                          <th className="pb-1">Black</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formattedMoves.map((m) => (
                          <tr
                            key={m.moveNumber}
                            className="border-b border-[#ebd7be]/60 hover:bg-[#f6ebd7]/60"
                          >
                            <td className="py-1 text-[#8c6d54] font-medium">{m.moveNumber}.</td>
                            <td className="py-1 font-semibold text-[#2d170e]">{m.white}</td>
                            <td className="py-1 font-semibold text-[#4d3222]">{m.black || '...'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Game Outcome / Status Footer */}
                {session?.game_over && (
                  <div className="mt-3 bg-[#e8f1dd] border border-[#b4d498] rounded-[6px] p-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#3b661e] font-serif-custom font-bold text-[14px]">
                      <CheckCircle2 size={16} />
                      <span>Game Over · {session.result}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* Socratic Interruption Modal */}
      {activeInterruption && session && (
        <SocraticModal
          sessionId={session.session_id}
          fen={session.fen}
          interruption={activeInterruption}
          onAnswered={handleInterruptionAnswered}
        />
      )}

      {/* Real Graded Session Summary & Dream Cycle Result Modal */}
      {summaryData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#dec8af] bg-[#fffdfa] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-1.5 pt-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4e8d3] text-2xl shadow-xs">
                ♟
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#2d170e]">
                Session Summary & Brain Graded
              </h2>
              <p className="font-serif text-xs text-[#735843]">
                Dr. Wolf has evaluated your reasoning against Stockfish truth and consolidated your learner model.
              </p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-3 font-serif text-xs">
              <div className="rounded-xl border border-[#dec8af] bg-[#faf5ec] p-3 text-center">
                <span className="text-[11px] text-[#8c745f] block">Total Moves</span>
                <span className="text-lg font-bold text-[#2d170e]">{summaryData.total_moves || session?.moves_uci?.length || 0}</span>
              </div>
              <div className="rounded-xl border border-[#dec8af] bg-[#faf5ec] p-3 text-center">
                <span className="text-[11px] text-[#8c745f] block">Episodes Graded</span>
                <span className="text-lg font-bold text-[#2d170e]">{summaryData.episodes_graded?.length || 0}</span>
              </div>
            </div>

            {/* Graded Episodes List */}
            {summaryData.episodes_graded && summaryData.episodes_graded.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <span className="block text-[11px] font-bold text-[#2d170e]">Graded Moments:</span>
                {summaryData.episodes_graded.map((ep: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-[#ede2d2] bg-[#fffdfa] p-3 font-serif text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#2d170e] block">Move {ep.move_number}</span>
                      <span className="text-[11px] text-[#735843]">
                        {ep.trigger_type ? ep.trigger_type.replace(/_/g, ' ') : 'Tactical Pivot'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        ep.reasoning_outcome === 'recognized'
                          ? 'bg-[#e8f1e9] text-[#3b6348]'
                          : ep.reasoning_outcome === 'partial'
                          ? 'bg-[#fdf3e7] text-[#9b581e]'
                          : 'bg-[#fceeed] text-[#9c2f24]'
                      }`}>
                        Reasoning: {ep.reasoning_outcome}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-serif text-xs text-[#8c745f] italic text-center py-2">
                No Think First interruptions occurred this game (triggers fire after move 8 on critical tactical pivots).
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleNewGame}
                className="w-full sm:w-1/2 rounded-xl border border-[#dec8af] bg-[#fffdfa] hover:bg-[#faf5ec] py-2.5 text-xs font-serif font-semibold text-[#5e402e] transition-all"
              >
                Play Another Game
              </button>
              <Link
                href="/overview"
                className="w-full sm:w-1/2 rounded-xl bg-[#361f14] hover:bg-[#23120b] py-2.5 text-xs font-serif font-bold text-[#fbf1dc] text-center shadow-sm transition-all"
              >
                View Your Brain Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
