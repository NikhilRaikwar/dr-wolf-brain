import React from 'react'
import { Lightbulb, FileText, Info } from 'lucide-react'
import { ChessboardView } from '../Chessboard'
import { fenToBoardGrid } from '@/lib/landingExamples'

interface WhyAskedCardProps {
  narrative?: string | null
  evidenceList?: string[]
  sourceLabel?: string | null
  thumbnailFen?: string | null
  className?: string
}

export function WhyAskedCard({
  narrative,
  evidenceList = [],
  sourceLabel,
  thumbnailFen,
  className = '',
}: WhyAskedCardProps) {
  const displayNarrative =
    narrative ||
    'As you play games and answer Think First questions, Dr. Wolf will explain the tactical rationale behind specific coaching interruptions here.'

  return (
    <div
      className={`rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
          <h2 className="font-serif text-lg font-bold text-[#2d170e]">
            Why did you ask me that?
          </h2>
        </div>
        <button
          type="button"
          className="text-[#9b8370] hover:text-[#2d170e] transition-colors"
          title="Questions are triggered by critical tactical and strategic pivot moments in your game"
          aria-label="Why did you ask me that info"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Explanation Quote */}
      <p className="font-serif text-[13.5px] text-[#6d503b] leading-relaxed">
        {displayNarrative}
      </p>

      {/* Lower Split: Evidence List & Board Thumbnail */}
      <div className="mt-5 flex items-end justify-between gap-4 pt-1">
        {/* Evidence Used List */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#2d170e]">
            <FileText className="h-4 w-4 text-[#6d503b]" />
            <span>Evidence used</span>
          </div>
          {evidenceList && evidenceList.length > 0 ? (
            <ul className="space-y-1 pl-6 text-xs text-[#6d503b] font-serif list-disc">
              {evidenceList.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#8c745f] italic pl-6">
              No prior episodes cited yet.
            </p>
          )}
        </div>

        {/* Thumbnail Preview */}
        {thumbnailFen && (
          <div className="flex flex-col items-center">
            <div className="w-[110px] aspect-square rounded-[5px] overflow-hidden border border-[#dec8af] shadow-xs">
              <ChessboardView
                position={fenToBoardGrid(thumbnailFen)}
                showCoords={false}
                className="w-full h-full"
              />
            </div>
            {sourceLabel && (
              <span className="mt-1 font-serif text-[10px] text-[#8c745f] italic">
                {sourceLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
