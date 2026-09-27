'use client'

import React, { useState, Suspense } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  User,
  Info,
  Camera,
  ChevronDown,
  Palette,
  Target,
  Bell,
  Shield,
  Link as LinkIcon,
  Check,
  MoreVertical,
} from 'lucide-react'
import {
  DashboardShell,
  DemoBanner,
} from '@/components/dashboard'

function SettingsContent() {
  const searchParams = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'

  const [boardTheme, setBoardTheme] = useState<'classic' | 'green' | 'walnut' | 'dark'>('classic')
  const [showCoords, setShowCoords] = useState(true)
  const [showExplanations, setShowExplanations] = useState(true)
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [trainingReminders, setTrainingReminders] = useState(true)
  const [featureAnnouncements, setFeatureAnnouncements] = useState(false)
  const [tipsInsights, setTipsInsights] = useState(true)
  const [dataUsage, setDataUsage] = useState(true)

  return (
    <DashboardShell username={isDemo ? 'Alex' : 'Learner'}>
      <div className="space-y-6">
        {/* Explicit Demo Banner */}
        {isDemo && <DemoBanner exitHref="/settings" />}

        {/* Page Header */}
        <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#2d170e]">
              Settings
            </h1>
            <p className="font-serif text-base text-[#6d503b] mt-1">
              Customize your experience and coaching preferences.
            </p>
          </div>
          <span className="text-[11px] font-sans-custom uppercase tracking-wider text-[#8c745f] bg-[#ede0ca]/60 border border-[#dec8af] px-3 py-1 rounded-full self-start sm:self-auto">
            Client Preferences & Local Storage
          </span>
        </div>

        {/* 6 Settings Panels (2 columns grid) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Panel 1: Profile */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <User className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Profile</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar + Change photo */}
              <div className="flex flex-col items-center space-y-2.5 shrink-0">
                <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#dec8af] shadow-md">
                  <Image
                    src="/dr_wolf_portrait.jpg"
                    alt={isDemo ? 'Alex' : 'Learner'}
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-1.5 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-2.5 py-1 text-xs font-serif text-[#9b8370] cursor-not-allowed opacity-70"
                  title="Photo upload requires cloud account"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Change photo</span>
                </button>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3.5 flex-1 w-full font-serif text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-[#6d503b] font-medium w-24">Display Name</label>
                  <input
                    type="text"
                    defaultValue={isDemo ? 'Alex' : 'Learner'}
                    className="flex-1 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-3 py-1.5 text-xs text-[#2d170e] font-serif focus:outline-none focus:border-[#b3782b]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-[#6d503b] font-medium w-24">Email</label>
                  <input
                    type="email"
                    defaultValue={isDemo ? 'alex@example.com' : ''}
                    placeholder={isDemo ? 'alex@example.com' : 'Optional (stored locally)'}
                    className="flex-1 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-3 py-1.5 text-xs text-[#2d170e] font-serif focus:outline-none focus:border-[#b3782b]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-[#6d503b] font-medium w-24">Skill tier</label>
                  <div className="flex-1 relative">
                    <select
                      defaultValue={isDemo ? 'intermediate' : 'beginner'}
                      className="w-full appearance-none rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-3 py-1.5 text-xs text-[#2d170e] font-serif focus:outline-none focus:border-[#b3782b]"
                    >
                      <option value="beginner">Beginner (under 1200)</option>
                      <option value="intermediate">Intermediate (1200 – 1600)</option>
                      <option value="advanced">Advanced (1600+)</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#8c745f] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Board Preferences */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Palette className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Board Preferences</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-4 font-serif text-xs">
              {/* Board Theme Swatches */}
              <div className="space-y-2">
                <label className="text-[#6d503b] font-medium block">Board theme</label>
                <div className="grid grid-cols-4 gap-3">
                  {/* Classic */}
                  <button
                    type="button"
                    onClick={() => setBoardTheme('classic')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                      boardTheme === 'classic'
                        ? 'border-[#b3782b] bg-[#faf2e4] ring-2 ring-[#b3782b]/30'
                        : 'border-[#ede2d2] bg-[#faf6ee]'
                    }`}
                  >
                    <div className="h-10 w-10 rounded border border-[#dec8af] grid grid-cols-2 grid-rows-2">
                      <div className="bg-[#f4deb8]" />
                      <div className="bg-[#ba8d5d]" />
                      <div className="bg-[#ba8d5d]" />
                      <div className="bg-[#f4deb8]" />
                    </div>
                    <span className="text-[11px] font-bold text-[#2d170e]">Classic</span>
                  </button>

                  {/* Green */}
                  <button
                    type="button"
                    onClick={() => setBoardTheme('green')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                      boardTheme === 'green'
                        ? 'border-[#b3782b] bg-[#faf2e4] ring-2 ring-[#b3782b]/30'
                        : 'border-[#ede2d2] bg-[#faf6ee]'
                    }`}
                  >
                    <div className="h-10 w-10 rounded border border-[#c0dec7] grid grid-cols-2 grid-rows-2">
                      <div className="bg-[#eeeed2]" />
                      <div className="bg-[#769656]" />
                      <div className="bg-[#769656]" />
                      <div className="bg-[#eeeed2]" />
                    </div>
                    <span className="text-[11px] text-[#6d503b]">Green</span>
                  </button>

                  {/* Walnut */}
                  <button
                    type="button"
                    onClick={() => setBoardTheme('walnut')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                      boardTheme === 'walnut'
                        ? 'border-[#b3782b] bg-[#faf2e4] ring-2 ring-[#b3782b]/30'
                        : 'border-[#ede2d2] bg-[#faf6ee]'
                    }`}
                  >
                    <div className="h-10 w-10 rounded border border-[#dec8af] grid grid-cols-2 grid-rows-2">
                      <div className="bg-[#e0c39e]" />
                      <div className="bg-[#8b5a2b]" />
                      <div className="bg-[#8b5a2b]" />
                      <div className="bg-[#e0c39e]" />
                    </div>
                    <span className="text-[11px] text-[#6d503b]">Walnut</span>
                  </button>

                  {/* Dark */}
                  <button
                    type="button"
                    onClick={() => setBoardTheme('dark')}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 border transition-all ${
                      boardTheme === 'dark'
                        ? 'border-[#b3782b] bg-[#faf2e4] ring-2 ring-[#b3782b]/30'
                        : 'border-[#ede2d2] bg-[#faf6ee]'
                    }`}
                  >
                    <div className="h-10 w-10 rounded border border-[#9b8370] grid grid-cols-2 grid-rows-2">
                      <div className="bg-[#a0a0a0]" />
                      <div className="bg-[#4a4a4a]" />
                      <div className="bg-[#4a4a4a]" />
                      <div className="bg-[#a0a0a0]" />
                    </div>
                    <span className="text-[11px] text-[#6d503b]">Dark</span>
                  </button>
                </div>
              </div>

              {/* Piece style */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-[#6d503b] font-medium">Piece style</label>
                <div className="flex items-center gap-2 rounded-lg border border-[#d8c7b0] bg-[#faf5ec] px-3 py-1.5">
                  <span className="text-sm">♟ ♞ ♝ ♜ ♛ ♚</span>
                  <span className="font-bold text-[#2d170e] ml-2">Classic</span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#8c745f]" />
                </div>
              </div>

              {/* Coordinates Toggle */}
              <div className="flex items-center justify-between pt-1">
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
                  <span className="text-[11px] text-[#8c745f]">Show file and rank coordinates (a–h, 1–8)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Training Preferences */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Target className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Training Preferences</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3.5 font-serif text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[#6d503b] font-medium">Training engine level</label>
                  <div className="relative">
                    <select
                      defaultValue="intermediate"
                      className="rounded-lg border border-[#d8c7b0] bg-[#faf5ec] pl-3 pr-7 py-1 text-xs text-[#2d170e] font-serif focus:outline-none"
                    >
                      <option value="beginner">Beginner (800)</option>
                      <option value="intermediate">Intermediate (1200)</option>
                      <option value="master">Master (2000)</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-[#8c745f] pointer-events-none" />
                  </div>
                </div>
                <p className="text-[11px] text-[#9b8370]">Adjust the strength of analysis and training positions.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[#6d503b] font-medium">Focus areas</label>
                  <div className="relative">
                    <select
                      defaultValue="all"
                      className="rounded-lg border border-[#d8c7b0] bg-[#faf5ec] pl-3 pr-7 py-1 text-xs text-[#2d170e] font-serif focus:outline-none"
                    >
                      <option value="all">All topics</option>
                      <option value="tactics">Tactical Awareness</option>
                      <option value="threats">Threat Detection</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-[#8c745f] pointer-events-none" />
                  </div>
                </div>
                <p className="text-[11px] text-[#9b8370]">Choose which themes to prioritize in training.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[#6d503b] font-medium">Puzzle difficulty</label>
                  <div className="relative">
                    <select
                      defaultValue="adaptive"
                      className="rounded-lg border border-[#d8c7b0] bg-[#faf5ec] pl-3 pr-7 py-1 text-xs text-[#2d170e] font-serif focus:outline-none"
                    >
                      <option value="adaptive">Adaptive (recommended)</option>
                      <option value="hard">Challenge</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-[#8c745f] pointer-events-none" />
                  </div>
                </div>
                <p className="text-[11px] text-[#9b8370]">Automatically adjusts to your performance.</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-[#6d503b] font-medium">Show explanations</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExplanations(!showExplanations)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      showExplanations ? 'bg-[#b3782b]' : 'bg-[#d8c7b0]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showExplanations ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] text-[#8c745f]">Show detailed explanations after each answer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 4: Notifications */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Bell className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Notifications</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3 font-serif text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6d503b] font-medium">Email updates</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailUpdates(!emailUpdates)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      emailUpdates ? 'bg-[#b3782b]' : 'bg-[#d8c7b0]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ${emailUpdates ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[11px] text-[#8c745f] w-36">Weekly progress summary</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#6d503b] font-medium">Training reminders</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTrainingReminders(!trainingReminders)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      trainingReminders ? 'bg-[#b3782b]' : 'bg-[#d8c7b0]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ${trainingReminders ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[11px] text-[#8c745f]">Remind me to train</span>
                  <select className="rounded border border-[#d8c7b0] bg-[#faf5ec] px-2 py-0.5 text-[11px] text-[#2d170e]">
                    <option>Daily</option>
                    <option>Weekly</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#6d503b] font-medium">Feature announcements</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFeatureAnnouncements(!featureAnnouncements)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      featureAnnouncements ? 'bg-[#b3782b]' : 'bg-[#d8c7b0]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ${featureAnnouncements ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[11px] text-[#8c745f] w-44">Product updates and new features</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#6d503b] font-medium">Tips and insights</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTipsInsights(!tipsInsights)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      tipsInsights ? 'bg-[#b3782b]' : 'bg-[#d8c7b0]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ${tipsInsights ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[11px] text-[#8c745f] w-44">Chess tips and learning insights</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 5: Privacy */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <Shield className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Privacy</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-4 font-serif text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[#6d503b] font-medium">Profile visibility</label>
                  <div className="relative">
                    <select
                      defaultValue="private"
                      className="rounded-lg border border-[#d8c7b0] bg-[#faf5ec] pl-3 pr-7 py-1 text-xs text-[#2d170e] font-serif focus:outline-none"
                    >
                      <option value="private">🔒 Private</option>
                      <option value="public">Public</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-[#8c745f] pointer-events-none" />
                  </div>
                </div>
                <p className="text-[11px] text-[#9b8370]">Your games and progress are only visible to you.</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDataUsage(!dataUsage)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      dataUsage ? 'bg-[#b3782b]' : 'bg-[#d8c7b0]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ${dataUsage ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-[11px] text-[#6d503b]">
                    Allow anonymous usage data to improve Dr. Wolf Brain <span className="underline cursor-pointer">Learn more</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#f0e6d8]">
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-[#f5c2bd] bg-[#fffbfb] px-3 py-1.5 text-xs font-serif font-bold text-[#9c2f24] opacity-50 cursor-not-allowed"
                >
                  Delete local session data
                </button>
                <span className="text-[11px] text-[#9b8370]">Stored locally in browser session cache.</span>
              </div>
            </div>
          </div>

          {/* Panel 6: Connected Accounts */}
          <div className="rounded-2xl border border-[#e5d8c5] bg-[#fffdfa] p-6 shadow-[0_2px_12px_rgba(60,35,18,0.03)] space-y-5">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <LinkIcon className="h-5 w-5 stroke-[1.8] text-[#2d170e]" />
                <h2 className="font-serif text-lg font-bold text-[#2d170e]">Connected Accounts</h2>
              </div>
              <Info className="h-4 w-4 text-[#9b8370]" />
            </div>

            <div className="space-y-3 font-serif text-xs">
              {/* Chess.com */}
              <div className="flex items-center justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">♟</span>
                  <div>
                    <span className="font-bold text-[#2d170e] block">Chess.com</span>
                    <span className="text-[11px] text-[#8c745f]">Import your games and enhance training.</span>
                  </div>
                </div>
                <button className="rounded-lg bg-[#ede0ca] px-3 py-1.5 text-xs font-semibold text-[#2d170e] hover:bg-[#e4d4b9]">
                  Connect
                </button>
              </div>

              {/* Lichess */}
              <div className="flex items-center justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">♞</span>
                  <div>
                    <span className="font-bold text-[#2d170e] block">Lichess</span>
                    <span className="text-[11px] text-[#8c745f]">Import your games and study progress.</span>
                  </div>
                </div>
                <button className="rounded-lg bg-[#ede0ca] px-3 py-1.5 text-xs font-semibold text-[#2d170e] hover:bg-[#e4d4b9]">
                  Connect
                </button>
              </div>

              {/* Google */}
              <div className="flex items-center justify-between rounded-xl border border-[#ede2d2] bg-[#faf6ee] p-3">
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-[#4285F4]">G</span>
                  <div>
                    <span className="font-bold text-[#2d170e] block">Google</span>
                    <span className="text-[11px] text-[#8c745f]">Sign in for cloud synchronization.</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDemo ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f1e9] px-2.5 py-0.5 text-xs font-medium text-[#3b6348]">
                      <Check className="h-3 w-3" /> Connected (Demo)
                    </span>
                  ) : (
                    <button className="rounded-lg bg-[#ede0ca] px-3 py-1.5 text-xs font-semibold text-[#2d170e] hover:bg-[#e4d4b9]">
                      Connect
                    </button>
                  )}
                </div>
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
