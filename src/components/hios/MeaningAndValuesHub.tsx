import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Compass, Sun, Sparkles, HelpCircle, Heart, 
  Plus, Check, Flame, Smile, Award
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { MeaningEntry, JoySavoringEntry } from '../../core/database/hios_types';

interface MeaningAndValuesHubProps {
  userId: string;
}

export default function MeaningAndValuesHub({ userId }: MeaningAndValuesHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'meaning' | 'joy'>('meaning');
  const [meanings, setMeanings] = useState<MeaningEntry[]>([]);
  const [joyEntries, setJoyEntries] = useState<JoySavoringEntry[]>([]);

  // Meaning Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MeaningEntry['category']>('value');
  const [content, setContent] = useState('');
  const [reflection, setReflection] = useState('');

  // Joy Form
  const [joyTitle, setJoyTitle] = useState('');
  const [joyCategory, setJoyCategory] = useState<JoySavoringEntry['category']>('beauty');
  const [joyDetails, setJoyDetails] = useState('');
  const [savoringDepth, setSavoringDepth] = useState<number>(8);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const storedM = await localDB.getMeaningEntries(userId);
      if (storedM.length === 0) {
        const seed: MeaningEntry[] = [
          {
            id: 'm_1',
            userId,
            title: 'Radical Presence',
            category: 'value',
            content: 'Being wholly where I am, without escaping through distraction or rushing the next moment.',
            reflections: ['Notice how breath steadies attention during noisy meetings.'],
            questions: ['Where did I give my full attention today?'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'm_2',
            userId,
            title: 'Craftsmanship Over Expediency',
            category: 'philosophical_thought',
            content: 'Building tools and relationships with lasting care, honoring the human beings who will experience them.',
            reflections: ['Quality is a form of moral respect.'],
            questions: ['Did I build with integrity or haste today?'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        for (const s of seed) await localDB.saveMeaningEntry(s);
        setMeanings(seed);
      } else {
        setMeanings(storedM);
      }

      const storedJoy = await localDB.getJoySavoringEntries(userId);
      if (storedJoy.length === 0) {
        const seedJoy: JoySavoringEntry[] = [
          {
            id: 'joy_1',
            userId,
            title: 'Golden Sunlight on the Library Floor',
            category: 'beauty',
            details: 'The slanted 4 PM sunlight lit up old wooden bookshelves and quiet dust motes. A profound sense of peace washed over me.',
            savoringDepth: 9,
            createdAt: new Date().toISOString()
          },
          {
            id: 'joy_2',
            userId,
            title: 'Uncontrollable Laughter Over Misheard Lyrics',
            category: 'laughter',
            details: 'Shared belly laugh with friends in the car after butchering the chorus together.',
            savoringDepth: 8,
            createdAt: new Date().toISOString()
          }
        ];
        for (const sj of seedJoy) await localDB.saveJoySavoringEntry(sj);
        setJoyEntries(seedJoy);
      } else {
        setJoyEntries(storedJoy);
      }
    } catch (err) {
      console.error('Failed loading meaning data:', err);
    }
  };

  const handleSaveMeaning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const entry: MeaningEntry = {
      id: `m_${Date.now()}`,
      userId,
      title: title.trim() || 'Core Value / Reflection',
      category,
      content: content.trim(),
      reflections: reflection ? [reflection.trim()] : [],
      questions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveMeaningEntry(entry);
    setTitle('');
    setContent('');
    setReflection('');
    await loadData();
  };

  const handleSaveJoy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joyDetails.trim()) return;

    const entry: JoySavoringEntry = {
      id: `joy_${Date.now()}`,
      userId,
      title: joyTitle.trim() || 'Moment of Joy',
      category: joyCategory,
      details: joyDetails.trim(),
      savoringDepth,
      createdAt: new Date().toISOString()
    };

    await localDB.saveJoySavoringEntry(entry);
    setJoyTitle('');
    setJoyDetails('');
    await loadData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">Layer 8 • Existential Sanctuary</span>
            <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full font-semibold">User Defined</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Meaning, Values & Joy Savoring</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Ground yourself in your authentic values, spiritual practices, philosophical questions, and deep savoring of small joys.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('meaning')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'meaning' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Values & Meaning</span>
          </button>
          <button
            onClick={() => setActiveSubTab('joy')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'joy' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Joy & Savoring</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'meaning' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Compass className="h-4 w-4" />
              <span>Define Anchor Value</span>
            </h3>

            <form onSubmit={handleSaveMeaning} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Value / Belief Title</label>
                <input
                  type="text"
                  placeholder="e.g. Unwavering Kindness, Intellectual Honesty"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Dimension</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="value">Core Personal Value</option>
                  <option value="belief">Spiritual / Life Belief</option>
                  <option value="spiritual_practice">Spiritual / Mindful Practice</option>
                  <option value="philosophical_thought">Philosophical Thought</option>
                  <option value="purpose">Life Purpose / North Star</option>
                  <option value="existential_question">Living Question</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">What does this mean to you?</label>
                <textarea
                  rows={4}
                  placeholder="How does this belief guide your choices and relationships?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Practical Reflection</label>
                <input
                  type="text"
                  placeholder="How did I practice this recently?"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Anchor Value
              </button>
            </form>
          </div>

          {/* Meaning list */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Anchored Core Values & Philosophies ({meanings.length})
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meanings.map(m => (
                <div key={m.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-amber-400 uppercase bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/20">
                      {(m?.category || 'value').replace('_', ' ')}
                    </span>
                    <h4 className="text-sm font-bold text-white">{m.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{m.content}</p>
                  </div>

                  {m.reflections && m.reflections.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-amber-300">
                      💭 {m.reflections[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Joy Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span>Capture a Moment of Joy</span>
            </h3>

            <form onSubmit={handleSaveJoy} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Moment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Crisp autumn breeze at sunset"
                  value={joyTitle}
                  onChange={(e) => setJoyTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
                <select
                  value={joyCategory}
                  onChange={(e) => setJoyCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500"
                >
                  <option value="beauty">Natural / Visual Beauty</option>
                  <option value="laughter">Laughter / Humor</option>
                  <option value="small_win">Small Win / Micro-achievement</option>
                  <option value="connection">Human Connection / Warmth</option>
                  <option value="gratitude">Gratitude for the Present</option>
                  <option value="place">Beloved Place</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Savor the Detail</label>
                <textarea
                  rows={4}
                  placeholder="What made this moment delicious? Describe the sounds, smells, or feeling in your chest..."
                  value={joyDetails}
                  onChange={(e) => setJoyDetails(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>Savoring Depth</span>
                  <span className="text-rose-400">{savoringDepth} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={savoringDepth}
                  onChange={(e) => setSavoringDepth(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Savor This Moment
              </button>
            </form>
          </div>

          {/* Joy List */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Savoring Reservoir ({joyEntries.length})
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {joyEntries.map(j => (
                <div key={j.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-rose-400">
                      <span className="uppercase bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/20">
                        {j.category}
                      </span>
                      <span className="text-amber-400 font-bold">✨ Savoring: {j.savoringDepth}/10</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{j.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed italic">"{j.details}"</p>
                  </div>

                  <span className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 block">
                    {new Date(j.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
