import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  HeartHandshake, Heart, Calendar, Feather, Plus, 
  Sparkles, Star, Shield, Clock, BookOpen
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { GriefEntry } from '../../core/database/hios_types';

interface GriefAndLossHubProps {
  userId: string;
}

export default function GriefAndLossHub({ userId }: GriefAndLossHubProps) {
  const [entries, setEntries] = useState<GriefEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [honoredPerson, setHonoredPerson] = useState('');
  const [relationship, setRelationship] = useState('');
  const [memorialDate, setMemorialDate] = useState('');
  const [memories, setMemories] = useState('');
  const [lessons, setLessons] = useState('');
  const [wishICouldSay, setWishICouldSay] = useState('');

  useEffect(() => {
    loadGriefEntries();
  }, [userId]);

  const loadGriefEntries = async () => {
    try {
      const stored = await localDB.getGriefEntries(userId);
      if (stored.length === 0) {
        const seedGrief: GriefEntry = {
          id: 'grief_1',
          userId,
          honoredPerson: 'Grandmother Alice',
          relationship: 'Grandmother & Guardian',
          memories: [
            'Baking warm cardamon bread on Saturday mornings.',
            'Her steady, calming hand on my shoulder whenever I felt overwhelmed.'
          ],
          stories: [],
          whatTheyTaughtMe: [
            'Patience with other people’s sorrow.',
            'A warm bowl of soup and a listening ear cure more trouble than clever words.'
          ],
          thingsIWishICouldSay: 'I finished that project we dreamed about. I felt you with me the whole time.',
          memorialDateReminders: ['1932-04-12 to 2019-11-04'],
          isPrivate: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveGriefEntry(seedGrief);
        setEntries([seedGrief]);
      } else {
        setEntries(stored);
      }
    } catch (err) {
      console.error('Failed loading grief entries:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!honoredPerson.trim()) return;

    const newEntry: GriefEntry = {
      id: `grief_${Date.now()}`,
      userId,
      honoredPerson: honoredPerson.trim(),
      relationship: relationship.trim(),
      memories: memories ? memories.split('\n').map(s => s.trim()).filter(Boolean) : [],
      stories: [],
      whatTheyTaughtMe: lessons ? lessons.split('\n').map(s => s.trim()).filter(Boolean) : [],
      thingsIWishICouldSay: wishICouldSay.trim(),
      memorialDateReminders: memorialDate.trim() ? [memorialDate.trim()] : [],
      isPrivate: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.saveGriefEntry(newEntry);
    setHonoredPerson('');
    setRelationship('');
    setMemorialDate('');
    setMemories('');
    setLessons('');
    setWishICouldSay('');
    setShowAddModal(false);
    await loadGriefEntries();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-teal-400 uppercase tracking-widest font-bold">Layer 9 • Sacred Memory Sanctuary</span>
            <span className="px-2 py-0.5 text-[10px] bg-teal-500/10 text-teal-300 border border-teal-500/20 rounded-full font-semibold">Gentle & Unrushed</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Grief, Loss & Sacred Memorial</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            A quiet, compassionate space for remembering those you love and miss. No timeline pressure, no toxic positivity. Hold their memory with tenderness and permanence.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl text-xs transition-all shadow-md self-start md:self-center cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Honor a Loved One</span>
        </button>
      </div>

      {/* Philosophy Callout */}
      <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/20 text-xs text-slate-300 leading-relaxed flex items-center gap-3">
        <HeartHandshake className="h-5 w-5 text-teal-400 shrink-0" />
        <span>
          Grief is love with nowhere to go. Here, your memories, tears, and continuing bonds have a safe, quiet home that will never be judged or rushed.
        </span>
      </div>

      {/* Memorial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {entries.map(entry => (
          <div key={entry.id} className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Star className="h-4 w-4 text-teal-400 fill-teal-400/20" />
                  <span>{entry.honoredPerson}</span>
                </h3>
                <span className="text-xs text-teal-300/80 font-medium">{entry.relationship}</span>
              </div>
              {entry.memorialDateReminders.length > 0 && (
                <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  {entry.memorialDateReminders[0]}
                </span>
              )}
            </div>

            {/* Comforting Memories */}
            {entry.memories.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Treasured Memories
                </span>
                <div className="space-y-1.5">
                  {entry.memories.map((mem, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                      🕯️ {mem}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What they taught me */}
            {entry.whatTheyTaughtMe.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider block">
                  What They Taught Me
                </span>
                <div className="space-y-1">
                  {entry.whatTheyTaughtMe.map((lesson, i) => (
                    <p key={i} className="text-xs text-slate-200 italic">
                      • "{lesson}"
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Things I wish I could say */}
            {entry.thingsIWishICouldSay && (
              <div className="p-3.5 rounded-2xl bg-teal-950/30 border border-teal-500/20 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block">
                  Things I Wish I Could Say to Them:
                </span>
                <p className="text-slate-200 italic leading-relaxed">
                  "{entry.thingsIWishICouldSay}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Honor a Loved One</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Their Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Grandma Helen"
                    value={honoredPerson}
                    onChange={(e) => setHonoredPerson(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. Mother, Close Friend"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Memorial Dates (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 1945 – 2021"
                  value={memorialDate}
                  onChange={(e) => setMemorialDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Comforting Memories (one per line)</label>
                <textarea
                  rows={2}
                  placeholder="The smell of coffee in their kitchen, their warm laugh..."
                  value={memories}
                  onChange={(e) => setMemories(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">What did they teach you about life?</label>
                <textarea
                  rows={2}
                  placeholder="A lesson, saying, or quiet example they gave you..."
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Something you wish you could say</label>
                <input
                  type="text"
                  placeholder="A message from your heart to theirs..."
                  value={wishICouldSay}
                  onChange={(e) => setWishICouldSay(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Anchor Memorial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
