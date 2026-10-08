import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Sparkles, Plus, Check, Target, Compass, 
  RotateCcw, ShieldCheck, Calendar, ArrowRight, X, Clock
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { Habit, Goal } from '../../core/ai/coach_types';
import { logger } from '../../core/analytics/logger';

interface SoftConsistencyHubProps {
  userId: string;
}

export default function SoftConsistencyHub({ userId }: SoftConsistencyHubProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newFrequency, setNewFrequency] = useState<'daily' | 'flexible' | 'weekly'>('flexible');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [recognitionMsg, setRecognitionMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedHabits, fetchedGoals] = await Promise.all([
        localDB.getHabits(userId),
        localDB.getGoals(userId),
      ]);
      setHabits(fetchedHabits);
      setGoals(fetchedGoals);
    } catch (e) {
      logger.error('SoftConsistencyHub', 'Failed to load habits', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const today = new Date().toISOString().split('T')[0];
    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      userId,
      name: newTitle.trim(),
      description: 'Cultivated with gentle self-compassion.',
      frequency: (newFrequency === 'daily' ? 'daily' : 'custom') as any,
      currentStreak: 1, // Calm starting count
      longestStreak: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: { [today]: true }
    };

    try {
      await localDB.saveHabit(newHabit);
      setHabits([newHabit, ...habits]);
      setShowAddModal(false);
      setNewTitle('');
      setSelectedGoalId('');
      setRecognitionMsg(`"${newHabit.name}" created. Remember: consistency is about returning, not perfection.`);
      setTimeout(() => setRecognitionMsg(null), 4000);
    } catch (e) {
      logger.error('SoftConsistencyHub', 'Failed to create habit', e);
    }
  };

  const handleMarkPresent = async (habit: Habit) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedHistory = { ...(habit.history || {}), [today]: true };

    const updated: Habit = {
      ...habit,
      history: updatedHistory,
      currentStreak: (habit.currentStreak || 0) + 1,
      longestStreak: Math.max(habit.longestStreak || 0, (habit.currentStreak || 0) + 1),
      updatedAt: new Date().toISOString()
    };

    try {
      await localDB.saveHabit(updated);
      setHabits(habits.map(h => h.id === habit.id ? updated : h));
      setRecognitionMsg(`You showed up for "${habit.name}". Beautiful.`);
      setTimeout(() => setRecognitionMsg(null), 3500);
    } catch (e) {
      logger.error('SoftConsistencyHub', 'Failed to mark habit', e);
    }
  };

  return (
    <div className="space-y-6 flex-1 flex flex-col min-h-0">
      
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-3 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Gentle Rhythms
              </span>
              <span className="text-gray-500 text-xs font-mono">• Zero-Shame Architecture</span>
            </div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <Heart className="h-5 w-5 text-emerald-400" />
              <span>Soft Consistency Support</span>
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl leading-relaxed">
              Habits should support your vitality, not become another source of pressure. 
              We reward returning after breaks, honor flexible schedules, and connect your daily actions to long-term goals.
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-95 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all shrink-0 self-start md:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Gentle Habit</span>
          </button>
        </div>

        {/* Soft Consistency Philosophy Badge */}
        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-300">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            Instead of <em>"You broke your streak"</em>, LogEasy remembers: <strong>"You are returning to this. That is where growth happens."</strong>
          </span>
        </div>
      </div>

      {/* Recognition Toast */}
      <AnimatePresence>
        {recognitionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-medium"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>{recognitionMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habits Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {habits.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-3">
            <Heart className="h-8 w-8 text-gray-600 mx-auto" />
            <h4 className="text-sm font-bold text-gray-300">No active habits yet</h4>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              Create a gentle rhythm for something that nourishes you (e.g. morning walk, quiet journaling, hydration).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habits.map(h => {
              const today = new Date().toISOString().split('T')[0];
              const completedToday = Boolean(h.history && h.history[today]);

              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/15 flex flex-col justify-between space-y-4 hover:border-emerald-500/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                        {h.frequency || 'Flexible Rhythm'}
                      </span>
                      <span className="text-xs font-mono text-gray-400">
                        {Object.keys(h.history || {}).length} times returned
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                        <span>{h.name}</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Cultivated with gentle self-compassion.
                      </p>
                    </div>

                    {/* Linked Goal Anchor */}
                    {(() => {
                      const linkedGoal = goals.find(g => 
                        h.name.toLowerCase().includes(g.title.toLowerCase()) || 
                        g.title.toLowerCase().includes(h.name.toLowerCase())
                      );
                      return linkedGoal ? (
                        <div className="p-2.5 rounded-xl bg-[#090d16] border border-gray-500/10 flex items-center gap-2 text-xs">
                          <Target className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span className="text-gray-400 text-[11px]">Sustains Goal:</span>
                          <span className="text-gray-200 font-semibold truncate">{linkedGoal.title}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  {/* Action Footer */}
                  <div className="pt-3 border-t border-gray-500/10 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                      <RotateCcw className="h-3 w-3 text-emerald-400" />
                      <span>Always welcome to return</span>
                    </span>

                    <button
                      onClick={() => handleMarkPresent(h)}
                      disabled={completedToday}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                        completedToday
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{completedToday ? 'Returned Today' : 'Mark Presence'}</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE HABIT MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0b101b] border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-gray-500/10 pb-4">
                <div className="space-y-0.5">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Heart className="h-4 w-4 text-emerald-400" />
                    <span>Create Soft Rhythm</span>
                  </h3>
                  <p className="text-[11px] text-gray-400">Design a habit without punitive pressure.</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateHabit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-400 uppercase">Habit Name *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. 10-minute walk after lunch, evening vocal log..."
                    className="w-full p-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 outline-none focus:border-emerald-400"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-gray-400 uppercase">Schedule Cadence</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'flexible', label: 'Flexible Rhythms' },
                      { id: 'daily', label: 'Daily Anchor' },
                      { id: 'weekly', label: 'Few Times a Week' },
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setNewFrequency(f.id as any)}
                        className={`p-2 rounded-xl text-center border font-semibold ${
                          newFrequency === f.id
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-gray-500/5 text-gray-400 border-gray-500/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {goals.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-gray-400 uppercase">Link to a Life Goal (Optional)</label>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-gray-500/5 border border-gray-500/20 text-xs text-gray-200 outline-none focus:border-emerald-400"
                    >
                      <option value="">No linked goal</option>
                      {goals.map(g => (
                        <option key={g.id} value={g.id}>{g.title}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold cursor-pointer disabled:opacity-40"
                  >
                    Save Rhythm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
