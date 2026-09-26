'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  Play,
  ArrowRight,
  GraduationCap,
  Brain,
  BarChart3,
  Check,
  Music2,
  Lightbulb,
  MessageSquare,
  Repeat,
  Star,
  Layers,
  Database,
  SlidersHorizontal,
  Target,
  GitFork,
  TrendingUp,
  Gamepad2,
  Settings,
  FileText,
  BookOpen,
  Code2,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertCircle,
} from 'lucide-react'
import { ChessboardView, defaultHeroPosition, thinkFirstPosition, reviewPosition } from '@/components/Chessboard'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat' | 'gamePlan'>('analysis')

  return (
    <main className="min-h-screen text-[#361d14]">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 bg-[#f5edd9]/95 backdrop-blur-md border-b border-[#d8c09a]/80 shadow-[0_2px_8px_rgba(80,50,20,0.04)]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          {/* Brand Logo */}
          <a href="#home" className="flex items-center gap-3 group">
            <span className="text-2xl sm:text-3xl leading-none select-none drop-shadow-sm transition-transform group-hover:scale-105">
              ♞
            </span>
            <span className="font-serif-custom text-2xl sm:text-[26px] font-bold tracking-tight text-[#2d170e]">
              Dr. Wolf Brain
            </span>
          </a>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-9 font-serif-custom text-[17px] font-medium text-[#4f3222]">
            <a href="#home" className="hover:text-[#b3782b] transition-colors">
              Home
            </a>
            <a href="#learn" className="hover:text-[#b3782b] transition-colors">
              Learn
            </a>
            <a href="#train" className="hover:text-[#b3782b] transition-colors">
              Train
            </a>
            <a href="#about" className="hover:text-[#b3782b] transition-colors">
              About
            </a>
            <a href="#docs" className="hover:text-[#b3782b] transition-colors">
              Docs
            </a>
          </nav>

          {/* Right Action Button */}
          <div className="hidden md:flex items-center">
            <a
              href="#train"
              className="bg-[#361f14] hover:bg-[#23120b] text-[#fbf1dc] px-6 py-2.5 rounded-[6px] font-serif-custom text-[16px] font-semibold shadow-[0_3px_0_#1f1008] transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
            >
              Start Learning
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#361f14]"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#f8f0de] border-b border-[#d8c09a] px-6 py-5 flex flex-col gap-4 font-serif-custom text-lg shadow-lg">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Home
            </a>
            <a
              href="#learn"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Learn
            </a>
            <a
              href="#train"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Train
            </a>
            <a
              href="#about"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              About
            </a>
            <a
              href="#docs"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#b3782b]"
            >
              Docs
            </a>
            <a
              href="#train"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-block text-center bg-[#361f14] text-[#fbf1dc] px-5 py-2.5 rounded-[6px] font-semibold mt-2"
            >
              Start Learning
            </a>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section id="home" className="relative pt-10 sm:pt-14 pb-16 sm:pb-20 overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-6 flex flex-col">
              {/* Eyebrow */}
              <p className="font-sans-custom uppercase tracking-[0.25em] text-[12px] sm:text-[13px] font-semibold text-[#8b5c36] mb-3 sm:mb-4">
                A PERSONALIZED AI CHESS COACH
              </p>

              {/* H1 Main Heading */}
              <h1 className="font-serif-custom text-[52px] sm:text-[68px] lg:text-[76px] font-bold text-[#2d170e] leading-[0.95] tracking-tight mb-3">
                Dr. Wolf Brain
              </h1>

              {/* Subheading */}
              <h2 className="font-serif-custom text-[28px] sm:text-[34px] lg:text-[38px] font-semibold text-[#3b2116] leading-[1.1] mb-5">
                An AI chess coach that learns how you think.
              </h2>

              {/* Body Description */}
              <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#5c3e2d] leading-[1.45] max-w-[530px] mb-8">
                Play, train, and get personalized guidance from Dr. Wolf. He analyzes your games,
                explains the ideas in plain language, and adapts to your style over time.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 mb-9">
                <a
                  href="#train"
                  className="inline-flex items-center gap-2.5 bg-[#381f14] hover:bg-[#25130b] text-[#fcf1dc] px-7 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold shadow-[0_3px_0_#200f07] transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
                >
                  <Play size={16} className="fill-[#fcf1dc]" />
                  <span>Try It Now</span>
                </a>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2.5 bg-[#faebd4]/80 hover:bg-[#faebd4] text-[#3d2315] border border-[#b89163] px-6 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold transition-all hover:translate-y-[-2px] shadow-sm"
                >
                  <span>See How It Works</span>
                  <ArrowRight size={17} />
                </a>
              </div>

              {/* Bottom Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 border-t border-[#d8c09a]/60">
                <div className="flex items-center gap-2.5 text-[#543827]">
                  <GraduationCap size={22} className="text-[#361f14] flex-shrink-0" />
                  <span className="font-serif-custom text-[14px] leading-tight font-medium">
                    Personalized chess coaching
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[#543827]">
                  <Brain size={22} className="text-[#361f14] flex-shrink-0" />
                  <span className="font-serif-custom text-[14px] leading-tight font-medium">
                    Learns from your games
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[#543827]">
                  <BarChart3 size={22} className="text-[#361f14] flex-shrink-0" />
                  <span className="font-serif-custom text-[14px] leading-tight font-medium">
                    Clear, practical explanations
                  </span>
                </div>
              </div>
            </div>

            {/* Right Hero Interactive Mockup */}
            <div className="lg:col-span-6">
              <div className="parchment-window p-3 sm:p-4 bg-[#ecd4ab] border border-[#bfa075] rounded-[10px] shadow-[0_18px_38px_rgba(65,36,18,0.22)]">
                {/* Window Header */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-[#cca97f]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
                  </div>
                  <div className="flex items-center gap-1 text-[#835a39]">
                    <Music2 size={15} />
                  </div>
                </div>

                {/* Inner Window Content */}
                <div className="pt-3">
                  {/* Top Coach Dialogue Card */}
                  <div className="bg-[#fbf4e6] border border-[#d8be96] rounded-[7px] p-3 sm:p-3.5 mb-3.5 flex items-start gap-3.5 shadow-sm">
                    <div className="w-12 h-12 rounded-[5px] overflow-hidden border border-[#c49e6f] flex-shrink-0 relative shadow-sm">
                      <Image
                        src="/dr_wolf_portrait.jpg"
                        alt="Dr. Wolf"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-serif-custom font-bold text-[15px] text-[#2d170e] leading-none mb-1">
                        Dr. Wolf
                      </p>
                      <p className="font-serif-custom text-[14px] sm:text-[15px] text-[#4d3222] leading-snug">
                        &ldquo;This is an interesting move. Let&apos;s look at what it accomplishes
                        and what to consider next.&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Main Board & Plan Panel Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-start">
                    {/* Chess Board Area */}
                    <div className="sm:col-span-7 flex flex-col items-center">
                      <ChessboardView position={defaultHeroPosition} showCoords={true} />

                      {/* Navigation Controls Under Board */}
                      <div className="flex items-center justify-center gap-4 mt-2.5 text-[#5e3f2b]">
                        <button
                          aria-label="First move"
                          className="p-1 hover:text-[#2d170e] transition-colors"
                        >
                          <ChevronsLeft size={16} />
                        </button>
                        <button
                          aria-label="Previous move"
                          className="p-1 hover:text-[#2d170e] transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          aria-label="Next move"
                          className="p-1 hover:text-[#2d170e] transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <button
                          aria-label="Last move"
                          className="p-1 hover:text-[#2d170e] transition-colors"
                        >
                          <ChevronsRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Right Side "Your Plan" Column */}
                    <div className="sm:col-span-5 flex flex-col gap-3">
                      <div className="bg-[#fbf4e6] border border-[#d8be96] rounded-[7px] p-3.5 shadow-sm">
                        <h3 className="font-serif-custom font-bold text-[18px] text-[#2d170e] mb-3 pb-2 border-b border-[#dfc7a4]">
                          Your Plan
                        </h3>
                        <ul className="space-y-2.5">
                          {[
                            'Find better plans',
                            'Avoid early traps',
                            'Improve piece coordination',
                            'Learn from your mistakes',
                            'Build long-term habits',
                          ].map((item) => (
                            <li
                              key={item}
                              className="flex items-center gap-2 text-[13px] font-serif-custom text-[#3d2417]"
                            >
                              <div className="w-4 h-4 rounded-full bg-[#528236] flex items-center justify-center flex-shrink-0">
                                <Check size={11} className="text-white stroke-[3]" />
                              </div>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Bottom Adaptation Note */}
                      <div className="bg-[#fbf4e6]/90 border border-[#d8be96] rounded-[7px] p-3 shadow-sm">
                        <p className="font-serif-custom italic text-[12px] sm:text-[13px] text-[#634533] leading-snug">
                          &ldquo;I&apos;ll adapt to your games and focus on the ideas that matter
                          most for your progress.&rdquo;
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ornate Divider */}
      <div className="vintage-ornament py-4">
        <span className="text-lg text-[#b89163]">❧</span>
      </div>

      {/* 3. Section: "A Coach Built Around You" */}
      <section id="learn" className="py-14 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[760px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              A Coach Built Around You
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              Dr. Wolf Brain combines play, analysis, and personalized coaching to help you
              understand chess more deeply and make steady progress.
            </p>
          </div>

          {/* 3 Large Feature Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 items-stretch">
            {/* Card 1: Think First */}
            <div className="parchment-card p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14]">
                  <Lightbulb size={22} />
                </div>
                <h3 className="font-serif-custom text-[24px] font-bold text-[#2d170e]">
                  Think First
                </h3>
              </div>
              <p className="font-serif-custom text-[15px] text-[#5e412f] leading-snug mb-5">
                Get in-game guidance that helps you think through positions, not just find moves.
              </p>

              {/* Inset Board Preview with Coach Dialogue */}
              <div className="mt-auto relative rounded-[7px] overflow-hidden border border-[#d8be96] bg-[#deb887] p-2">
                <ChessboardView position={thinkFirstPosition} showCoords={false} />
                
                {/* Speech Overlay */}
                <div className="absolute top-[32%] right-2 left-[38%] bg-[#fcf5e8] border border-[#cfb088] rounded-[6px] p-2.5 shadow-md">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-serif-custom font-bold text-[11px] text-[#2d170e]">
                      Dr. Wolf
                    </span>
                  </div>
                  <p className="font-serif-custom text-[11px] text-[#4d3222] leading-tight">
                    What are you trying to accomplish in this position?
                  </p>
                </div>

                {/* Think button */}
                <div className="absolute bottom-3 right-3">
                  <button className="inline-flex items-center gap-1.5 bg-[#361f14] hover:bg-[#201008] text-[#fbf1dc] text-[11px] font-serif-custom font-semibold px-2.5 py-1.5 rounded shadow">
                    <span>Think about plans</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Your Chess Brain */}
            <div className="parchment-card p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14]">
                  <Brain size={22} />
                </div>
                <h3 className="font-serif-custom text-[24px] font-bold text-[#2d170e]">
                  Your Chess Brain
                </h3>
              </div>
              <p className="font-serif-custom text-[15px] text-[#5e412f] leading-snug mb-5">
                A personalized coach that learns from your games, remembers your patterns, and adapts
                over time.
              </p>

              {/* Inset Profile Card */}
              <div className="mt-auto parchment-inset rounded-[7px] p-4 border border-[#d8be96]">
                <h4 className="font-serif-custom font-bold text-[16px] text-[#2d170e] mb-3 pb-2 border-b border-[#dfc7a4]">
                  Your Profile Grows
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none text-[#361f14] mt-0.5">♟</span>
                    <div>
                      <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                        Your openings
                      </strong>
                      <span className="block font-serif-custom text-[12px] text-[#6e4e39]">
                        Learn the lines you play
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Repeat size={16} className="text-[#361f14] mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                        Recurring themes
                      </strong>
                      <span className="block font-serif-custom text-[12px] text-[#6e4e39]">
                        Recognize patterns in your games
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Star size={16} className="text-[#361f14] mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                        Strengths and gaps
                      </strong>
                      <span className="block font-serif-custom text-[12px] text-[#6e4e39]">
                        Focus on what matters
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MessageSquare size={16} className="text-[#361f14] mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                        Personalized advice
                      </strong>
                      <span className="block font-serif-custom text-[12px] text-[#6e4e39]">
                        Get guidance tailored to your style
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Why Did You Ask Me That? */}
            <div className="parchment-card p-5 sm:p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14]">
                  <MessageSquare size={22} />
                </div>
                <h3 className="font-serif-custom text-[24px] font-bold text-[#2d170e]">
                  Why Did You Ask Me That?
                </h3>
              </div>
              <p className="font-serif-custom text-[15px] text-[#5e412f] leading-snug mb-5">
                Every suggestion comes with a clear explanation, so you understand the why, not
                just the what.
              </p>

              {/* Inset Coach Explanation Card */}
              <div className="mt-auto parchment-inset rounded-[7px] p-4 border border-[#d8be96] flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-[5px] overflow-hidden border border-[#c49e6f] flex-shrink-0 relative">
                    <Image
                      src="/dr_wolf_portrait.jpg"
                      alt="Dr. Wolf"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                      Dr. Wolf
                    </strong>
                    <p className="font-serif-custom text-[12px] sm:text-[13px] text-[#4d3222] leading-snug mt-0.5">
                      I asked because this move gives you space, improves your piece coordination,
                      and fits the plan you&apos;ve been playing. It also avoids a common tactic in
                      similar positions.
                    </p>
                  </div>
                </div>

                {/* Related Ideas */}
                <div className="pt-2 border-t border-[#dfc7a4]">
                  <span className="block font-serif-custom font-bold text-[12px] text-[#604230] mb-1">
                    Related ideas:
                  </span>
                  <ul className="text-[12px] font-serif-custom text-[#4d3222] space-y-0.5">
                    <li>• Control key central squares</li>
                    <li>• Finish your development</li>
                    <li>• Watch for opponent counterplay</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: "Understand the Why Behind Every Move" */}
      <section id="train" className="py-14 sm:py-20 bg-[#edd7b2]/40 border-y border-[#d8c09a]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[800px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              Understand the Why Behind Every Move
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              Get clear, human-style explanations for your moves, mistakes, and your opponent&apos;s
              plans. Turn every game into a learning opportunity.
            </p>
          </div>

          {/* Large Interactive Review Card */}
          <div className="parchment-window max-w-[1020px] mx-auto p-4 sm:p-6 bg-[#ecd4ab] border border-[#bfa075] rounded-[10px] shadow-[0_20px_45px_rgba(65,36,18,0.2)]">
            {/* Window Dots */}
            <div className="flex items-center gap-1.5 pb-4 border-b border-[#cca97f] mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#af7f53]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Chessboard Side */}
              <div className="md:col-span-6 flex justify-center">
                <div className="w-full max-w-[420px]">
                  <ChessboardView
                    position={reviewPosition}
                    arrow={{ from: [3, 4], to: [2, 5] }}
                    showCoords={true}
                  />
                </div>
              </div>

              {/* Analysis & Tabs Side */}
              <div className="md:col-span-6 flex flex-col bg-[#fbf4e6] border border-[#d8be96] rounded-[8px] p-4 sm:p-5 shadow-sm">
                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-[#dfc7a4] pb-3 mb-4">
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className={`font-serif-custom text-[16px] font-bold pb-1 transition-all ${
                      activeTab === 'analysis'
                        ? 'text-[#2d170e] border-b-2 border-[#361f14]'
                        : 'text-[#8b6a52] hover:text-[#2d170e]'
                    }`}
                  >
                    Analysis
                  </button>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`font-serif-custom text-[16px] font-bold pb-1 transition-all ${
                      activeTab === 'chat'
                        ? 'text-[#2d170e] border-b-2 border-[#361f14]'
                        : 'text-[#8b6a52] hover:text-[#2d170e]'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('gamePlan')}
                    className={`font-serif-custom text-[16px] font-bold pb-1 transition-all ${
                      activeTab === 'gamePlan'
                        ? 'text-[#2d170e] border-b-2 border-[#361f14]'
                        : 'text-[#8b6a52] hover:text-[#2d170e]'
                    }`}
                  >
                    Game Plan
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'analysis' && (
                  <div className="space-y-4">
                    {/* Coach quote card */}
                    <div className="flex items-start gap-3 bg-[#f7eedb] border border-[#dfc7a4] p-3 rounded-[6px]">
                      <div className="w-12 h-12 rounded-[5px] overflow-hidden border border-[#c49e6f] flex-shrink-0 relative">
                        <Image
                          src="/dr_wolf_portrait.jpg"
                          alt="Dr. Wolf"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <strong className="block font-serif-custom font-bold text-[14px] text-[#2d170e]">
                          Dr. Wolf
                        </strong>
                        <p className="font-serif-custom text-[13px] text-[#4d3222] leading-snug mt-0.5">
                          This move puts pressure on the center, develops your piece, and limits your
                          opponent&apos;s options. It&apos;s a good practical choice in this position.
                        </p>
                      </div>
                    </div>

                    {/* Feedback Items */}
                    <div className="space-y-3 pt-1">
                      {/* Good move */}
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#528236] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={12} className="text-white stroke-[3]" />
                        </div>
                        <div>
                          <strong className="block font-serif-custom font-bold text-[15px] text-[#2d170e]">
                            Good move
                          </strong>
                          <p className="font-serif-custom text-[13px] text-[#604230] leading-snug">
                            You&apos;re increasing control in the center and developing a piece.
                          </p>
                        </div>
                      </div>

                      {/* Things to watch */}
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#d69818] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Star size={12} className="text-white fill-white" />
                        </div>
                        <div>
                          <strong className="block font-serif-custom font-bold text-[15px] text-[#2d170e]">
                            Things to watch
                          </strong>
                          <p className="font-serif-custom text-[13px] text-[#604230] leading-snug">
                            Be aware of potential counterplay on the king side.
                          </p>
                        </div>
                      </div>

                      {/* Key idea */}
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-[#b3782b] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Lightbulb size={12} className="text-white" />
                        </div>
                        <div>
                          <strong className="block font-serif-custom font-bold text-[15px] text-[#2d170e]">
                            Key idea
                          </strong>
                          <p className="font-serif-custom text-[13px] text-[#604230] leading-snug">
                            You&apos;re following sound opening principles: develop, control the
                            center, and keep your king safe.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'chat' && (
                  <div className="space-y-3 py-2">
                    <p className="font-serif-custom text-[14px] text-[#4d3222]">
                      <strong>Learner:</strong> Should I prepare d4 next move?
                    </p>
                    <p className="font-serif-custom text-[14px] text-[#4d3222] bg-[#f7eedb] p-3 rounded border border-[#dfc7a4]">
                      <strong>Dr. Wolf:</strong> Yes, preparing d4 solidifies your center, but keep an
                      eye on black&apos;s bishop aiming toward your kingside.
                    </p>
                  </div>
                )}

                {activeTab === 'gamePlan' && (
                  <div className="space-y-2.5 py-2">
                    <div className="p-2.5 bg-[#f7eedb] border border-[#dfc7a4] rounded">
                      <strong className="block text-[14px] font-serif-custom text-[#2d170e]">
                        Short Term:
                      </strong>
                      <span className="text-[13px] font-serif-custom text-[#5e412f]">
                        Castle kingside and connect your rooks.
                      </span>
                    </div>
                    <div className="p-2.5 bg-[#f7eedb] border border-[#dfc7a4] rounded">
                      <strong className="block text-[14px] font-serif-custom text-[#2d170e]">
                        Long Term:
                      </strong>
                      <span className="text-[13px] font-serif-custom text-[#5e412f]">
                        Use your active minor pieces to exploit open files on the queenside.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section: "A coach that remembers the right things" */}
      <section id="about" className="py-14 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[760px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              A coach that remembers the right things
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              Dr. Wolf Brain goes beyond one-off analysis. It remembers what matters about your
              games and focuses on the ideas that will help you improve.
            </p>
          </div>

          {/* 6 Feature Cards (2 Rows of 3) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <Database size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Follows Your Journey
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Remembers your games, openings, preferences, and recurring themes so advice gets
                  more relevant over time.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <MessageSquare size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Explains Clearly
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Turns complex ideas into plain language you can actually use in your next game.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <BarChart3 size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Adapts to Your Level
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Adjusts explanations and training focus to your current strength and goals.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <Target size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Finds Key Patterns
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Spots recurring mistakes and missed opportunities.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <GitFork size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Suggests a Plan
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Gives practical next steps based on your games and goals.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div className="parchment-card p-6 flex items-start gap-4">
              <div className="w-11 h-11 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] flex-shrink-0">
                <TrendingUp size={22} />
              </div>
              <div>
                <h3 className="font-serif-custom font-bold text-[20px] text-[#2d170e] mb-1">
                  Supports Long-Term Growth
                </h3>
                <p className="font-serif-custom text-[14px] text-[#5e412f] leading-snug">
                  Helps you build better habits and a deeper understanding of chess.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: "FROM GAMES TO PERSONALIZED COACHING" */}
      <section id="how-it-works" className="py-14 sm:py-20 bg-[#edd7b2]/30 border-y border-[#d8c09a]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[820px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[28px] sm:text-[34px] font-bold text-[#2d170e] tracking-wide uppercase mb-3">
              FROM GAMES TO PERSONALIZED COACHING
            </h2>
            <p className="font-serif-custom text-[17px] sm:text-[19px] text-[#604230] leading-relaxed">
              Your games power a continuous learning loop. Play, get detailed analysis, and receive
              personalized coaching that adapts to your progress over time.
            </p>
          </div>

          {/* 5-Step Process Pipeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {/* Step 1 */}
            <div className="parchment-card p-4 sm:p-5 flex flex-col items-center text-center relative">
              <div className="w-11 h-11 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                <Gamepad2 size={22} />
              </div>
              <h3 className="font-serif-custom font-bold text-[17px] text-[#2d170e] mb-1.5">
                1. Play Games
              </h3>
              <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug">
                Play on the board and build your game history.
              </p>
              <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#b3782b]">
                <ArrowRight size={18} />
              </div>
            </div>

            {/* Step 2 */}
            <div className="parchment-card p-4 sm:p-5 flex flex-col items-center text-center relative">
              <div className="w-11 h-11 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                <Settings size={22} />
              </div>
              <h3 className="font-serif-custom font-bold text-[17px] text-[#2d170e] mb-1.5">
                2. Analyze
              </h3>
              <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug">
                Get detailed, easy to understand analysis.
              </p>
              <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#b3782b]">
                <ArrowRight size={18} />
              </div>
            </div>

            {/* Step 3 */}
            <div className="parchment-card p-4 sm:p-5 flex flex-col items-center text-center relative">
              <div className="w-11 h-11 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                <Brain size={22} />
              </div>
              <h3 className="font-serif-custom font-bold text-[17px] text-[#2d170e] mb-1.5">
                3. Learn & Adapt
              </h3>
              <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug">
                Your coach learns from your games and patterns.
              </p>
              <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#b3782b]">
                <ArrowRight size={18} />
              </div>
            </div>

            {/* Step 4 */}
            <div className="parchment-card p-4 sm:p-5 flex flex-col items-center text-center relative">
              <div className="w-11 h-11 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                <FileText size={22} />
              </div>
              <h3 className="font-serif-custom font-bold text-[17px] text-[#2d170e] mb-1.5">
                4. Personalized Coaching
              </h3>
              <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug">
                Get targeted guidance and training recommendations.
              </p>
              <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-[#b3782b]">
                <ArrowRight size={18} />
              </div>
            </div>

            {/* Step 5 */}
            <div className="parchment-card p-4 sm:p-5 flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-full bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                <BarChart3 size={22} />
              </div>
              <h3 className="font-serif-custom font-bold text-[17px] text-[#2d170e] mb-1.5">
                5. Improve Over Time
              </h3>
              <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug">
                Build better habits and a deeper understanding of chess.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section: "Built in the Open" */}
      <section id="docs" className="py-14 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-[760px] mx-auto mb-12">
            <h2 className="font-serif-custom text-[38px] sm:text-[46px] font-bold text-[#2d170e] leading-tight mb-3">
              Built in the Open
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#604230] leading-relaxed">
              Dr. Wolf Brain is being built transparently. Instead of invented social proof, this
              project shows its real thinking, architecture, and build process.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="parchment-card p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                  <FileText size={20} />
                </div>
                <h3 className="font-serif-custom font-bold text-[18px] text-[#2d170e] mb-2">
                  Public Build Log
                </h3>
                <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug mb-4">
                  Track the product decisions, trade-offs, and day-by-day progress.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="parchment-card p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                  <BookOpen size={20} />
                </div>
                <h3 className="font-serif-custom font-bold text-[18px] text-[#2d170e] mb-2">
                  Canonical PRD
                </h3>
                <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug mb-4">
                  The frozen product spec that defines what the coach should do and why.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="parchment-card p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                  <Code2 size={20} />
                </div>
                <h3 className="font-serif-custom font-bold text-[18px] text-[#2d170e] mb-2">
                  Engineering Build Spec
                </h3>
                <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug mb-4">
                  The implementation source of truth: schema, triggers, grading, and system boundaries.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="parchment-card p-5 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-[#faebd4] border border-[#d4bc96] flex items-center justify-center text-[#361f14] mb-3">
                  <Layers size={20} />
                </div>
                <h3 className="font-serif-custom font-bold text-[18px] text-[#2d170e] mb-2">
                  Architecture & Decisions
                </h3>
                <p className="font-serif-custom text-[13px] text-[#5e412f] leading-snug mb-4">
                  See the memory pipeline, evidence model, and key engineering choices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Bottom CTA Banner with Dr. Wolf Library Scene */}
      <section className="relative overflow-hidden bg-[#24140b] text-[#f7eed9] border-t border-[#442819]">
        {/* Background Image Container */}
        <div className="relative max-w-[1400px] mx-auto min-h-[420px] flex items-center">
          {/* Background image */}
          <div className="absolute inset-0 z-0 opacity-40 md:opacity-50">
            <Image
              src="/dr_wolf_footer_banner.jpg"
              alt="Dr. Wolf in his chess library study"
              fill
              className="object-cover object-left md:object-center"
            />
            {/* Gradient overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1c0e07] via-[#1c0e07]/80 to-[#1c0e07]/90 md:from-[#1c0e07]/60 md:via-[#1c0e07]/75 md:to-[#1c0e07]" />
          </div>

          {/* Banner Content */}
          <div className="relative z-10 max-w-[1240px] mx-auto px-4 sm:px-6 py-16 w-full flex flex-col md:items-center text-center">
            <h2 className="font-serif-custom text-[36px] sm:text-[48px] font-bold text-[#fcf3e1] leading-tight mb-3">
              Start Your Chess Learning Journey
            </h2>
            <p className="font-serif-custom text-[18px] sm:text-[20px] text-[#d6be9a] max-w-[640px] leading-relaxed mb-8">
              Play, get personalized guidance, and build a deeper understanding of chess with Dr.
              Wolf Brain.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#train"
                className="inline-flex items-center gap-2.5 bg-[#f5edd9] hover:bg-[#fff7e6] text-[#361f14] px-7 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold shadow-[0_4px_14px_rgba(0,0,0,0.35)] transition-all hover:translate-y-[-2px]"
              >
                <Play size={16} className="fill-[#361f14]" />
                <span>Try It Now</span>
              </a>
              <a
                href="#learn"
                className="inline-flex items-center gap-2 bg-[#2d180f]/70 hover:bg-[#2d180f] text-[#f7eed9] border border-[#a37c54] px-6 py-3.5 rounded-[6px] font-serif-custom text-[17px] font-bold transition-all hover:translate-y-[-2px]"
              >
                <span>Learn More</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
