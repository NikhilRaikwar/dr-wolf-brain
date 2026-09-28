import React from 'react'
import { Target, Info } from 'lucide-react'
import { ChessboardView } from '../Chessboard'
import { fenToBoardGrid } from '@/lib/landingExamples'

interface BoardPreview {
  fen: string
  source_label?: string
  caption?: string
  episode_id?: string
  arrow?: { from: [number, number]; to: [number, number] }
}

interface CurrentFocusCardProps {
  concept?: string | null
  label?: string | null
  rationale?: string | null
  stage?: string | null
  stageNumber?: number
  boardPreview?: BoardPreview | null
  className?: string
}

export function CurrentFocusCard({
  label = 'Needs more evidence',
  rationale = 'Play a Think First session or import games to generate initial observations.',
  stageNumber,
  boardPreview,
  className = '',
}: CurrentFocusCardProps) {

  const steps = [
    { num: 1, label: 'Understand' },
    { num: 2, label: 'Recognize' },
    { num: 3, label: 'Apply' },
    { num: 4, label: 'Transfer' },
    { num: 5, label: 'Verify' },
  ]

  return (
    <div
      className={`rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] ${className}`}
    >
      {/* Top Card Title & Info */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2.5">
          <Target className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
          <h2 className="font-serif text-lg font-bold text-[#2d170e]">
            Current Focus
          </h2>
        </div>
        <button
          type="button"
          className="text-[#9b8370] hover:text-[#2d170e] transition-colors"
          title="Determined deterministically by your latest session Dream Cycle consolidation"
          aria-label="Focus card information"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Grid: Left Description & Stepper, Right Chessboard */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:gap-8 items-center">
        {/* Left Side */}
        <div className="space-y-6 md:col-span-7">
          <div className="space-y-2">
            <h3 className="font-serif text-2xl sm:text-[26px] font-bold tracking-tight text-[#2d170e]">
              {label}
            </h3>
            <p className="font-serif text-sm sm:text-[15px] text-[#6d503b] leading-relaxed max-w-md">
              {rationale}
            </p>
          </div>

          {/* Stepper matching reference image */}
          <div className="pt-2">
            <div className="relative flex items-center justify-between max-w-sm">
              {/* Connecting line */}
              <div className="absolute left-3 right-3 top-3.5 h-[1.5px] bg-[#e5d8c5] -translate-y-1/2 z-0" />

              {steps.map((step) => {
                const isActive = step.num === stageNumber
                return (
                  <div
                    key={step.num}
                    className="relative z-10 flex flex-col items-center group cursor-default"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#b3782b] text-[#ffffff] shadow-sm ring-2 ring-[#b3782b]/30'
                          : 'bg-[#faf2e4] text-[#8c745f] border border-[#dec8af]'
                      }`}
                    >
                      {step.num}
                    </div>
                    <span
                      className={`mt-2 font-serif text-[11px] sm:text-xs ${
                        isActive
                          ? 'font-bold text-[#2d170e]'
                          : 'text-[#8c745f]'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Chessboard Preview or Clean Empty State */}
        <div className="flex flex-col items-center justify-center md:col-span-5">
          {boardPreview?.fen ? (
            <>
              <div className="w-full max-w-[210px] aspect-square rounded-[6px] overflow-hidden shadow-xs border border-[#e5d8c5]">
                <ChessboardView
                  position={fenToBoardGrid(boardPreview.fen)}
                  arrow={boardPreview.arrow}
                  showCoords={false}
                  className="w-full h-full"
                />
              </div>
              {boardPreview.source_label && (
                <div className="mt-2 text-left w-full max-w-[210px] font-serif">
                  <p className="text-[11px] font-semibold text-[#2d170e] leading-tight">
                    {boardPreview.source_label}
                  </p>
                  {boardPreview.caption && (
                    <p className="text-[10px] text-[#8c745f] italic leading-tight">
                      {boardPreview.caption}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="w-full max-w-[210px] min-h-[170px] rounded-xl border border-dashed border-[#dec8af] bg-[#faf6ee]/70 p-4 flex flex-col items-center justify-center text-center">
              <Target className="h-6 w-6 text-[#9b8370] mb-2 opacity-80" />
              <p className="font-serif text-xs font-semibold text-[#5e402e]">
                No position recorded
              </p>
              <p className="font-serif text-[11px] text-[#8c745f] mt-1 leading-snug">
                Play a Think First session to generate focus positions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
