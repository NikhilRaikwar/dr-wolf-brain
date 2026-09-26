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

  // Start fresh session or load existing
  const initializeSession = useCallback(async (savedSessionId?: string) => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      if (savedSessionId) {
        const res = await fetch(`/api/session/${savedSessionId}/position`)
        if (res.ok) {
          const data = await res.json()
          setSession({
            session_id: data.session_id,
            requested_engine_elo: 900,
            effective_engine_elo: null,
            engine_mode: 'custom_beginner',
            color: (data.player_color as 'white' | 'black') || 'white',
            fen: data.fen,
            moves_uci: data.moves_uci || [],
            ply_count: data.ply_count || 0,
            game_over: data.game_over || false,
            result: data.result || null,
          })

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

      // Start new session
      const startRes = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!startRes.ok) {
        throw new Error(`Failed to start session: ${startRes.statusText}`)
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
      console.error(err)
      setErrorMsg(err.message || 'Could not connect to session server.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlSessionId = params.get('session_id')
    const storedSessionId = localStorage.getItem('dr_wolf_session_id')
    const sessionIdToLoad = urlSessionId || storedSessionId || undefined

    initializeSession(sessionIdToLoad)
  }, [initializeSession])

  const handleMakeMove = async (moveUci: string) => {
    if (!session || session.game_over || isThinking) return

    setIsThinking(true)
    setErrorMsg(null)

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

  const handleNewGame = () => {
    localStorage.removeItem('dr_wolf_session_id')
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
              href="/"
              className="inline-flex items-center gap-1.5 font-serif-custom text-[15px] font-semibold text-[#654329] hover:text-[#2d170e] transition-colors"
            >
              <ArrowLeft size={17} />
              <span>Landing</span>
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
          <div className="max-w-md mx-auto parchment-card p-6 text-center">
            <AlertCircle size={36} className="text-[#9b3822] mx-auto mb-3" />
            <h2 className="font-serif-custom text-xl font-bold text-[#2d170e] mb-2">
              Connection Issue
            </h2>
            <p className="font-serif-custom text-sm text-[#634533] mb-5">{errorMsg}</p>
            <button
              onClick={() => initializeSession()}
              className="bg-[#381f14] text-[#fbf1dc] px-6 py-2.5 rounded-[6px] font-serif-custom font-bold"
            >
              Retry Connection
            </button>
          </div>
        ) : (
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
                disabled={session?.game_over}
                lastMove={lastMove}
                onMakeMove={handleMakeMove}
              />

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
        )}
      </div>
    </main>
  )
}
