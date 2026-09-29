import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, Moon, Sun, AlertTriangle, Plus, 
  Sparkles, Coffee, BatteryCharging, Wind, Clock, Check
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import { BodyObservation, RestRecord } from '../../core/database/hios_types';

interface BodyAndRestHubProps {
  userId: string;
}

export default function BodyAndRestHub({ userId }: BodyAndRestHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<'awareness' | 'recovery'>('awareness');
  const [observations, setObservations] = useState<BodyObservation[]>([]);
  const [restRecords, setRestRecords] = useState<RestRecord[]>([]);

  // Body observation form
  const [energyLevel, setEnergyLevel] = useState<number>(7);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [sleepQuality, setSleepQuality] = useState<number>(8);
  const [sensations, setSensations] = useState<string>('');
  const [tensionAreas, setTensionAreas] = useState<string>('');
  const [movementNotes, setMovementNotes] = useState<string>('');
  const [bodyNotes, setBodyNotes] = useState<string>('');

  // Rest record form
  const [restType, setRestType] = useState<RestRecord['restType']>('quiet_time');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [mentalLoadLevel, setMentalLoadLevel] = useState<number>(4);
  const [recoveryRating, setRecoveryRating] = useState<number>(8);
  const [restNotes, setRestNotes] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      const storedObs = await localDB.getBodyObservations(userId);
      setObservations(storedObs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      const storedRest = await localDB.getRestRecords(userId);
      setRestRecords(storedRest.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Failed loading body observations:', err);
    }
  };

  const handleSaveBodyObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const obs: BodyObservation = {
      id: `body_${Date.now()}`,
      userId,
      date: new Date().toISOString().slice(0, 10),
      energyLevel,
      sleepHours,
      sleepQuality,
      physicalSensations: sensations ? sensations.split(',').map(s => s.trim()) : [],
      tensionAreas: tensionAreas ? tensionAreas.split(',').map(s => s.trim()) : [],
      movementNotes,
      appetiteNotes: '',
      environmentalNotes: '',
      notes: bodyNotes,
      nonMedicalDisclaimerAcknowledged: true,
      createdAt: new Date().toISOString()
    };

    await localDB.saveBodyObservation(obs);
    setSensations('');
    setTensionAreas('');
    setMovementNotes('');
    setBodyNotes('');
    await loadData();
  };

  const handleSaveRestRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const record: RestRecord = {
      id: `rest_${Date.now()}`,
      userId,
      date: new Date().toISOString().slice(0, 10),
      restType,
      durationMinutes,
      mentalLoadLevel,
      recoveryRating,
      notes: restNotes,
      createdAt: new Date().toISOString()
    };

    await localDB.saveRestRecord(record);
    setRestNotes('');
    await loadData();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Layer 6 • Somatic & Rest Sanctuary</span>
            <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full font-semibold">Non-Medical Awareness</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">Body Awareness & Restful Recovery</h2>
          <p className="text-xs text-slate-400 max-w-2xl mt-1">
            Listen to your body's natural signals, track your mental load, and protect your quiet recovery time without diagnostic pressure.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('awareness')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'awareness' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Body Awareness</span>
          </button>
          <button
            onClick={() => setActiveSubTab('recovery')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'recovery' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            <span>Rest & Recovery</span>
          </button>
        </div>
      </div>

      {/* Mandatory Non-Medical Disclaimer */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex items-start gap-3 text-xs">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-slate-300 leading-relaxed">
          <strong className="text-amber-300">Non-Medical Notice:</strong> LogEasy is a personal self-reflection system, not a medical or diagnostic instrument. It does not diagnose diseases, interpret clinical symptoms, or prescribe treatments. Always consult a licensed medical provider for physical or health concerns.
        </p>
      </div>

      {activeSubTab === 'awareness' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span>Log Somatic State</span>
            </h3>

            <form onSubmit={handleSaveBodyObservation} className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>Energy Level</span>
                  <span className="text-cyan-400">{energyLevel} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Sleep Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Sleep Quality (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Physical Sensations (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Warmth in chest, light eyes, energized legs"
                  value={sensations}
                  onChange={(e) => setSensations(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tension Areas (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Shoulders, lower back"
                  value={tensionAreas}
                  onChange={(e) => setTensionAreas(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Movement Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 25 min gentle morning walk"
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer"
              >
                Record Body Observation
              </button>
            </form>
          </div>

          {/* Observations list */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Recent Observations ({observations.length})
            </span>

            {observations.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500">
                No body observations recorded yet. Use the form on the left to capture your physical sensations.
              </div>
            ) : (
              observations.map(obs => (
                <div key={obs.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-400 font-semibold">{obs.date}</span>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/20 text-[10px] font-bold">
                        ⚡ Energy: {obs.energyLevel}/10
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold">
                        💤 Sleep: {obs.sleepHours}h ({obs.sleepQuality}/10)
                      </span>
                    </div>
                  </div>

                  {obs.physicalSensations.length > 0 && (
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-500 text-[11px] block">Sensations:</span>
                      {obs.physicalSensations.join(', ')}
                    </div>
                  )}

                  {obs.movementNotes && (
                    <div className="text-xs text-slate-400">
                      🚶‍♂️ {obs.movementNotes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recovery Form */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Moon className="h-4 w-4" />
              <span>Log Rest & Decompression</span>
            </h3>

            <form onSubmit={handleSaveRestRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Rest Type</label>
                <select
                  value={restType}
                  onChange={(e) => setRestType(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="quiet_time">Quiet Time / Silence</option>
                  <option value="mental_decompression">Mental Decompression</option>
                  <option value="nature_walk">Nature Immersion</option>
                  <option value="sleep">Deep Rest / Nap</option>
                  <option value="recreation">Playful Recreation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Duration (Minutes)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-400 mb-1">
                  <span>Mental Load Level</span>
                  <span className="text-indigo-400">{mentalLoadLevel} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={mentalLoadLevel}
                  onChange={(e) => setMentalLoadLevel(Number(e.target.value))}
                  className="w-full accent-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Notes / Experience</label>
                <input
                  type="text"
                  placeholder="e.g. Sat in the garden with tea and no screens."
                  value={restNotes}
                  onChange={(e) => setRestNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Record Rest Session
              </button>
            </form>
          </div>

          {/* Rest records list */}
          <div className="lg:col-span-2 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Logged Rest & Recovery Periods ({restRecords.length})
            </span>

            {restRecords.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-800 rounded-3xl text-center text-xs text-slate-500">
                No rest sessions recorded yet. Prioritize giving your mind quiet, unhurried space today.
              </div>
            ) : (
              restRecords.map(r => (
                <div key={r.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-indigo-300 font-bold capitalize">
                      {(r?.restType || 'rest').replace('_', ' ')} • {r.durationMinutes} mins
                    </span>
                    <span className="text-slate-400 text-[11px]">{r.date}</span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {r.notes || 'Quiet recovery time.'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
