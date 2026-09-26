'use client'

import React from 'react'
import { BoardSquare, PieceType, PieceColor } from '@/lib/landingExamples'

// Vector chess pieces sourced from the CBurnett vector set (Wikimedia Commons / Lichess)
export function ChessPiece({ type, color }: { type: PieceType; color: PieceColor }) {
  const fileName = `${color}${type.toUpperCase()}.svg`
  return (
    <img
      src={`/pieces/${fileName}`}
      alt={`${color === 'w' ? 'White' : 'Black'} ${type}`}
      className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.18)]"
      draggable={false}
    />
  )
}

interface ChessboardProps {
  position: (BoardSquare | null)[][]
  arrow?: { from: [number, number]; to: [number, number] } // [row, col] from 0 to 7
  showCoords?: boolean
  className?: string
}

export function ChessboardView({
  position,
  arrow,
  showCoords = true,
  className = '',
}: ChessboardProps) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

  return (
    <div className={`relative select-none inline-block ${className}`}>
      {/* Outer wood border casing with coordinate margins */}
      <div className="relative rounded-[6px] p-3 sm:p-3.5 bg-[#d4ab77] border border-[#b48853] shadow-[0_8px_20px_rgba(60,35,18,0.22)]">
        {/* Left rank labels */}
        {showCoords && (
          <div className="absolute left-1 top-3.5 bottom-7 flex flex-col justify-around text-[10px] sm:text-[11px] font-sans font-bold text-[#624128]/80 pointer-events-none select-none">
            {ranks.map((r) => (
              <span key={r} className="leading-none text-center w-2">
                {r}
              </span>
            ))}
          </div>
        )}

        {/* Board grid container */}
        <div className={`relative aspect-square border border-[#9b7145] ${showCoords ? 'ml-2.5 mr-1 mb-1' : ''}`}>
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {position.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const isDark = (rIdx + cIdx) % 2 === 1
                const isHighlighted = cell?.highlight

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`relative flex items-center justify-center aspect-square ${
                      isHighlighted
                        ? 'bg-[#82a950] ring-2 ring-[#4d7522] ring-inset'
                        : isDark
                        ? 'bg-[#ba8d5d]'
                        : 'bg-[#f4deb8]'
                    }`}
                  >
                    {/* Chess piece */}
                    {cell?.piece && (
                      <div className="w-[88%] h-[88%] flex items-center justify-center">
                        <ChessPiece type={cell.piece.type} color={cell.piece.color} />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* SVG Arrow Overlay */}
          {arrow && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-20"
              viewBox="0 0 800 800"
            >
              {(() => {
                const startX = arrow.from[1] * 100 + 50
                const startY = arrow.from[0] * 100 + 50
                const targetX = arrow.to[1] * 100 + 50
                const targetY = arrow.to[0] * 100 + 50

                const dx = targetX - startX
                const dy = targetY - startY
                const angle = Math.atan2(dy, dx)
                const length = Math.sqrt(dx * dx + dy * dy)

                // Proportions
                const headLength = 34
                const headWidth = 26
                const shaftWidth = 14

                return (
                  <g transform={`translate(${startX}, ${startY}) rotate(${(angle * 180) / Math.PI})`}>
                    {/* Shaft */}
                    <rect
                      x={10}
                      y={-shaftWidth / 2}
                      width={Math.max(0, length - headLength - 10)}
                      height={shaftWidth}
                      fill="#4a7c29"
                      opacity="0.85"
                    />
                    {/* Arrow Head */}
                    <polygon
                      points={`${length - headLength},${-headWidth / 2} ${length},0 ${length - headLength},${headWidth / 2}`}
                      fill="#4a7c29"
                      opacity="0.85"
                    />
                  </g>
                )
              })()}
            </svg>
          )}
        </div>

        {/* Bottom file labels */}
        {showCoords && (
          <div className="ml-2.5 mr-1 flex justify-around text-[10px] sm:text-[11px] font-sans font-bold text-[#624128]/80 pointer-events-none select-none pt-1">
            {files.map((f) => (
              <span key={f} className="leading-none text-center w-4">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
