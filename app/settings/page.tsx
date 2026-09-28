'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Image from 'next/image'
import {
  User,
  Info,
  ChevronDown,
  Palette,
  Target,
  Bell,
  Shield,
  Check,
  Save,
} from 'lucide-react'
import { DashboardShell } from '@/components/dashboard'

function SettingsContent() {
  const [username, setUsername] = useState('Learner')
  const [rating, setRating] = useState('1200')
  const [boardTheme, setBoardTheme] = useState<'classic' | 'green' | 'walnut' | 'dark'>('classic')
  const [showCoords, setShowCoords] = useState(true)
  const [showExplanations, setShowExplanations] = useState(true)
  const [trainingDifficulty, setTrainingDifficulty] = useState('adaptive')
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('dr_wolf_username')
      if (storedName) setUsername(storedName)
      const storedRating = localStorage.getItem('dr_wolf_rating')
      if (storedRating) setRating(storedRating)
      const storedTheme = localStorage.getItem('dr_wolf_board_theme') as any
      if (storedTheme) setBoardTheme(storedTheme)
      const storedCoords = localStorage.getItem('dr_wolf_show_coords')
      if (storedCoords !== null) setShowCoords(storedCoords === 'true')
    }
  }, [])

  const handleSavePreferences = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (typeof window !== 'undefined') {
      localStorage.setItem('dr_wolf_username', username.trim() || 'Learner')
      localStorage.setItem('dr_wolf_rating', rating || '1200')
      localStorage.setItem('dr_wolf_board_theme', boardTheme)
      localStorage.setItem('dr_wolf_show_coords', String(showCoords))
    }
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  return (
    <DashboardShell username={username}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Settings
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Customize your player profile, board display, and coaching preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSavePreferences}
            className="inline-flex items-center gap-2 rounded-xl bg-[#361f14] px-4 py-2 text-xs font-serif font-bold text-[#fbf1dc] hover:bg-[#23120b] shadow-sm transition-all self-start sm:self-auto"
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4 text-[#709873]" />
                <span>Preferences Saved</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Settings Panels Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Panel 1: Profile */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <User className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Player Profile</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#dec8af] shadow-md shrink-0">
                <Image
                  src="/dr_wolf_portrait.jpg"
                  alt={username}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Form Inputs */}
              <div className="space-y-3.5 flex-1 w-full font-serif text-xs">
                <div>
                  <label className="text-[#6d503b] font-medium block mb-1">Display / Chess.com Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-3 py-2 text-xs text-[#2d170e] font-serif focus:outline-none focus:border-[#b3782b]"
                  />
                </div>

                <div>
                  <label className="text-[#6d503b] font-medium block mb-1">Estimated Rating</label>
                  <input
                    type="number"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="w-full rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-3 py-2 text-xs text-[#2d170e] font-serif focus:outline-none focus:border-[#b3782b]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Board Preferences */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Palette className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Board Appearance</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-4 font-serif text-xs">
              <div className="space-y-2">
                <label className="text-[#6d503b] font-medium block">Board theme</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'classic', label: 'Classic', light: '#f4deb8', dark: '#ba8d5d' },
                    { id: 'green', label: 'Green', light: '#eeeed2', dark: '#769656' },
                    { id: 'walnut', label: 'Walnut', light: '#e0c39e', dark: '#8b5a2b' },
                    { id: 'dark', label: 'Dark', light: '#a0a0a0', dark: '#4a4a4a' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setBoardTheme(theme.id as any)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                        boardTheme === theme.id
                          ? 'border-[#b3782b] bg-[#faf2e4] ring-2 ring-[#b3782b]/30'
                          : 'border-[#ede2d2] bg-[#faf6ee]'
                      }`}
                    >
                      <div className="h-8 w-8 rounded border border-[#dec8af] grid grid-cols-2 grid-rows-2">
                        <div style={{ backgroundColor: theme.light }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.light }} />
                      </div>
                      <span className="text-[11px] font-bold text-[#2d170e]">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-[#f0e6d8]">
                <label className="text-[#6d503b] font-medium">Board coordinates</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCoords(!showCoords)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      showCoords ? 'bg-[#b3782b]' : 'bg-[#d8c7b0]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showCoords ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] text-[#8c745f]">Show file and rank letters (a–h, 1–8)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Coaching & Think First Settings */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Target className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Coaching Preferences</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3.5 font-serif text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[#2d170e] font-bold block">Engine Difficulty Mode</span>
                  <span className="text-[11px] text-[#8c745f]">Calculates move replies using Stockfish Limited Elo</span>
                </div>
                <span className="inline-block rounded-lg bg-[#faf5ec] border border-[#dec8af] px-2.5 py-1 font-semibold text-[#845722]">
                  Adaptive Elo
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#f0e6d8]">
                <div>
                  <span className="text-[#2d170e] font-bold block">Think First Protocol</span>
                  <span className="text-[11px] text-[#8c745f]">Deterministic triggers on critical tactical pivots (move 8+)</span>
                </div>
                <span className="inline-block rounded-lg bg-[#e8f1e9] text-[#3b6348] font-bold px-2.5 py-1">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Panel 4: Local Storage & Privacy */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Data Authority & Privacy</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3 font-serif text-xs">
              <p className="text-[#6d503b] leading-relaxed">
                Your learner profile and session records are stored in the local SQLite / PostgreSQL backend database. Browser storage maintains your active player identity token.
              </p>
              <div className="pt-2 border-t border-[#f0e6d8] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to reset your local session state?')) {
                      localStorage.clear()
                      window.location.href = '/'
                    }
                  }}
                  className="rounded-xl border border-[#f5c2bd] bg-[#fffbfb] px-3.5 py-2 text-xs font-serif font-bold text-[#9c2f24] hover:bg-[#fceeed] transition-all"
                >
                  Reset Local Identity
                </button>
                <span className="text-[11px] text-[#9b8370]">Clears browser localStorage</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  )
}
