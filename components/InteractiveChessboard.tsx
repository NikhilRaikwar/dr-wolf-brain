'use client'

import React, { useState, useEffect } from 'react'
import { Chess, Square, Move } from 'chess.js'
import { ChessPiece } from '@/components/Chessboard'
import { PieceType, PieceColor } from '@/lib/landingExamples'

interface InteractiveChessboardProps {
  fen: string
  playerColor?: 'white' | 'black'
  isThinking?: boolean
  disabled?: boolean
  lastMove?: { from: string; to: string } | null
  onMakeMove: (moveUci: string) => void
  className?: string
}

export function InteractiveChessboard({
  fen,
  playerColor = 'white',
  isThinking = false,
  disabled = false,
  lastMove = null,
  onMakeMove,
  className = '',
}: InteractiveChessboardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalTargetSquares, setLegalTargetSquares] = useState<Square[]>([])

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

  // Deselect on FEN change
  useEffect(() => {
    setSelectedSquare(null)
    setLegalTargetSquares([])
  }, [fen])

  let chess: Chess
  try {
    chess = new Chess(fen)
  } catch {
    chess = new Chess()
  }

  const isPlayerTurn =
    (playerColor === 'white' && chess.turn() === 'w') ||
    (playerColor === 'black' && chess.turn() === 'b')

  const canInteract = !disabled && !isThinking && isPlayerTurn && !chess.isGameOver()

  const handleSquareClick = (square: Square) => {
    if (!canInteract) return

    const pieceOnSquare = chess.get(square)
    const isOwnPiece =
      pieceOnSquare &&
      ((playerColor === 'white' && pieceOnSquare.color === 'w') ||
        (playerColor === 'black' && pieceOnSquare.color === 'b'))

    // 1. If a square was already selected and clicking on a legal target square:
    if (selectedSquare && legalTargetSquares.includes(square)) {
      // Check for promotion (default to Queen for simplicity)
      const piece = chess.get(selectedSquare)
      const isPawn = piece && piece.type === 'p'
      const isPromotion =
        isPawn &&
        ((playerColor === 'white' && square.endsWith('8')) ||
          (playerColor === 'black' && square.endsWith('1')))

      const moveUci = `${selectedSquare}${square}${isPromotion ? 'q' : ''}`
      setSelectedSquare(null)
      setLegalTargetSquares([])
      onMakeMove(moveUci)
      return
    }

    // 2. If clicking on own piece, select it and find legal moves
    if (isOwnPiece) {
      setSelectedSquare(square)
      const moves = chess.moves({ square, verbose: true }) as Move[]
      setLegalTargetSquares(moves.map((m) => m.to as Square))
      return
    }

    // 3. Otherwise deselect
    setSelectedSquare(null)
    setLegalTargetSquares([])
  }

  const board = chess.board()

  return (
    <div className={`relative select-none inline-block ${className}`}>
      {/* Outer wood border casing with coordinate margins */}
      <div className="relative rounded-[8px] p-3.5 sm:p-4 bg-[#d4ab77] border border-[#b48853] shadow-[0_12px_28px_rgba(60,35,18,0.24)]">
        {/* Left rank labels */}
        <div className="absolute left-1.5 top-4 bottom-8 flex flex-col justify-around text-[10px] sm:text-[11px] font-sans font-bold text-[#624128]/80 pointer-events-none select-none">
          {ranks.map((r) => (
            <span key={r} className="leading-none text-center w-2">
              {r}
            </span>
          ))}
        </div>

        {/* Board grid container */}
        <div className="relative aspect-square border border-[#9b7145] ml-3 mr-1 mb-1 max-w-[480px] sm:max-w-[540px] w-[300px] sm:w-[420px] md:w-[480px]">
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const square = `${files[cIdx]}${ranks[rIdx]}` as Square
                const isDark = (rIdx + cIdx) % 2 === 1
                const isSelected = selectedSquare === square
                const isLegalTarget = legalTargetSquares.includes(square)
                const isLastMoveFrom = lastMove?.from === square
                const isLastMoveTo = lastMove?.to === square

                let bgClass = isDark ? 'bg-[#ba8d5d]' : 'bg-[#f4deb8]'
                if (isSelected) {
                  bgClass = 'bg-[#e2aa4d] ring-2 ring-[#9d6318] ring-inset'
                } else if (isLastMoveFrom || isLastMoveTo) {
                  bgClass = isDark ? 'bg-[#98a86c]' : 'bg-[#ceddb0]'
                }

                return (
                  <button
                    key={square}
                    type="button"
                    onClick={() => handleSquareClick(square)}
                    disabled={!canInteract}
                    className={`relative flex items-center justify-center aspect-square transition-colors p-0 cursor-pointer disabled:cursor-default ${bgClass}`}
                    aria-label={`Square ${square}`}
                  >
                    {/* Chess piece */}
                    {cell && (
                      <div className="w-[88%] h-[88%] flex items-center justify-center pointer-events-none">
                        <ChessPiece
                          type={cell.type as PieceType}
                          color={cell.color as PieceColor}
                        />
                      </div>
                    )}

                    {/* Legal Target Move Dot / Ring */}
                    {isLegalTarget && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {cell ? (
                          <div className="w-[84%] h-[84%] rounded-full border-[3.5px] border-[#385f1c]/70" />
                        ) : (
                          <div className="w-[28%] h-[28%] rounded-full bg-[#385f1c]/50" />
                        )}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Bottom file labels */}
        <div className="ml-3 mr-1 flex justify-around text-[10px] sm:text-[11px] font-sans font-bold text-[#624128]/80 pointer-events-none select-none pt-1">
          {files.map((f) => (
            <span key={f} className="leading-none text-center w-4">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
