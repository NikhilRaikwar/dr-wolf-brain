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
  label = 'Opponent Threat Detection',
  rationale = 'You often miss your opponent\'s counterplay after spotting your own attacking idea.',
  stageNumber = 2,
  boardPreview,
  className = '',
}: CurrentFocusCardProps) {
  const defaultFen =
    boardPreview?.fen || 'r2q1rk1/pp1b1ppp/2n1pn2/2bp4/2P5/2N2NP1/PP2PPBP/R1BQ1RK1 w - - 0 9'
  const defaultArrow = boardPreview?.arrow || { from: [5, 3], to: [3, 5] }

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

        {/* Right Side: Chessboard Preview */}
        <div className="flex flex-col items-center justify-center md:col-span-5">
          <div className="w-full max-w-[210px] aspect-square rounded-[6px] overflow-hidden shadow-xs border border-[#e5d8c5]">
            <ChessboardView
              position={fenToBoardGrid(defaultFen)}
              arrow={defaultArrow}
              showCoords={false}
              className="w-full h-full"
            />
          </div>
          {boardPreview?.source_label && (
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
        </div>
      </div>
    </div>
  )
}
