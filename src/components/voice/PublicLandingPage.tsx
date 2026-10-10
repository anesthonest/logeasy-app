import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Mic, Sparkles, Shield, Wifi, Lock, Heart, Check, ArrowRight,
  Compass, Clock, Database, ChevronRight, Star, HelpCircle,
  Award, Zap, FileText, Download, Users, RefreshCw, EyeOff
} from 'lucide-react';
import { demoModeService } from '../../core/demo/demo_mode_service';
import { productAnalytics } from '../../core/analytics/product_analytics';

interface PublicLandingPageProps {
  onEnterApp: () => void;
  onLaunchDemo: () => void;
}

export default function PublicLandingPage({ onEnterApp, onLaunchDemo }: PublicLandingPageProps) {
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  const handleStartDemo = () => {
    demoModeService.enableDemoMode();
    productAnalytics.trackAction('landing_demo_cta_clicked', 'growth');
    onLaunchDemo();
  };

  const handleOpenVault = () => {
    productAnalytics.trackAction('landing_open_vault_clicked', 'growth');
    onEnterApp();
  };

  const FAQS = [
    {
      q: 'What is LogEasy and how is it different from a notes app?',
      a: 'Traditional notes apps are passive repositories where memories get buried in a list. LogEasy is a Personal Human Intelligence Operating System: as you capture spoken and written reflections, it incrementally builds your Personal Life Model — recognizing emotional cycles, connecting people to decisions, and resurfacing past wisdom without judgment.'
    },
    {
      q: 'Where is my voice and transcript data stored?',
      a: '100% on your device by default, secured with AES-256 symmetrical encryption inside browser IndexedDB. Your speech is transcribed locally via browser speech APIs and WebAssembly Whisper models. Your voice is never sold or used to train global advertising models.'
    },
    {
      q: 'Does LogEasy use punitive streaks to force daily usage?',
      a: 'Never. Human life is cyclical — with seasons of intense expression and seasons of quiet rest. LogEasy replaces streak anxiety with Gentle Continuity and soft consistency. Missing three days will never reset a badge or send guilt-inducing notifications.'
    },
    {
      q: 'Can I export my entire vault if I ever choose to leave?',
      a: 'Yes, anytime with one click. Through the My Life Archive hub, you can export your entire history in standardized JSON and audio files. We believe data sovereignty is a fundamental human right: you own your memories, unconditionally.'
    },
    {
      q: 'How does the free tier compare to premium?',
      a: 'Free Standard includes unlimited on-device voice recording, AES-256 encrypted local storage, basic search, and local insights forever. Premium adds deep longitudinal Life Model synthesis, multi-device encrypted sync, and extended archival audio features.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-gray-100 flex flex-col font-sans selection:bg-cyan-500/30">
      
      {/* 1. TOP NAV */}
      <header className="sticky top-0 z-40 border-b border-gray-800/80 bg-[#070b14]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-950/40">
            <Mic className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black tracking-tight text-white">LogEasy</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-bold">
              PUBLIC BETA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleStartDemo}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 hover:bg-gray-900/60 transition-all cursor-pointer"
          >
            <span>Explore Demo</span>
          </button>

          <button
            onClick={handleOpenVault}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-950/40 transition-all cursor-pointer"
          >
            <span>Enter My Vault</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="px-6 pt-16 pb-20 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 text-xs font-medium shadow-inner">
          <Shield className="h-3.5 w-3.5 text-cyan-400" />
          <span>Your Life Remembered With Care. Private. Permanent. Warm.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
          The Personal Human Intelligence Operating System
        </h1>

        <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Speak your daily thoughts without anxiety. LogEasy securely encrypts your spoken memories on-device, uncovers longitudinal patterns, and builds a living model of your life that you control.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={handleOpenVault}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-cyan-950/40 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>Open Private Vault</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            onClick={handleStartDemo}
            className="w-full sm:w-auto px-8 py-4 bg-gray-900/80 hover:bg-gray-800 border border-gray-700/80 text-gray-200 hover:text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Explore Interactive Demo</span>
            <Sparkles className="h-4 w-4 text-cyan-400" />
          </button>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 text-left">
          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
              <Lock className="h-3.5 w-3.5" /> 100% On-Device
            </div>
            <p className="text-[11px] text-gray-400">AES-256 encryption protects your private vault.</p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
              <Wifi className="h-3.5 w-3.5" /> Offline-First
            </div>
            <p className="text-[11px] text-gray-400">Record voice anywhere with zero network dependency.</p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
              <Heart className="h-3.5 w-3.5" /> Soft Consistency
            </div>
            <p className="text-[11px] text-gray-400">Gentle continuity without punitive streak anxiety.</p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
              <EyeOff className="h-3.5 w-3.5" /> Zero Ad Profiling
            </div>
            <p className="text-[11px] text-gray-400">Your thoughts are never sold to advertisers.</p>
          </div>
        </div>
      </section>

      {/* 3. THE SIMPLE PRODUCT STORY (CONCEPTUAL BACKBONE) */}
      <section className="px-6 py-20 bg-gradient-to-b from-[#090f1d] via-[#0b1326] to-[#070b14] border-y border-gray-800/60">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">The Core Narrative</span>
            <h2 className="text-3xl font-black text-white">How Your Life Model Grows With You</h2>
            <p className="text-xs text-gray-400 max-w-lg mx-auto">
              Not a disorganized notes graveyard. A living, reflective architecture that deepens over time.
            </p>
          </div>

          {/* Step Sequence Flow */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center text-center">
            {[
              { step: '1', title: 'Your Life Happens', desc: 'Days, thoughts, and conversations unfold.' },
              { step: '2', title: 'You Capture It', desc: 'Speak naturally into your device.' },
              { step: '3', title: 'LogEasy Remembers', desc: 'Encrypted into your on-device vault.' },
              { step: '4', title: 'Connects Insights', desc: 'Uncovers longitudinal life links.' },
              { step: '5', title: 'Helps Understand', desc: 'Emotional cycles and patterns become clear.' },
              { step: '6', title: 'You Decide', desc: 'You retain full agency and control.' },
              { step: '7', title: 'Model Grows', desc: 'Wisdom compounds over years.' },
            ].map((item, idx) => (
              <React.Fragment key={idx}>
                <div className="p-4 rounded-2xl bg-[#0e172d] border border-cyan-900/40 flex flex-col items-center justify-between min-h-[140px] space-y-2">
                  <div className="h-6 w-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center font-mono">
                    {item.step}
                  </div>
                  <div className="text-xs font-bold text-white">{item.title}</div>
                  <p className="text-[10px] text-gray-400 leading-tight">{item.desc}</p>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRANSPARENT PRICING */}
      <section className="px-6 py-20 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">Simple, Honest Pricing</span>
          <h2 className="text-3xl font-black text-white">Choose Your Level of Sanctuary</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            No artificial feature walls. 14-day money-back guarantee on all paid plans.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Plan 1: Free Standard */}
          <div className="p-6 rounded-3xl bg-gray-900/40 border border-gray-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Free Standard</h3>
                <p className="text-xs text-gray-400">Casual local voice journaling</p>
              </div>
              <div className="text-3xl font-black text-white">$0 <span className="text-xs text-gray-400 font-normal">/ forever</span></div>

              <ul className="space-y-2.5 pt-2 text-xs text-gray-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Unlimited voice recordings</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> AES-256 encrypted local vault</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Full offline recording & speech</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Export entire history anytime</li>
              </ul>
            </div>

            <button
              onClick={handleOpenVault}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Start Free Today
            </button>
          </div>

          {/* Plan 2: Premium */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-[#111e3b] to-[#0d162b] border border-cyan-500/50 shadow-xl shadow-cyan-950/30 flex flex-col justify-between space-y-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-black font-bold text-[10px] uppercase tracking-wider">
              Most Popular
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Premium Sanctuary</h3>
                <p className="text-xs text-cyan-300">Deep Personal Life Model synthesis</p>
              </div>
              <div className="text-3xl font-black text-white">$9.99 <span className="text-xs text-gray-400 font-normal">/ month</span></div>

              <ul className="space-y-2.5 pt-2 text-xs text-gray-200">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Everything in Free</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Intelligent Connection Engine</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Longitudinal Life Patterns & Trends</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Multi-device encrypted sync</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Weekly Life Mosaic synthesis</li>
              </ul>
            </div>

            <button
              onClick={handleOpenVault}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              Upgrade to Premium
            </button>
          </div>

          {/* Plan 3: Lifetime Founder */}
          <div className="p-6 rounded-3xl bg-gray-900/40 border border-gray-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Lifetime Founder</h3>
                <p className="text-xs text-gray-400">One-time payment, perpetual access</p>
              </div>
              <div className="text-3xl font-black text-white">$199 <span className="text-xs text-gray-400 font-normal">/ one-time</span></div>

              <ul className="space-y-2.5 pt-2 text-xs text-gray-300">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> All current & future Premium features</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Zero subscription renewal fees</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> Founder's Archive Badge & Priority Support</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-400" /> 14-day risk-free refund policy</li>
              </ul>
            </div>

            <button
              onClick={handleOpenVault}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Claim Lifetime License
            </button>
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section className="px-6 py-20 bg-gray-950/40 border-t border-gray-800/80">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">Frequently Answered Questions</h2>
            <p className="text-xs text-gray-400">Everything you need to know about privacy, storage, and LogEasy's philosophy.</p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-gray-900/50 border border-gray-800/80 space-y-2"
              >
                <button
                  onClick={() => setSelectedFaq(selectedFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between text-left text-xs font-bold text-white cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${selectedFaq === idx ? 'rotate-90 text-cyan-400' : ''}`} />
                </button>
                {selectedFaq === idx && (
                  <p className="text-xs text-gray-300 leading-relaxed pt-2 border-t border-gray-800/60">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="mt-auto border-t border-gray-800/80 px-6 py-8 text-center text-xs text-gray-400 space-y-2">
        <div className="flex items-center justify-center gap-4 text-xs font-medium text-gray-400">
          <button onClick={handleOpenVault} className="hover:text-cyan-400 cursor-pointer">Launch App</button>
          <span>•</span>
          <button onClick={handleStartDemo} className="hover:text-cyan-400 cursor-pointer">Sample Demo</button>
          <span>•</span>
          <span>Zero Ad Surveillance</span>
          <span>•</span>
          <span>GDPR & CCPA Native</span>
        </div>
        <p className="text-[11px] text-gray-400">
          LogEasy Personal Human Intelligence Operating System. Your life remembered with care.
        </p>
      </footer>
    </div>
  );
}
