import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Sparkles, Shield, Wifi, ChevronRight, Check } from 'lucide-react';

interface OnboardingWizardProps {
  onClose: () => void;
}

export default function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: '🎙️ Speak Naturally',
      desc: 'No more typing long paragraphs. Tap the microphone and capture your daily spoken thoughts. Your speech is transcribed locally, fast, and safely.',
      icon: Mic,
      color: 'from-cyan-500 to-blue-500',
    },
    {
      title: '🧠 AI Cognitive Insights',
      desc: 'Discover deep emotional trends, habit compliance stats, and life-balance matrices extracted securely from your spoken reflections.',
      icon: Sparkles,
      color: 'from-indigo-500 to-purple-500',
    },
    {
      title: '🔒 Absolute Private Vault',
      desc: 'All thoughts are secured on-device with AES symmetrical database encryption. Your private data never leaves your device unless you choose to sync.',
      icon: Shield,
      color: 'from-emerald-500 to-teal-500',
    },
    {
      title: '✈️ Offline Synchronization',
      desc: 'Record voice journals anywhere—even deep in the mountains. Everything caches inside your offline database and synchronizes once back online.',
      icon: Wifi,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: '🗺️ Seamless Navigation',
      desc: "Explore your digital mind palace with exactly five streamlined sections: Home, Spoken Journal, Intelligence Insights, Reflection Coach, and Private Profile.",
      icon: Sparkles,
      color: 'from-fuchsia-500 to-pink-500',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      localStorage.setItem('logeasy_onboarded', 'true');
      onClose();
    }
  };

  const handleSkip = () => {
    localStorage.setItem('logeasy_onboarded', 'true');
    onClose();
  };

  const activeSlide = slides[currentSlide];
  const Icon = activeSlide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg overflow-hidden bg-[#0d1222] border border-gray-800 rounded-3xl shadow-2xl flex flex-col"
      >
        {/* Banner with gradient */}
        <div className={`p-8 bg-gradient-to-br ${activeSlide.color} text-white flex flex-col items-center text-center space-y-4 relative transition-all duration-300`}>
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-xs font-semibold bg-black/25 hover:bg-black/40 text-gray-200 px-3 py-1.5 rounded-full transition-all"
          >
            Skip
          </button>
          
          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg mt-4">
            <Icon className="h-10 w-10 text-white animate-bounce" />
          </div>
          
          <h2 className="text-2xl font-black tracking-tight">{activeSlide.title}</h2>
        </div>

        {/* Content */}
        <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
          <p className="text-sm text-gray-300 leading-relaxed text-center">
            {activeSlide.desc}
          </p>

          {/* Indicators */}
          <div className="flex justify-center gap-1.5">
            {slides.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentSlide ? 'w-6 bg-cyan-500' : 'w-2 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => currentSlide > 0 && setCurrentSlide(currentSlide - 1)}
              className={`text-xs font-bold text-gray-400 hover:text-white px-4 py-2 rounded-xl transition-all ${
                currentSlide === 0 ? 'opacity-0 pointer-events-none' : ''
              }`}
            >
              Previous
            </button>

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-6 py-3 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-950/20 transition-all cursor-pointer"
            >
              <span>{currentSlide === slides.length - 1 ? 'Start Journaling' : 'Next Step'}</span>
              {currentSlide === slides.length - 1 ? (
                <Check className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
