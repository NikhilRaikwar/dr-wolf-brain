'use client'

import React, { useState, useMemo } from 'react'
import Image from 'next/image'
import { Chess, Square } from 'chess.js'
import { Sparkles, Brain, ArrowRight, ShieldAlert, Check, MousePointerClick, X } from 'lucide-react'
import { ChessPiece } from '@/components/Chessboard'
import { PieceType, PieceColor } from '@/lib/landingExamples'

export interface SocraticOption {
  key: string
  label: string
}

export interface InterruptionData {
  episode_id: string
  trigger_type: string
  question: string
  options: SocraticOption[]
}

interface SocraticModalProps {
  sessionId: string
  fen: string
  interruption: InterruptionData
  onAnswered: () => void
}

export function SocraticModal({
  sessionId,
  fen,
  interruption,
  onAnswered,
}: SocraticModalProps) {
  const [selectedChoice, setSelectedChoice] = useState<string>('')
  const [freeText, setFreeText] = useState<string>('')
  const [squaresHighlighted, setSquaresHighlighted] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']

  const boardMatrix = useMemo(() => {
    try {
      const chess = new Chess(fen)
      return chess.board()
    } catch {
      return new Chess().board()
    }
  }, [fen])

  const toggleSquare = (sq: string) => {
    setSquaresHighlighted((prev) =>
      prev.includes(sq) ? prev.filter((s) => s !== sq) : [...prev, sq]
    )
  }

  const handleClearSquares = () => {
    setSquaresHighlighted([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChoice) {
      setError('Please select one of the options below.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Demo session isolation: Never send demo-isolated-session to server
    if (sessionId === 'demo-isolated-session' || sessionId.startsWith('demo-')) {
      setTimeout(() => {
        setIsSubmitting(false)
        onAnswered()
      }, 100)
      return
    }

    try {
      const res = await fetch(
        `/api/session/${sessionId}/interrupt/${interruption.episode_id}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            choice: selectedChoice,
            free_text: freeText.trim() || undefined,
            squares_highlighted: squaresHighlighted,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || 'Failed to submit answer')
      }

      onAnswered()
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to save reasoning')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] text-[#1E293B] rounded-2xl shadow-2xl border border-[#D9CEBA] overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#F2EDE2] border-b border-[#E3DAC9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8A7148]">
            <Sparkles className="w-4 h-4 text-[#C59B27]" />
            <span>Think First · Socratic Pause</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#64748B] font-medium bg-[#E8E1D1] px-2.5 py-1 rounded-full">
            <Brain className="w-3.5 h-3.5" />
            <span>Decision Moment</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 md:p-8 space-y-6 overflow-y-auto">
          {/* Dr. Wolf Avatar & Question */}
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-[#C59B27] shrink-0 bg-[#E8E1D1] shadow-md">
              <Image
                src="/images/dr-wolf-portrait.png"
                alt="Dr. Wolf"
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#8A7148]">
                Dr. Wolf asks:
              </h4>
              <p className="font-serif text-lg sm:text-xl md:text-2xl text-[#0F172A] leading-snug font-medium">
                &ldquo;{interruption.question}&rdquo;
              </p>
            </div>
          </div>

          {/* Socratic Options & Interactive Board */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Structured Options */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                1. Choose your primary focus:
              </label>
              <div className="space-y-2">
                {interruption.options.map((opt) => {
                  const isSelected = selectedChoice === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSelectedChoice(opt.key)
                        setError(null)
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-sm font-medium ${
                        isSelected
                          ? 'bg-[#F4ECE1] border-[#C59B27] text-[#0F172A] shadow-sm ring-1 ring-[#C59B27]'
                          : 'bg-white border-[#E2D9C8] text-[#334155] hover:bg-[#FAF6EE] hover:border-[#D5C7B0]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#C59B27] border-[#C59B27] text-white'
                            : 'border-[#CBD5E1] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Interactive Board Square Selection */}
            <div className="space-y-2 bg-[#F6F1E5] p-3.5 sm:p-4 rounded-xl border border-[#E0D5C1]">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  <MousePointerClick className="w-3.5 h-3.5 text-[#8A7148]" />
                  <span>2. Highlight Key Squares (Optional):</span>
                </label>
                {squaresHighlighted.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSquares}
                    className="text-[11px] text-[#8A7148] hover:text-[#584428] font-medium flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear selection</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Mini Square Selection Board */}
                <div className="shrink-0 w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] bg-[#d4ab77] p-1.5 rounded-lg border border-[#b48853] shadow-inner">
                  <div className="grid grid-cols-8 grid-rows-8 w-full h-full border border-[#966b3b]">
                    {boardMatrix.map((row, rIdx) =>
                      row.map((piece, fIdx) => {
                        const sqName = `${files[fIdx]}${ranks[rIdx]}`
                        const isLight = (rIdx + fIdx) % 2 === 0
                        const isSelected = squaresHighlighted.includes(sqName)

                        return (
                          <div
                            key={sqName}
                            onClick={() => toggleSquare(sqName)}
                            className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                              isLight ? 'bg-[#f0d9b5]' : 'bg-[#b58863]'
                            } ${
                              isSelected
                                ? 'ring-2 ring-[#C59B27] ring-inset bg-[#FFE082]/80'
                                : 'hover:opacity-90'
                            }`}
                          >
                            {piece && (
                              <ChessPiece
                                type={piece.type as PieceType}
                                color={piece.color as PieceColor}
                              />
                            )}
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#F59E0B]/30 pointer-events-none" />
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="text-xs text-[#64748B] space-y-2 flex-1">
                  <p>
                    Click any squares on the mini-board that are central to your calculation (e.g. threatened pieces, key target squares).
                  </p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="font-semibold text-[#1E293B]">Selected:</span>
                    {squaresHighlighted.length === 0 ? (
                      <span className="italic text-[#94A3B8]">None selected</span>
                    ) : (
                      squaresHighlighted.map((sq) => (
                        <span
                          key={sq}
                          className="px-2 py-0.5 bg-[#E8E1D1] text-[#2D170E] font-mono font-bold rounded border border-[#D5C7B0]"
                        >
                          {sq}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Optional Free Text Field */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                3. Your thinking in words <span className="font-normal lowercase text-[#94A3B8]">(optional)</span>:
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="What specific ideas, threats, or candidate lines caught your attention?"
                rows={2}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#E2D9C8] rounded-xl text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#C59B27] focus:border-transparent transition-all resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#DC2626] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#EAE2D2]">
              <p className="text-xs text-[#64748B] italic text-center sm:text-left">
                Reasoning recorded first. Move execution commits your decision.
              </p>
              <button
                type="submit"
                disabled={isSubmitting || !selectedChoice}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <span>{isSubmitting ? 'Saving...' : 'Commit Thinking'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
