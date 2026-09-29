import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Milestone, Calendar, Compass, Clock, Sparkles, Filter, 
  Plus, ChevronRight, Tag, BookOpen, Heart, Award, ArrowUpRight
} from 'lucide-react';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { LifeChapter } from '../../core/database/hios_types';
import { AIMemory } from '../../core/ai/ai_types';

interface LifeTimelineHubProps {
  userId: string;
  entries: LocalJournalEntry[];
}

export default function LifeTimelineHub({ userId, entries }: LifeTimelineHubProps) {
  const [chapters, setChapters] = useState<LifeChapter[]>([]);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [activeEra, setActiveEra] = useState<string>('all');
  const [showAddChapter, setShowAddChapter] = useState(false);

  // New chapter form
  const [newTitle, setNewTitle] = useState('');
  const [newEraCategory, setNewEraCategory] = useState<LifeChapter['eraCategory']>('career');
  const [newStartYear, setNewStartYear] = useState<number>(new Date().getFullYear());
  const [newSummary, setNewSummary] = useState('');
  const [newLessons, setNewLessons] = useState('');

  useEffect(() => {
    loadTimelineData();
  }, [userId]);

  const loadTimelineData = async () => {
    try {
      const storedChapters = await localDB.getLifeChapters(userId);
      if (storedChapters.length === 0) {
        // Seed initial foundational life chapters if empty
        const initialChapters: LifeChapter[] = [
          {
            id: 'chap_1',
            userId,
            title: 'Early Horizons & Discovery',
            eraCategory: 'childhood',
            startYear: 2005,
            endYear: 2017,
            summary: 'Formative years exploring books, curiosity for technology, and building foundational friendships.',
            keyMemories: ['First science fair project', 'Summer bicycle trips'],
            lessons: ['Curiosity unlocks deep learning', 'Family support grounds resilient effort'],
            keyPeople: ['Parents', 'Childhood friends'],
            narrativeContent: 'A season of wide curiosity, discovering an innate drive to create and observe.',
            isUserAuthored: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'chap_2',
            userId,
            title: 'Higher Learning & Independence',
            eraCategory: 'education',
            startYear: 2018,
            endYear: 2022,
            summary: 'University years, learning autonomy, overcoming academic challenges, and discovering deep personal ethics.',
            keyMemories: ['Late night study sessions', 'Independent living milestone'],
            lessons: ['Discipline creates freedom', 'Embrace constructive uncertainty'],
            keyPeople: ['Mentors', 'Study group peers'],
            narrativeContent: 'Testing independence, forging a personal philosophy of mindfulness and rigorous craftsmanship.',
            isUserAuthored: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'chap_3',
            userId,
            title: 'Building Mastery & Purpose',
            eraCategory: 'current',
            startYear: 2023,
            summary: 'Current life chapter focused on meaningful creative work, self-reflection, and authentic relationships.',
            keyMemories: ['Developing LogEasy mind sanctuary', 'Commitment to daily reflection'],
            lessons: ['Presence is the highest gift to oneself and loved ones', 'Consistent daily habits outpace occasional bursts'],
            keyPeople: ['Family', 'Close collaborators'],
            narrativeContent: 'The present moment: cultivating peace, purposeful contribution, and sovereign personal memory.',
            isUserAuthored: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        for (const c of initialChapters) {
          await localDB.saveLifeChapter(c);
        }
        setChapters(initialChapters);
      } else {
        setChapters(storedChapters);
      }

      const storedMems = await localDB.getAIMemories(userId);
      setMemories(storedMems);
    } catch (err) {
      console.error('Failed loading timeline:', err);
    }
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const chapter: LifeChapter = {
      id: `chap_${Date.now()}`,
      userId,
      title: newTitle.trim(),
      eraCategory: newEraCategory,
      startYear: Number(newStartYear),
      summary: newSummary.trim(),
      keyMemories: [],
      lessons: newLessons ? newLessons.split(',').map(s => s.trim()) : [],
      keyPeople: [],
      narrativeContent: newSummary.trim(),
      isUserAuthored: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveLifeChapter(chapter);
    setNewTitle('');
    setNewSummary('');
    setNewLessons('');
    setShowAddChapter(false);
    await loadTimelineData();
  };

  const filteredChapters = chapters
    .filter(c => activeEra === 'all' || c.eraCategory === activeEra)
    .sort((a, b) => a.startYear - b.startYear);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 5 • Life Timeline</span>
            <span className="px-2 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full font-semibold">Narrative Continuity</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Living Life Story Timeline</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Connect your life chapters, key milestones, turning points, and hard-won wisdom across time. Your life as a coherent, meaningful journey.
          </p>
        </div>

        <button
          onClick={() => setShowAddChapter(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs transition-all shadow-md self-start md:self-center cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Life Chapter</span>
        </button>
      </div>

      {/* Era filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Eras' },
          { id: 'childhood', label: 'Childhood & Youth' },
          { id: 'education', label: 'Education' },
          { id: 'career', label: 'Career & Work' },
          { id: 'turning_points', label: 'Turning Points' },
          { id: 'current', label: 'Current Era' },
          { id: 'future_vision', label: 'Future Vision' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveEra(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeEra === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chronological Timeline Track */}
      <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-indigo-500 before:to-slate-800">
        {filteredChapters.map((chap, idx) => (
          <motion.div
            key={chap.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="relative group"
          >
            {/* Timeline Marker Dot */}
            <div className="absolute -left-6 sm:-left-10 top-5 -translate-x-1/2 h-5 w-5 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-md shadow-cyan-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </div>

            {/* Chapter Card */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all space-y-4 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-0.5 rounded-lg">
                      {chap.startYear} {chap.endYear ? `– ${chap.endYear}` : '– Present'}
                    </span>
                    <span className="capitalize text-[11px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-md">
                      {(chap?.eraCategory || 'era').replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1.5">{chap.title}</h3>
                </div>

                <span className="text-[11px] text-slate-400 font-mono">
                  {chap.isUserAuthored ? '• User Authored Fact' : '• Synthesized Narrative'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {chap.summary}
              </p>

              {/* Key Lessons Extracted */}
              {chap.lessons && chap.lessons.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5" />
                    <span>Hard-Won Life Lessons From This Chapter</span>
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {chap.lessons.map((lesson, i) => (
                      <span key={i} className="text-xs text-slate-200 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-xl">
                        💡 {lesson}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Narrative Content */}
              {chap.narrativeContent && chap.narrativeContent !== chap.summary && (
                <div className="text-xs text-slate-400 italic pt-1 border-t border-slate-800/50">
                  "{chap.narrativeContent}"
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Chapter Modal */}
      {showAddChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add a Life Chapter</h3>
            <form onSubmit={handleSaveChapter} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Chapter Title</label>
                <input
                  type="text"
                  placeholder="e.g., Starting My Apprenticeship in Zurich"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Era Category</label>
                  <select
                    value={newEraCategory}
                    onChange={(e) => setNewEraCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="childhood">Childhood</option>
                    <option value="adolescence">Adolescence</option>
                    <option value="education">Education</option>
                    <option value="career">Career</option>
                    <option value="relationships">Relationships</option>
                    <option value="achievements">Achievements</option>
                    <option value="turning_points">Turning Point</option>
                    <option value="difficult_period">Difficult Period</option>
                    <option value="current">Current</option>
                    <option value="future_vision">Future Vision</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Year</label>
                  <input
                    type="number"
                    value={newStartYear}
                    onChange={(e) => setNewStartYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Chapter Summary</label>
                <textarea
                  rows={3}
                  placeholder="What defined this chapter of your life?"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Key Lessons (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Patience with growth, True friends show up in silence"
                  value={newLessons}
                  onChange={(e) => setNewLessons(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddChapter(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
