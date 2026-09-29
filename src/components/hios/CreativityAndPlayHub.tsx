import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Palette, Sparkles, Feather, Lightbulb, Music, 
  Smile, Plus, RefreshCw, Check, Heart
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { CreativityWork } from '../../core/database/hios_types';

interface CreativityAndPlayHubProps {
  userId: string;
}

export default function CreativityAndPlayHub({ userId }: CreativityAndPlayHubProps) {
  const [works, setWorks] = useState<CreativityWork[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CreativityWork['category']>('writing');
  const [content, setContent] = useState('');
  const [inspiration, setInspiration] = useState('');
  const [isProductivityFree, setIsProductivityFree] = useState(true);
  const [activePrompt, setActivePrompt] = useState(
    'Describe the physical room where your fondest memory lives, using all five senses.'
  );

  const creativePrompts = [
    'Describe the physical room where your fondest memory lives, using all five senses.',
    'Write a three-line poem about the sound of rain against glass at 2 AM.',
    'Imagine inventing a device that translates pet sighs into poetic verses.',
    'If today had a musical soundtrack, which three instruments would carry the melody?',
    'Write a letter from your future 80-year-old self thanking you for one small thing today.'
  ];

  useEffect(() => {
    loadWorks();
  }, [userId]);

  const loadWorks = async () => {
    try {
      const stored = await localDB.getCreativityWorks(userId);
      setWorks(stored.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Failed loading creativity works:', err);
    }
  };

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const work: CreativityWork = {
      id: `cw_${Date.now()}`,
      userId,
      title: title.trim() || 'Untitled Creative Expression',
      category,
      content: content.trim(),
      inspiration: inspiration.trim() || activePrompt,
      isProductivityFree,
      tags: [category, isProductivityFree ? 'pure_play' : 'project'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveCreativityWork(work);
    setTitle('');
    setContent('');
    setInspiration('');
    await loadWorks();
  };

  const cyclePrompt = () => {
    const next = creativePrompts[Math.floor(Math.random() * creativePrompts.length)];
    setActivePrompt(next);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest font-bold">Layer 7 • Playful Imagination</span>
            <span className="px-2 py-0.5 text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-full font-semibold">Zero Productivity Pressure</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Creativity & Playful Exploration</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Write, brainstorm, invent, and play simply because you love making things. No KPIs, no audience metrics, no deadlines.
          </p>
        </div>
      </div>

      {/* Creative Spark Generator Card */}
      <div className="p-5 rounded-3xl bg-purple-950/20 border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Creativity Agent Play Spark</span>
          </span>
          <p className="text-sm text-slate-200 font-medium italic">
            "{activePrompt}"
          </p>
        </div>

        <button
          onClick={cyclePrompt}
          className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>New Spark</span>
        </button>
      </div>

      {/* Editor & Vault Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creator Studio Form */}
        <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-purple-300 flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Create Freeform</span>
          </h3>

          <form onSubmit={handleSaveWork} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Whispers of the Pine Woods"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Medium</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value="writing">Prose / Freeform Writing</option>
                <option value="poetry">Poetry / Stanza</option>
                <option value="idea">Raw Concept / Invention</option>
                <option value="story">Micro Fiction / Story</option>
                <option value="music_concept">Melody / Lyric Thought</option>
                <option value="play_experiment">Playful Experiment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Creative Content</label>
              <textarea
                rows={5}
                placeholder="Pour your creative thoughts here without editing or self-censorship..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200">
              <Heart className="h-4 w-4 text-purple-400 shrink-0" />
              <span>Dedicated play zone: No output metrics will be tracked.</span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Anchor Creative Piece
            </button>
          </form>
        </div>

        {/* Gallery */}
        <div className="lg:col-span-2 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Creative Artifacts ({works.length})
          </span>

          {works.length === 0 ? (
            <div className="p-12 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500 space-y-2">
              <Feather className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-400">Your creative canvas is open</p>
              <p className="max-w-md mx-auto">Use the spark above or write freely. Nothing here is measured or evaluated.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {works.map(work => (
                <div key={work.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-purple-400">
                      <span className="uppercase bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/20">
                        {work.category}
                      </span>
                      <span className="text-slate-500">{new Date(work.createdAt).toLocaleDateString()}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{work.title}</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {work.content}
                    </p>
                  </div>

                  {work.inspiration && (
                    <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 italic">
                      Spark: "{work.inspiration.slice(0, 50)}..."
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
