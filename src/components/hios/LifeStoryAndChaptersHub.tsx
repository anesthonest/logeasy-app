import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Mail, BookOpen, ShieldCheck, Heart, Clock, Lock, 
  Send, Plus, Check, RefreshCw, Feather
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { LetterToSelf, ForgivenessEntry } from '../../core/database/hios_types';

interface LifeStoryAndChaptersHubProps {
  userId: string;
}

export default function LifeStoryAndChaptersHub({ userId }: LifeStoryAndChaptersHubProps) {
  const [activeTab, setActiveTab] = useState<'letters' | 'forgiveness'>('letters');
  const [letters, setLetters] = useState<LetterToSelf[]>([]);
  const [forgivenessEntries, setForgivenessEntries] = useState<ForgivenessEntry[]>([]);

  // Letter Form
  const [letterRecipientType, setLetterRecipientType] = useState<LetterToSelf['recipientType']>('future_self');
  const [letterTitle, setLetterTitle] = useState('');
  const [letterBody, setLetterBody] = useState('');
  const [unlockYear, setUnlockYear] = useState<number>(new Date().getFullYear() + 1);

  // Forgiveness Form
  const [fTargetType, setFTargetType] = useState<ForgivenessEntry['targetType']>('self');
  const [fSubject, setFSubject] = useState('');
  const [fNarrative, setFNarrative] = useState('');
  const [fLessons, setFLessons] = useState('');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const storedLetters = await localDB.getLettersToSelf(userId);
      if (storedLetters.length === 0) {
        const seedLetter: LetterToSelf = {
          id: 'let_1',
          userId,
          title: 'A Compassionate Note to My 18-Year-Old Self',
          recipientType: 'younger_self',
          content: 'You do not need to have everything figured out right now. The confusion you feel is just the soil where your future resilience is growing. Breathe, take long walks, and trust your quiet intuition.',
          targetAgeOrDate: 'Age 18',
          isEncrypted: false,
          isShared: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveLetterToSelf(seedLetter);
        setLetters([seedLetter]);
      } else {
        setLetters(storedLetters);
      }

      const storedF = await localDB.getForgivenessEntries(userId);
      if (storedF.length === 0) {
        const seedF: ForgivenessEntry = {
          id: 'forg_1',
          userId,
          targetType: 'self',
          subject: 'Releasing Regret Over Past Hesitation',
          narrative: 'Blaming myself for not pursuing a creative opportunity five years ago. I was making the safest decision with the limited emotional bandwidth I had then.',
          resentmentLevelBefore: 8,
          peaceLevelAfter: 2,
          lessonsLearned: 'I was making the safest decision with the limited emotional bandwidth I had then. I honor that younger person’s need for safety.',
          completed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveForgivenessEntry(seedF);
        setForgivenessEntries([seedF]);
      } else {
        setForgivenessEntries(storedF);
      }
    } catch (err) {
      console.error('Failed loading letters or forgiveness:', err);
    }
  };

  const handleSaveLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!letterBody.trim()) return;

    const newLetter: LetterToSelf = {
      id: `let_${Date.now()}`,
      userId,
      title: letterTitle.trim() || 'Letter to Self',
      recipientType: letterRecipientType,
      content: letterBody.trim(),
      targetAgeOrDate: `${unlockYear}-01-01`,
      isEncrypted: letterRecipientType === 'future_self',
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveLetterToSelf(newLetter);
    setLetterTitle('');
    setLetterBody('');
    await loadData();
  };

  const handleSaveForgiveness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fNarrative.trim()) return;

    const newF: ForgivenessEntry = {
      id: `forg_${Date.now()}`,
      userId,
      targetType: fTargetType,
      subject: fSubject.trim() || 'Unburdening Entry',
      narrative: fNarrative.trim(),
      resentmentLevelBefore: 7,
      peaceLevelAfter: 3,
      lessonsLearned: fLessons.trim(),
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveForgivenessEntry(newF);
    setFSubject('');
    setFNarrative('');
    setFLessons('');
    await loadData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 10 • Temporal Reflection</span>
            <span className="px-2 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-full font-semibold">Self Compassion</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Letters to Self & Forgiveness Sanctuary</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Write across time to your younger or future self, and process old resentments and regrets with unconditional gentleness.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('letters')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'letters' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Letters to Self</span>
          </button>
          <button
            onClick={() => setActiveTab('forgiveness')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'forgiveness' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>Forgiveness Engine</span>
          </button>
        </div>
      </div>

      {activeTab === 'letters' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Letter Writer Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Feather className="h-4 w-4" />
              <span>Compose Temporal Letter</span>
            </h3>

            <form onSubmit={handleSaveLetter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Letter Type</label>
                <select
                  value={letterRecipientType}
                  onChange={(e) => setLetterRecipientType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="younger_self">To My Younger Self</option>
                  <option value="future_self">To My Future Self (Sealed)</option>
                  <option value="unsent_letter">Unsent Letter (Safe catharsis)</option>
                  <option value="gratitude_letter">Gratitude Letter</option>
                  <option value="forgiveness_letter">Forgiveness Letter</option>
                  <option value="goodbye_letter">Peaceful Goodbye Letter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Remember who you are in hard times"
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {letterRecipientType === 'future_self' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Unlock In Year</label>
                  <input
                    type="number"
                    value={unlockYear}
                    onChange={(e) => setUnlockYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Letter Words</label>
                <textarea
                  rows={6}
                  placeholder="Pour your honest thoughts across time..."
                  value={letterBody}
                  onChange={(e) => setLetterBody(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Seal & Anchor Letter
              </button>
            </form>
          </div>

          {/* Letter list */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Anchored Letters ({letters.length})
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {letters.map(l => (
                <div key={l.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="uppercase text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                        {(l?.recipientType || 'letter').replace('_', ' ')}
                      </span>
                      {l.isEncrypted && (
                        <span className="text-amber-400 flex items-center gap-1 font-bold">
                          <Lock className="h-3 w-3" />
                          Sealed ({l.targetAgeOrDate})
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-white">{l.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {l.content}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 block">
                    Written {new Date(l.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Forgiveness Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span>Release Emotional Weight</span>
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Forgiveness is not excusing harm or reconciling with unsafe people. It is reclaiming your own peace and releasing poison from your heart.
            </p>

            <form onSubmit={handleSaveForgiveness} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Target of Forgiveness</label>
                <select
                  value={fTargetType}
                  onChange={(e) => setFTargetType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="self">Forgiving Myself</option>
                  <option value="other">Forgiving Someone Else</option>
                  <option value="past_circumstance">Forgiving a Past Circumstance / Fate</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  placeholder="e.g. Letting go of harsh self-judgment"
                  value={fSubject}
                  onChange={(e) => setFSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Narrative (What happened?)</label>
                <textarea
                  rows={3}
                  placeholder="State the situation honestly..."
                  value={fNarrative}
                  onChange={(e) => setFNarrative(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Gentle Perspective / Lessons Learned</label>
                <textarea
                  rows={2}
                  placeholder="What insight allows you to lay down this burden?"
                  value={fLessons}
                  onChange={(e) => setFLessons(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Record Forgiveness Entry
              </button>
            </form>
          </div>

          {/* Forgiveness List */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Forgiveness Sanctuary Entries ({forgivenessEntries.length})
            </span>

            <div className="space-y-4">
              {forgivenessEntries.map(f => (
                <div key={f.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-500/20">
                      Target: {f.targetType}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{f.subject}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{f.narrative}</p>

                  {f.lessonsLearned && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Insight of Peace:</span>
                      {f.lessonsLearned}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
