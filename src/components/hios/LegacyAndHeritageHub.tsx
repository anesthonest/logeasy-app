import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Key, Globe, Scroll, Shield, Lock, Plus, 
  Sparkles, BookOpen, Clock, Heart
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { LegacyItem, HeritageEntry } from '../../core/database/hios_types';

interface LegacyAndHeritageHubProps {
  userId: string;
}

export default function LegacyAndHeritageHub({ userId }: LegacyAndHeritageHubProps) {
  const [activeTab, setActiveTab] = useState<'legacy' | 'heritage'>('legacy');
  const [legacyItems, setLegacyItems] = useState<LegacyItem[]>([]);
  const [heritageEntries, setHeritageEntries] = useState<HeritageEntry[]>([]);

  // Legacy form
  const [legTitle, setLegTitle] = useState('');
  const [legCategory, setLegCategory] = useState<LegacyItem['category']>('life_lesson');
  const [legContent, setLegContent] = useState('');
  const [legRecipients, setLegRecipients] = useState('');
  const [legPolicy, setLegPolicy] = useState<LegacyItem['accessPolicy']>('immediate');

  // Heritage form
  const [herTitle, setHerTitle] = useState('');
  const [herCategory, setHerCategory] = useState<HeritageEntry['category']>('tradition');
  const [herOrigin, setHerOrigin] = useState('');
  const [herContent, setHerContent] = useState('');
  const [herGenerations, setHerGenerations] = useState('1');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const storedLeg = await localDB.getLegacyItems(userId);
      if (storedLeg.length === 0) {
        const seedLeg: LegacyItem = {
          id: 'leg_1',
          userId,
          title: 'Ethical Will & Living Principles to Pass Down',
          category: 'life_lesson',
          content: 'Do not measure your worth by the accolades of crowds who do not know your name in sorrow. Love deeply, honor truth, and protect the quiet integrity of your mind.',
          designatedRecipients: ['My Children', 'Loved Ones'],
          accessPolicy: 'immediate',
          isCryptographicallyLocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveLegacyItem(seedLeg);
        setLegacyItems([seedLeg]);
      } else {
        setLegacyItems(storedLeg);
      }

      const storedHer = await localDB.getHeritageEntries(userId);
      if (storedHer.length === 0) {
        const seedHer: HeritageEntry = {
          id: 'her_1',
          userId,
          title: 'Sunday Bread Baking Tradition',
          category: 'recipe',
          originPlace: 'Family Tradition',
          content: 'Slow kneading with stoneground flour and sourdough starter passed down for three generations. It represents gathering in warmth and sharing sustenance with patience.',
          generationsPassed: 3,
          tags: ['tradition', 'food', 'family'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveHeritageEntry(seedHer);
        setHeritageEntries([seedHer]);
      } else {
        setHeritageEntries(storedHer);
      }
    } catch (err) {
      console.error('Failed loading legacy and heritage:', err);
    }
  };

  const handleSaveLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legContent.trim()) return;

    const item: LegacyItem = {
      id: `leg_${Date.now()}`,
      userId,
      title: legTitle.trim() || 'Legacy Document',
      category: legCategory,
      content: legContent.trim(),
      designatedRecipients: legRecipients ? legRecipients.split(',').map(s => s.trim()) : [],
      accessPolicy: legPolicy,
      isCryptographicallyLocked: legPolicy !== 'immediate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveLegacyItem(item);
    setLegTitle('');
    setLegContent('');
    setLegRecipients('');
    await loadData();
  };

  const handleSaveHeritage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!herContent.trim()) return;

    const item: HeritageEntry = {
      id: `her_${Date.now()}`,
      userId,
      title: herTitle.trim() || 'Heritage Memory',
      category: herCategory,
      originPlace: herOrigin.trim() || 'Heritage',
      content: herContent.trim(),
      generationsPassed: parseInt(herGenerations, 10) || 1,
      tags: ['heritage'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveHeritageEntry(item);
    setHerTitle('');
    setHerOrigin('');
    setHerContent('');
    setHerGenerations('');
    await loadData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">Layer 11 • Enduring Heritage</span>
            <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full font-semibold">Generational Permanence</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Legacy, Mortality & Ancestral Heritage</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Preserve your ethical will, messages to future generations, cultural recipes, stories, and sacred ancestral traditions for decades to come.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('legacy')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'legacy' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scroll className="h-3.5 w-3.5" />
            <span>Legacy & Ethical Will</span>
          </button>
          <button
            onClick={() => setActiveTab('heritage')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'heritage' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Culture & Heritage</span>
          </button>
        </div>
      </div>

      {activeTab === 'legacy' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Scroll className="h-4 w-4" />
              <span>Record Legacy Testament</span>
            </h3>

            <form onSubmit={handleSaveLegacy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="e.g. Letter of Guidance for My Children"
                  value={legTitle}
                  onChange={(e) => setLegTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Legacy Category</label>
                <select
                  value={legCategory}
                  onChange={(e) => setLegCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="life_lesson">Life Lesson / Ethical Will</option>
                  <option value="message">Personal Life Message</option>
                  <option value="family_history">Family History Record</option>
                  <option value="core_value">Core Values & Guidance</option>
                  <option value="instruction">Instructions for What to Preserve</option>
                  <option value="future_message">Future Milestone Message</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Intended Recipients (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. My Children, Next Generation"
                  value={legRecipients}
                  onChange={(e) => setLegRecipients(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Access Policy</label>
                <select
                  value={legPolicy}
                  onChange={(e) => setLegPolicy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="immediate">Immediate Access</option>
                  <option value="future_date">Future Date Lock</option>
                  <option value="explicit_authorization">Explicit Authorization</option>
                  <option value="trusted_delegate">Trusted Delegate Release</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Legacy Words</label>
                <textarea
                  rows={5}
                  placeholder="What wisdom, love, or instructions do you wish to endure?"
                  value={legContent}
                  onChange={(e) => setLegContent(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Anchor Legacy Item
              </button>
            </form>
          </div>

          {/* List */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Permanent Legacy Archive ({legacyItems.length})
            </span>

            <div className="space-y-4">
              {legacyItems.map(item => (
                <div key={item.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/20">
                      {(item?.category || 'legacy').replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>

                  <h4 className="text-base font-bold text-white">{item.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{item.content}</p>

                  {item.designatedRecipients && item.designatedRecipients.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-xs text-amber-300/80">
                      <Heart className="h-3.5 w-3.5" />
                      <span>Intended for: {item.designatedRecipients.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heritage Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>Record Cultural Heritage</span>
            </h3>

            <form onSubmit={handleSaveHeritage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Winter Solstice Stew Recipe"
                  value={herTitle}
                  onChange={(e) => setHerTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={herCategory}
                    onChange={(e) => setHerCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="tradition">Tradition / Ritual</option>
                    <option value="recipe">Family Recipe</option>
                    <option value="song_saying">Proverb / Song / Saying</option>
                    <option value="language_phrase">Language / Dialect</option>
                    <option value="family_story">Ancestral Story</option>
                    <option value="historical_note">Historical Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Culture / Origin Place</label>
                  <input
                    type="text"
                    placeholder="e.g. Mediterranean, Gaelic"
                    value={herOrigin}
                    onChange={(e) => setHerOrigin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Generations Passed Down</label>
                <input
                  type="number"
                  placeholder="e.g. 3"
                  value={herGenerations}
                  onChange={(e) => setHerGenerations(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Details / Recipe / Story</label>
                <textarea
                  rows={5}
                  placeholder="Describe the tradition, steps, meaning, or stories behind it..."
                  value={herContent}
                  onChange={(e) => setHerContent(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Preserve Heritage
              </button>
            </form>
          </div>

          {/* Heritage List */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Ancestral & Cultural Vault ({heritageEntries.length})
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {heritageEntries.map(h => (
                <div key={h.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="uppercase text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                        {h.category}
                      </span>
                      <span className="text-slate-500">{h.originPlace}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{h.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{h.content}</p>
                  </div>

                  {h.generationsPassed > 0 && (
                    <span className="text-[11px] text-cyan-300/80 italic pt-2 border-t border-slate-800/60 block">
                      Generations preserved: {h.generationsPassed}
                    </span>
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
