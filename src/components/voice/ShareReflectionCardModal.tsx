import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Share2, Copy, Check, X, Sparkles, Heart, Shield,
  Download, QrCode, ArrowRight, MessageSquare
} from 'lucide-react';
import { referralGrowthEngine, ShareableReflectionCard } from '../../core/growth/referral_growth_engine';
import { LocalJournalEntry } from '../../core/database/local_db';

interface ShareReflectionCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry?: LocalJournalEntry | null;
  userId: string;
}

export default function ShareReflectionCardModal({
  isOpen,
  onClose,
  entry,
  userId,
}: ShareReflectionCardModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);

  if (!isOpen) return null;

  const inviteLink = referralGrowthEngine.getInviteLink(userId);
  const referralCode = referralGrowthEngine.getUserReferralCode(userId);

  const cardData: ShareableReflectionCard = entry
    ? referralGrowthEngine.generateShareableQuote(
        entry.transcript,
        entry.title || (entry.categories && entry.categories[0]) || 'Reflection',
        entry.moodLabel
      )
    : {
        quote: '“Speaking my thoughts without judgment gave me the clarity I could not find in noise.”',
        theme: 'Quiet Clarity',
        moodLabel: 'Centered',
        dateStr: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        authorLabel: 'My Private Reflection',
        isWatermarked: true,
      };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    referralGrowthEngine.trackInviteSent(userId);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyQuote = () => {
    navigator.clipboard.writeText(`${cardData.quote}\n\n— LogEasy Sanctuary`);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#0b1222] border border-cyan-900/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 bg-[#0e172a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Share Sanctuary Invite & Quote</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Visual Reflection Card Preview */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121c38] via-[#0d152a] to-[#0a1020] border border-cyan-800/40 shadow-inner space-y-4">
            <div className="flex items-center justify-between text-xs text-cyan-300">
              <span className="font-mono uppercase tracking-wider text-[10px] font-bold">
                {cardData.theme}
              </span>
              <span className="text-[10px] text-gray-400">{cardData.dateStr}</span>
            </div>

            <p className="text-sm text-gray-100 font-serif italic leading-relaxed">
              {cardData.quote}
            </p>

            <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
              <span>{cardData.authorLabel}</span>
              <span className="font-mono text-cyan-400/90 text-[10px] font-bold">
                LogEasy Sanctuary
              </span>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-200">
            <Shield className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
            <span className="text-[11px]">
              Strict Privacy: Only the excerpt above is shareable. Your full raw audio and private journal notes remain completely encrypted on your device.
            </span>
          </div>

          {/* Personal Referral Link */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 block">
              Your Personal Invitation Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-[10px] text-gray-400 flex items-center justify-between">
              <span>Invite Code: <strong className="text-cyan-400 font-mono">{referralCode}</strong></span>
              <span>14 bonus days granted to you and your invitee upon activation</span>
            </div>
          </div>

          {/* Copy Quote Button */}
          <button
            onClick={handleCopyQuote}
            className="w-full py-2.5 rounded-xl border border-gray-700/80 hover:bg-gray-800 text-xs text-gray-300 hover:text-white font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {copiedQuote ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedQuote ? 'Quote Copied to Clipboard!' : 'Copy Quote Text for Sharing'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
