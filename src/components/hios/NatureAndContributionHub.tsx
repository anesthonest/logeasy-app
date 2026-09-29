import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Trees, HandHeart, Sun, Cloud, MapPin, Compass, 
  Plus, Check, Sparkles, Smile, Heart
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { NatureEntry, ContributionEntry } from '../../core/database/hios_types';

interface NatureAndContributionHubProps {
  userId: string;
}

export default function NatureAndContributionHub({ userId }: NatureAndContributionHubProps) {
  const [activeTab, setActiveTab] = useState<'nature' | 'service'>('nature');
  const [natureEntries, setNatureEntries] = useState<NatureEntry[]>([]);
  const [contributions, setContributions] = useState<ContributionEntry[]>([]);

  // Nature form
  const [placeName, setPlaceName] = useState('');
  const [outdoorActivity, setOutdoorActivity] = useState('Walking / Hiking');
  const [observations, setObservations] = useState('');
  const [reflections, setReflections] = useState('');
  const [elevationRating, setElevationRating] = useState<number>(8);

  // Contribution form
  const [contribTitle, setContribTitle] = useState('');
  const [contribCategory, setContribCategory] = useState<ContributionEntry['category']>('kindness_act');
  const [contribDesc, setContribDesc] = useState('');
  const [beneficiary, setBeneficiary] = useState('');
  const [impactReflection, setImpactReflection] = useState('');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const storedNature = await localDB.getNatureEntries(userId);
      if (storedNature.length === 0) {
        const seedNature: NatureEntry = {
          id: 'nat_1',
          userId,
          title: 'Highland Pine Trail Walk',
          locationName: 'Highland Pine Trail',
          date: new Date().toISOString().slice(0, 10),
          weatherConditions: 'Crisp morning fog lifting into clear sunlight',
          observations: 'Noticed cedar waxwings feeding on winter berries and damp pine needles.',
          floraFaunaSeen: ['Cedar Waxwings', 'Winter Berries', 'Pine'],
          outdoorActivity: 'Hiking',
          reflections: 'Walking without headphones felt like an internal bath of stillness.',
          moodElevationScore: 9,
          createdAt: new Date().toISOString()
        };
        await localDB.saveNatureEntry(seedNature);
        setNatureEntries([seedNature]);
      } else {
        setNatureEntries(storedNature);
      }

      const storedC = await localDB.getContributionEntries(userId);
      if (storedC.length === 0) {
        const seedC: ContributionEntry = {
          id: 'con_1',
          userId,
          title: 'Junior Designer Mentorship',
          category: 'mentoring',
          description: 'Spent an hour reviewing a junior designer’s portfolio with encouragement and specific, actionable feedback.',
          beneficiaries: 'Aspiring student',
          impactReflection: 'Reminded me that giving time freely creates a ripple of confidence.',
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString()
        };
        await localDB.saveContributionEntry(seedC);
        setContributions([seedC]);
      } else {
        setContributions(storedC);
      }
    } catch (err) {
      console.error('Failed loading nature and contribution:', err);
    }
  };

  const handleSaveNature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) return;

    const entry: NatureEntry = {
      id: `nat_${Date.now()}`,
      userId,
      title: placeName.trim(),
      locationName: placeName.trim(),
      date: new Date().toISOString().slice(0, 10),
      weatherConditions: 'Pleasant',
      observations: observations.trim(),
      floraFaunaSeen: [],
      outdoorActivity,
      reflections: reflections.trim() || 'Felt grounded and present.',
      moodElevationScore: elevationRating,
      createdAt: new Date().toISOString()
    };

    await localDB.saveNatureEntry(entry);
    setPlaceName('');
    setObservations('');
    setReflections('');
    await loadData();
  };

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribDesc.trim()) return;

    const entry: ContributionEntry = {
      id: `con_${Date.now()}`,
      userId,
      title: contribTitle.trim() || 'Act of Service',
      category: contribCategory,
      description: contribDesc.trim(),
      beneficiaries: beneficiary.trim() || 'Community',
      impactReflection: impactReflection.trim(),
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    };

    await localDB.saveContributionEntry(entry);
    setContribTitle('');
    setContribDesc('');
    setBeneficiary('');
    setImpactReflection('');
    await loadData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">Layer 12 • Living Ecologies</span>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full font-semibold">Grounded & Generous</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Nature Immersion & Genuine Contribution</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Reconnect with the living Earth through unhurried nature observation, and log genuine acts of service with zero gamification or moral posturing.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveTab('nature')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'nature' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trees className="h-3.5 w-3.5" />
            <span>Nature Connection</span>
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'service' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HandHeart className="h-3.5 w-3.5" />
            <span>Service & Kindness</span>
          </button>
        </div>
      </div>

      {activeTab === 'nature' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nature Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Trees className="h-4 w-4" />
              <span>Record Outdoor Immersion</span>
            </h3>

            <form onSubmit={handleSaveNature} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Place / Trail Name</label>
                <input
                  type="text"
                  placeholder="e.g. Whispering Creek Botanical Reserve"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Activity</label>
                  <input
                    type="text"
                    value={outdoorActivity}
                    onChange={(e) => setOutdoorActivity(e.target.value)}
                    placeholder="e.g. Walking, Birding"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Restorative Score</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={elevationRating}
                    onChange={(e) => setElevationRating(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">What did you observe? (Flora, fauna, sounds)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Scent of wild thyme, red-tailed hawk circling low..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Reflections / Inner State</label>
                <textarea
                  rows={2}
                  placeholder="How did this natural space ground you?"
                  value={reflections}
                  onChange={(e) => setReflections(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Anchor Nature Walk
              </button>
            </form>
          </div>

          {/* Nature List */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Nature Immersion Logs ({natureEntries.length})
            </span>

            <div className="space-y-4">
              {natureEntries.map(n => (
                <div key={n.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-400" />
                        <span>{n.locationName}</span>
                      </h4>
                      <span className="text-xs text-slate-400 capitalize">{n.outdoorActivity} • {n.date}</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                      🌿 Elevation: {n.moodElevationScore}/10
                    </span>
                  </div>

                  {n.observations && (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      • {n.observations}
                    </p>
                  )}

                  {n.reflections && (
                    <p className="text-xs text-emerald-300/80 italic pt-2 border-t border-slate-800/60">
                      "{n.reflections}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <HandHeart className="h-4 w-4" />
              <span>Record Quiet Service</span>
            </h3>

            <form onSubmit={handleSaveContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Service Title</label>
                <input
                  type="text"
                  placeholder="e.g. Helping Neighbor with Groceries"
                  value={contribTitle}
                  onChange={(e) => setContribTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Service Category</label>
                <select
                  value={contribCategory}
                  onChange={(e) => setContribCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-rose-500"
                >
                  <option value="kindness_act">Quiet Act of Kindness</option>
                  <option value="volunteering">Volunteering / Community Work</option>
                  <option value="mentoring">Mentoring / Teaching</option>
                  <option value="environmental">Environmental Care / Cleanup</option>
                  <option value="helping_friend">Helping a Friend in Need</option>
                  <option value="community">Civic / Community Project</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">What did you do?</label>
                <textarea
                  rows={3}
                  placeholder="Describe your act of service or contribution..."
                  value={contribDesc}
                  onChange={(e) => setContribDesc(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Beneficiary (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Neighbor, Community Garden, Student"
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">How did this touch your own heart?</label>
                <input
                  type="text"
                  placeholder="A brief reflection on meaning..."
                  value={impactReflection}
                  onChange={(e) => setImpactReflection(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Record Act of Service
              </button>
            </form>
          </div>

          {/* Service List */}
          <div className="lg:col-span-2 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Quiet Contributions Log ({contributions.length})
            </span>

            <div className="space-y-4">
              {contributions.map(c => (
                <div key={c.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/20">
                      {(c?.category || 'contribution').replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">{c.date}</span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{c.title}</h4>
                  <p className="text-xs text-slate-200 leading-relaxed">{c.description}</p>

                  {c.impactReflection && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 italic">
                      💖 "{c.impactReflection}"
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
