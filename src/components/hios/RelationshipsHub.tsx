import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, Heart, FileText, Lock, Plus, MessageSquare, 
  Shield, AlertCircle, Sparkles, Check, X, Calendar, Share2
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { 
  PersonProfile, 
  RomanticSpace, 
  TherapistCollaboration 
} from '../../core/database/hios_types';

interface RelationshipsHubProps {
  userId: string;
}

export default function RelationshipsHub({ userId }: RelationshipsHubProps) {
  const [activeTab, setActiveTab] = useState<'people' | 'romantic' | 'therapist'>('people');
  const [people, setPeople] = useState<PersonProfile[]>([]);
  const [romanticSpace, setRomanticSpace] = useState<RomanticSpace | null>(null);
  const [therapistCollab, setTherapistCollab] = useState<TherapistCollaboration | null>(null);

  // Add person modal
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personRel, setPersonRel] = useState<PersonProfile['relationshipType']>('friend');
  const [personNotes, setPersonNotes] = useState('');
  const [appreciationNote, setAppreciationNote] = useState('');

  // Romantic Space states
  const [partnerName, setPartnerName] = useState('');
  const [newGratitude, setNewGratitude] = useState('');
  const [conflictContext, setConflictContext] = useState('');
  const [conflictInsight, setConflictInsight] = useState('');

  // Therapist session prep states
  const [prepTopic, setPrepTopic] = useState('');
  const [prepNote, setPrepNote] = useState('');

  useEffect(() => {
    loadRelationshipsData();
  }, [userId]);

  const loadRelationshipsData = async () => {
    try {
      const storedPeople = await localDB.getPeopleProfiles(userId);
      if (storedPeople.length === 0) {
        const seedPeople: PersonProfile[] = [
          {
            id: 'p_1',
            userId,
            name: 'Elena',
            relationshipType: 'friend',
            notes: 'Longtime friend from design studies. Values quiet listening and deep conversation.',
            appreciationNotes: ['Sent a thoughtful book when I was going through a busy career transition.'],
            communicationReflections: [
              { id: 'r_1', date: new Date().toISOString(), reflection: 'Had a calm 40-minute phone call. Felt listened to and grounded.' }
            ],
            associatedMemoriesCount: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'p_2',
            userId,
            name: 'Marcus',
            relationshipType: 'mentor',
            notes: 'Senior engineer mentor. Taught me the importance of simplicity and clear boundaries.',
            appreciationNotes: ['Encouraged me to build sovereign personal technology with high craftsmanship.'],
            communicationReflections: [],
            associatedMemoriesCount: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ];
        for (const p of seedPeople) {
          await localDB.savePersonProfile(p);
        }
        setPeople(seedPeople);
      } else {
        setPeople(storedPeople);
      }

      const storedRomantic = await localDB.getRomanticSpaces(userId);
      if (storedRomantic.length > 0) {
        setRomanticSpace(storedRomantic[0]);
      } else {
        const defaultRomantic: RomanticSpace = {
          id: `rom_${userId}`,
          userId,
          partnerName: 'Partner',
          sharedGoals: ['Plan quiet mountain retreat', 'Read one shared book this season'],
          gratitudeItems: ['Waking up with shared morning tea', 'Support during challenging project'],
          conflictReflections: [
            {
              id: 'cr_1',
              date: new Date().toISOString(),
              context: 'Minor friction regarding weekend chore scheduling when both were tired.',
              insight: 'Realized fatigue amplifies tension. Communicating needs gently before exhaustion prevents miscommunication.'
            }
          ],
          relationshipMemories: [],
          isPrivateEncrypted: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveRomanticSpace(defaultRomantic);
        setRomanticSpace(defaultRomantic);
      }

      const storedTherapist = await localDB.getTherapistCollaboration(userId);
      if (storedTherapist) {
        setTherapistCollab(storedTherapist);
      } else {
        const defaultTherapist: TherapistCollaboration = {
          id: `ther_${userId}`,
          userId,
          isEnabled: false,
          sessionPrepNotes: ['Notice when perfectionism leads to task procrastination.'],
          preparedTopics: ['Managing cognitive overload', 'Boundaries with work communication'],
          selectedSummaryIds: [],
          disclaimerAcknowledged: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await localDB.saveTherapistCollaboration(defaultTherapist);
        setTherapistCollab(defaultTherapist);
      }
    } catch (err) {
      console.error('Failed loading relationships data:', err);
    }
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) return;

    const person: PersonProfile = {
      id: `p_${Date.now()}`,
      userId,
      name: personName.trim(),
      relationshipType: personRel,
      notes: personNotes.trim(),
      appreciationNotes: appreciationNote.trim() ? [appreciationNote.trim()] : [],
      communicationReflections: [],
      associatedMemoriesCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await localDB.savePersonProfile(person);
    setPersonName('');
    setPersonNotes('');
    setAppreciationNote('');
    setShowAddPerson(false);
    await loadRelationshipsData();
  };

  const handleAddGratitudeToRomantic = async () => {
    if (!newGratitude.trim() || !romanticSpace) return;
    const updated: RomanticSpace = {
      ...romanticSpace,
      gratitudeItems: [...romanticSpace.gratitudeItems, newGratitude.trim()],
      updatedAt: new Date().toISOString()
    };
    await localDB.saveRomanticSpace(updated);
    setRomanticSpace(updated);
    setNewGratitude('');
  };

  const handleAddConflictReflection = async () => {
    if (!conflictContext.trim() || !conflictInsight.trim() || !romanticSpace) return;
    const newCR = {
      id: `cr_${Date.now()}`,
      date: new Date().toISOString(),
      context: conflictContext.trim(),
      insight: conflictInsight.trim()
    };
    const updated: RomanticSpace = {
      ...romanticSpace,
      conflictReflections: [newCR, ...romanticSpace.conflictReflections],
      updatedAt: new Date().toISOString()
    };
    await localDB.saveRomanticSpace(updated);
    setRomanticSpace(updated);
    setConflictContext('');
    setConflictInsight('');
  };

  const handleAddPrepTopic = async () => {
    if (!prepTopic.trim() || !therapistCollab) return;
    const updated: TherapistCollaboration = {
      ...therapistCollab,
      preparedTopics: [...therapistCollab.preparedTopics, prepTopic.trim()],
      updatedAt: new Date().toISOString()
    };
    await localDB.saveTherapistCollaboration(updated);
    setTherapistCollab(updated);
    setPrepTopic('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 4 • Human Connections</span>
            <span className="px-2 py-0.5 text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full font-semibold">Privacy First</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Relationships & Human Sanctuary</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Nurture your authentic human bonds. Dedicated spaces for family, friends, private romantic reflection, and permission-based therapist collaboration.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('people')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'people' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Family & Friends</span>
          </button>
          <button
            onClick={() => setActiveTab('romantic')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'romantic' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>Romantic Space</span>
          </button>
          <button
            onClick={() => setActiveTab('therapist')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'therapist' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Therapist Mode</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FAMILY & FRIENDS */}
      {activeTab === 'people' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              People Profiles & Appreciation ({people.length})
            </span>
            <button
              onClick={() => setShowAddPerson(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Person Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {people.map(person => (
              <div key={person.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-bold text-white">{person.name}</h4>
                    <span className="capitalize text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded">
                      {person.relationshipType}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {person.associatedMemoriesCount} connected memories
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {person.notes}
                </p>

                {person.appreciationNotes && person.appreciationNotes.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Appreciation Note:</span>
                    {person.appreciationNotes.map((note, idx) => (
                      <p key={idx} className="text-xs text-slate-200 italic">"{note}"</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ROMANTIC / INTIMATE SPACE */}
      {activeTab === 'romantic' && romanticSpace && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 flex items-start gap-3">
            <Lock className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-rose-300">Strictly Private Encrypted Sanctuary</p>
              <p className="text-slate-400 leading-relaxed">
                This space is completely private to you. LogEasy will NEVER share, publish, or use romantic reflections for behavioral ad profiling or surveillance. It is a gentle tool for empathy, appreciation, and perspective.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shared Gratitude & Appreciation */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <Heart className="h-4 w-4 fill-rose-500/20" />
                <span>Gratitude & Moments of Warmth</span>
              </div>

              <div className="space-y-2">
                {romanticSpace.gratitudeItems.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200">
                    💖 {item}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Record an act of love or appreciation..."
                  value={newGratitude}
                  onChange={(e) => setNewGratitude(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  onClick={handleAddGratitudeToRomantic}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Conflict Reflection & De-escalation */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <MessageSquare className="h-4 w-4" />
                <span>Calm Conflict Reflection & Learning</span>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {romanticSpace.conflictReflections.map(cr => (
                  <div key={cr.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[10px] text-slate-500 block">{new Date(cr.date).toLocaleDateString()}</span>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[11px]">Context:</span>
                      <p className="text-slate-300">{cr.context}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-indigo-200">
                      <span className="text-[10px] font-bold block text-indigo-300">Constructive Insight:</span>
                      <p>{cr.insight}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="What triggered tension? (e.g. fatigue, miscommunication)"
                  value={conflictContext}
                  onChange={(e) => setConflictContext(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="What did this teach you about navigating love with patience?"
                    value={conflictInsight}
                    onChange={(e) => setConflictInsight(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAddConflictReflection}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Log
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: THERAPIST COLLABORATION MODE */}
      {activeTab === 'therapist' && therapistCollab && (
        <div className="space-y-6">
          {/* Prominent Mandatory Clinical Disclaimer */}
          <div className="p-5 rounded-3xl bg-amber-950/30 border border-amber-500/40 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="h-4.5 w-4.5 text-amber-400" />
              <span>Mandatory Medical & Therapeutic Disclaimer</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              LogEasy is a personal self-reflection system, <strong>NOT a licensed therapist, clinical medical service, or emergency crisis hotline</strong>.
              Therapist Collaboration Mode allows you to voluntarily prepare talking points and select specific journal summaries to review with your licensed healthcare provider during in-person or telehealth clinical appointments. All exports require your explicit permission and can be revoked at any time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Session Prep Topics */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Topics to Discuss in Next Session ({therapistCollab.preparedTopics.length})
                </span>
              </div>

              <div className="space-y-2">
                {therapistCollab.preparedTopics.map((topic, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 flex items-center justify-between">
                    <span>📌 {topic}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="e.g. Discuss recurring morning anxiety pattern..."
                  value={prepTopic}
                  onChange={(e) => setPrepTopic(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddPrepTopic}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Add Topic
                </button>
              </div>
            </div>

            {/* Permission & Scoped Export */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">
                  Export Session Preparation Package
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Generate a clean, clinical-friendly PDF/text summary containing only your selected topics, mood averages, and self-chosen reflections. Your raw audio recordings and sovereign passwords are NEVER included.
                </p>
              </div>

              <button
                onClick={() => {
                  const summaryText = `LOGEASY CLINICAL PREPARATION SUMMARY\nGenerated: ${new Date().toLocaleString()}\n\nDISCUSSED TOPICS:\n` +
                    therapistCollab.preparedTopics.map(t => `• ${t}`).join('\n') +
                    `\n\nDISCLAIMER: Prepared by user for licensed clinical provider review.`;
                  const blob = new Blob([summaryText], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `LogEasy_Therapy_Prep_${new Date().toISOString().slice(0, 10)}.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
                <span>Export Scoped Therapy Brief</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Person Modal */}
      {showAddPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add Person Profile</h3>
            <form onSubmit={handleSavePerson} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g., Maya Lin"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Relationship Type</label>
                <select
                  value={personRel}
                  onChange={(e) => setPersonRel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="family">Family</option>
                  <option value="friend">Friend</option>
                  <option value="mentor">Mentor</option>
                  <option value="colleague">Colleague</option>
                  <option value="community">Community</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes & Context</label>
                <textarea
                  rows={2}
                  placeholder="How do you know them? What makes them special to you?"
                  value={personNotes}
                  onChange={(e) => setPersonNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Initial Appreciation Note</label>
                <input
                  type="text"
                  placeholder="What is one thing you appreciate about them?"
                  value={appreciationNote}
                  onChange={(e) => setAppreciationNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPerson(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
