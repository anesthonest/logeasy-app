import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, Sparkles, BookOpen, Clock, AlertTriangle, Shield, CheckCircle,
  HelpCircle, Search, Compass, RefreshCw, Plus, Trash2, Download,
  ArrowRight, FileText, Check, X, Calendar, Activity, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import {
  PersonalBriefing,
  MemoryMoment,
  PatternObservation,
  ContradictionRecord,
  LifeKnowledgeItem,
  LessonProposal,
  OpportunityItem,
  UnfinishedItem,
  DecisionRecord,
  FutureSelfProfile,
  ScenarioSimulation,
  PersonalExperiment,
  ResurfacingRule,
  AnnualLifeBook
} from '../../core/intelligence/types';
import { personalContextEngine } from '../../core/intelligence/personal_context_engine';
import { patternDiscoveryEngine } from '../../core/intelligence/pattern_discovery_engine';
import { memoryReconciliationEngine } from '../../core/intelligence/memory_reconciliation_engine';
import { knowledgeVaultService } from '../../core/intelligence/knowledge_vault_service';
import { opportunityAndUnfinishedEngine } from '../../core/intelligence/opportunity_and_unfinished_engine';
import { decisionLearningEngine } from '../../core/intelligence/decision_learning_engine';
import { briefingAndMomentsService } from '../../core/intelligence/briefing_and_moments_service';
import { futureAndExperimentsEngine } from '../../core/intelligence/future_and_experiments_engine';
import { dataPortabilityService } from '../../core/intelligence/data_portability_service';
import { personalSearchService, SearchAnswer } from '../../core/intelligence/personal_search_service';
import { seedIntelligenceLayerIfEmpty } from '../../core/intelligence/intelligence_seed';
import { logger } from '../../core/analytics/logger';

interface PersonalLifeIntelligenceHubProps {
  userId: string;
  localEntries: LocalJournalEntry[];
}

type SubTab = 'briefing' | 'vault' | 'patterns' | 'decisions' | 'future' | 'search_portability';

export default function PersonalLifeIntelligenceHub({ userId, localEntries }: PersonalLifeIntelligenceHubProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('briefing');
  const [loading, setLoading] = useState(true);

  // States for intelligence dimensions
  const [briefing, setBriefing] = useState<PersonalBriefing | null>(null);
  const [briefingCadence, setBriefingCadence] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [memoryMoments, setMemoryMoments] = useState<MemoryMoment[]>([]);
  const [resurfacingRule, setResurfacingRule] = useState<ResurfacingRule | null>(null);

  const [vaultItems, setVaultItems] = useState<LifeKnowledgeItem[]>([]);
  const [pendingProposals, setPendingProposals] = useState<LessonProposal[]>([]);
  const [newVaultTitle, setNewVaultTitle] = useState('');
  const [newVaultContent, setNewVaultContent] = useState('');
  const [newVaultType, setNewVaultType] = useState<'principle' | 'lesson' | 'strategy' | 'warning'>('lesson');
  const [showAddVaultModal, setShowAddVaultModal] = useState(false);

  const [patterns, setPatterns] = useState<PatternObservation[]>([]);
  const [contradictions, setContradictions] = useState<ContradictionRecord[]>([]);

  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [unfinishedItems, setUnfinishedItems] = useState<UnfinishedItem[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [selectedDecisionForReview, setSelectedDecisionForReview] = useState<DecisionRecord | null>(null);
  const [reviewWhatHappened, setReviewWhatHappened] = useState('');
  const [reviewWhatWasCorrect, setReviewWhatWasCorrect] = useState('');
  const [reviewWhatWasWrong, setReviewWhatWasWrong] = useState('');
  const [reviewLessons, setReviewLessons] = useState('');

  const [futureProfile, setFutureProfile] = useState<FutureSelfProfile | null>(null);
  const [scenarioPrompt, setScenarioPrompt] = useState('What if I take a 2-month sabbatical to write a technical book?');
  const [activeSimulation, setActiveSimulation] = useState<ScenarioSimulation | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [experiments, setExperiments] = useState<PersonalExperiment[]>([]);
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpIntention, setNewExpIntention] = useState('');
  const [newExpDays, setNewExpDays] = useState(14);
  const [showExpModal, setShowExpModal] = useState(false);

  // Search & Portability
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAnswer, setSearchAnswer] = useState<SearchAnswer | null>(null);
  const [searching, setSearching] = useState(false);
  const [portabilityMessage, setPortabilityMessage] = useState<string | null>(null);
  const [annualBook, setAnnualBook] = useState<AnnualLifeBook | null>(null);

  // Load all intelligence data
  const loadIntelligenceData = async () => {
    setLoading(true);
    try {
      await seedIntelligenceLayerIfEmpty(userId);

      const [
        loadedBriefing,
        loadedMoments,
        loadedRule,
        loadedVault,
        loadedProposals,
        loadedPatterns,
        loadedContradictions,
        loadedOpps,
        loadedUnfinished,
        loadedDecisions,
        loadedFuture,
        loadedExperiments
      ] = await Promise.all([
        briefingAndMomentsService.generateBriefing(userId, briefingCadence),
        briefingAndMomentsService.getMemoryMoments(userId),
        briefingAndMomentsService.getOrCreateResurfacingRule(userId),
        knowledgeVaultService.getVerifiedKnowledge(userId),
        knowledgeVaultService.getPendingProposals(userId),
        patternDiscoveryEngine.analyzePatterns(userId),
        memoryReconciliationEngine.scanForContradictions(userId),
        opportunityAndUnfinishedEngine.discoverOpportunities(userId),
        opportunityAndUnfinishedEngine.scanUnfinishedBusiness(userId),
        localDB.getDecisionRecords(userId),
        futureAndExperimentsEngine.getFutureSelfProfile(userId),
        localDB.getPersonalExperiments(userId)
      ]);

      setBriefing(loadedBriefing);
      setMemoryMoments(loadedMoments);
      setResurfacingRule(loadedRule);
      setVaultItems(loadedVault);
      setPendingProposals(loadedProposals);
      setPatterns(loadedPatterns);
      setContradictions(loadedContradictions);
      setOpportunities(loadedOpps);
      setUnfinishedItems(loadedUnfinished);
      setDecisions(loadedDecisions);
      setFutureProfile(loadedFuture);
      setExperiments(loadedExperiments);
    } catch (err) {
      logger.error('PersonalLifeIntelligenceHub', 'Failed to load intelligence data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligenceData();
  }, [userId, briefingCadence]);

  // Handle Briefing Refresh
  const handleRefreshBriefing = async () => {
    const updated = await briefingAndMomentsService.generateBriefing(userId, briefingCadence);
    setBriefing(updated);
  };

  // Handle Quiet Period Toggle
  const handleToggleQuietPeriod = async () => {
    if (!resurfacingRule) return;
    const nextFreq = resurfacingRule.frequency === 'quiet' ? 'daily' : 'quiet';
    const updated = await briefingAndMomentsService.updateResurfacingRule(userId, { frequency: nextFreq });
    setResurfacingRule(updated);
    const moments = await briefingAndMomentsService.getMemoryMoments(userId);
    setMemoryMoments(moments);
  };

  // Handle Proposal Resolve
  const handleResolveProposal = async (proposalId: string, action: 'save' | 'dismiss') => {
    await knowledgeVaultService.resolveProposal(userId, proposalId, action);
    setPendingProposals(prev => prev.filter(p => p.id !== proposalId));
    const refreshedVault = await knowledgeVaultService.getVerifiedKnowledge(userId);
    setVaultItems(refreshedVault);
  };

  // Handle Add Vault Item
  const handleAddVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVaultTitle.trim() || !newVaultContent.trim()) return;

    await knowledgeVaultService.addKnowledgeItem(userId, {
      title: newVaultTitle.trim(),
      content: newVaultContent.trim(),
      type: newVaultType,
      contextTags: ['manual_entry'],
      isUserAuthored: true
    });

    setNewVaultTitle('');
    setNewVaultContent('');
    setShowAddVaultModal(false);
    const refreshed = await knowledgeVaultService.getVerifiedKnowledge(userId);
    setVaultItems(refreshed);
  };

  // Toggle Exclude from AI for a Vault Item
  const handleToggleExcludeAI = async (itemId: string, currentState: boolean) => {
    await knowledgeVaultService.updateKnowledgeItem(userId, itemId, {
      isExcludedFromAI: !currentState
    });
    const refreshed = await knowledgeVaultService.getVerifiedKnowledge(userId);
    setVaultItems(refreshed);
  };

  // Handle Contradiction Resolution
  const handleResolveContradiction = async (
    id: string,
    resolution: 'keep_newer' | 'keep_both_historically' | 'update_both' | 'dismissed'
  ) => {
    await memoryReconciliationEngine.resolveContradiction(userId, id, resolution, `Resolved via Intelligence Hub`);
    const refreshed = await memoryReconciliationEngine.scanForContradictions(userId);
    setContradictions(refreshed);
  };

  // Handle Decision Review
  const handleSubmitDecisionReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecisionForReview) return;

    await decisionLearningEngine.reviewOutcome(userId, selectedDecisionForReview.id, {
      whatHappened: reviewWhatHappened,
      whatWasCorrect: reviewWhatWasCorrect,
      whatWasWrong: reviewWhatWasWrong,
      whatWasUnexpected: '',
      lessonsLearned: reviewLessons.split('\n').filter(l => l.trim().length > 0),
      saveLessonsToVault: true
    });

    setSelectedDecisionForReview(null);
    setReviewWhatHappened('');
    setReviewWhatWasCorrect('');
    setReviewWhatWasWrong('');
    setReviewLessons('');

    const refreshedDecisions = await localDB.getDecisionRecords(userId);
    setDecisions(refreshedDecisions);
    const refreshedVault = await knowledgeVaultService.getVerifiedKnowledge(userId);
    setVaultItems(refreshedVault);
  };

  // Handle Unfinished Item Action
  const handleUnfinishedAction = async (itemId: string, action: 'continue' | 'archive' | 'remind_later') => {
    await opportunityAndUnfinishedEngine.handleUnfinishedAction(userId, itemId, action);
    const refreshed = await opportunityAndUnfinishedEngine.scanUnfinishedBusiness(userId);
    setUnfinishedItems(refreshed);
  };

  // Handle Scenario Simulation
  const handleRunScenario = async () => {
    if (!scenarioPrompt.trim()) return;
    setSimulating(true);
    try {
      const sim = await futureAndExperimentsEngine.simulateScenario(userId, scenarioPrompt, [
        'Assuming continuous weekly time investment.',
        'Assuming health and baseline living conditions remain stable.'
      ]);
      setActiveSimulation(sim);
    } finally {
      setSimulating(false);
    }
  };

  // Handle Start Experiment
  const handleStartExperiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpTitle.trim() || !newExpIntention.trim()) return;

    await futureAndExperimentsEngine.startExperiment(userId, {
      title: newExpTitle.trim(),
      intention: newExpIntention.trim(),
      targetDurationDays: newExpDays
    });

    setNewExpTitle('');
    setNewExpIntention('');
    setShowExpModal(false);
    const refreshed = await localDB.getPersonalExperiments(userId);
    setExperiments(refreshed);
  };

  // Handle Conversational Search
  const handleExecuteSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await personalSearchService.searchLifeModel(userId, searchQuery);
      setSearchAnswer(res);
    } finally {
      setSearching(false);
    }
  };

  // Handle Export Life Model JSON
  const handleExportJSON = async () => {
    const manifest = await dataPortabilityService.exportCompleteLifeModel(userId);
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logeasy_personal_life_model_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setPortabilityMessage('Complete Life Model exported successfully (JSON).');
  };

  // Handle Export Life Chronicle Markdown
  const handleExportMarkdown = async () => {
    const md = await dataPortabilityService.exportAsMarkdown(userId);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logeasy_life_chronicle_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setPortabilityMessage('Life Chronicle exported successfully (Markdown).');
  };

  // Handle Annual Life Book Compilation
  const handleCompileAnnualBook = async () => {
    const currentYear = new Date().getFullYear();
    const book = await dataPortabilityService.compileAnnualLifeBook(userId, currentYear);
    setAnnualBook(book);
    setPortabilityMessage(`Annual Life Book compiled for ${currentYear}.`);
  };

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-gray-900/60 border border-gray-800 text-center space-y-3">
        <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin mx-auto" />
        <p className="text-xs text-gray-400 font-mono">Initializing Personal Life Intelligence Layer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: HIOS Intelligence Layer Core Philosophy */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/20 border border-cyan-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-gray-100 tracking-wide">Personal Life Intelligence Layer</h2>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
              Active Sovereign Model
            </span>
          </div>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            "LogEasy should not merely remember a person's life. It should help the person understand the life they are building." The system observes; the user interprets.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadIntelligenceData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-800 border border-gray-700 text-xs text-gray-200 cursor-pointer transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
            <span>Re-scan Model</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-800">
        {[
          { id: 'briefing', label: 'Briefings & Moments', icon: Calendar },
          { id: 'vault', label: 'Knowledge Vault', icon: BookOpen, count: vaultItems.length },
          { id: 'patterns', label: 'Patterns & Contradictions', icon: Activity, count: patterns.length + contradictions.length },
          { id: 'decisions', label: 'Decisions & Opportunities', icon: Compass, count: decisions.length + unfinishedItems.length },
          { id: 'future', label: 'Future Self & Experiments', icon: Sparkles, count: experiments.length },
          { id: 'search_portability', label: 'Search & Portability', icon: Search }
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeSubTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveSubTab(t.id as SubTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border border-transparent'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isActive ? 'bg-cyan-400/20 text-cyan-200' : 'bg-gray-800 text-gray-400'}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUBTAB 1: BRIEFING & MEMORY MOMENTS */}
      {activeSubTab === 'briefing' && (
        <div className="space-y-6">
          {/* Briefing Cadence Selector */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1 p-1 bg-gray-900/60 rounded-2xl border border-gray-800">
              {(['daily', 'weekly', 'monthly'] as const).map(cadence => (
                <button
                  key={cadence}
                  onClick={() => setBriefingCadence(cadence)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize cursor-pointer transition-all ${
                    briefingCadence === cadence
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {cadence} Briefing
                </button>
              ))}
            </div>

            <button
              onClick={handleToggleQuietPeriod}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                resurfacingRule?.frequency === 'quiet'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:text-gray-200'
              }`}
            >
              {resurfacingRule?.frequency === 'quiet' ? (
                <>
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span>Quiet Period Active (No Resurfacing)</span>
                </>
              ) : (
                <>
                  <Activity className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Resurfacing Normal</span>
                </>
              )}
            </button>
          </div>

          {/* Structured Briefing Card */}
          {briefing && (
            <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-gray-100 capitalize">{briefing.cadence} Life Briefing</h3>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Generated {new Date(briefing.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <button
                  onClick={handleRefreshBriefing}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Looking Back */}
                {briefing.sections.lookingBack && (
                  <div className="p-4 rounded-2xl bg-gray-850 border border-gray-800/80 space-y-2">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">1. Looking Back</span>
                    <p className="text-xs text-gray-200 leading-relaxed">{briefing.sections.lookingBack.summary}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                      <HelpCircle className="h-3 w-3 text-cyan-500/70 shrink-0" />
                      <span className="truncate">{briefing.sections.lookingBack.why}</span>
                    </div>
                  </div>
                )}

                {/* 2. What Is Moving */}
                {briefing.sections.whatIsMoving && (
                  <div className="p-4 rounded-2xl bg-gray-850 border border-gray-800/80 space-y-2">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-wider block">2. What Is Moving</span>
                    <ul className="space-y-1">
                      {briefing.sections.whatIsMoving.goalsProjects.map((item, i) => (
                        <li key={i} className="text-xs text-gray-200 flex items-start gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                      <HelpCircle className="h-3 w-3 text-indigo-500/70 shrink-0" />
                      <span>{briefing.sections.whatIsMoving.why}</span>
                    </div>
                  </div>
                )}

                {/* 3. What Needs Attention */}
                {briefing.sections.whatNeedsAttention && (
                  <div className="p-4 rounded-2xl bg-gray-850 border border-gray-800/80 space-y-2">
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">3. What Needs Attention</span>
                    <ul className="space-y-1">
                      {briefing.sections.whatNeedsAttention.items.map((item, i) => (
                        <li key={i} className="text-xs text-amber-200/90 flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                      <HelpCircle className="h-3 w-3 text-amber-500/70 shrink-0" />
                      <span>{briefing.sections.whatNeedsAttention.why}</span>
                    </div>
                  </div>
                )}

                {/* 4. What You Learned */}
                {briefing.sections.whatYouLearned && (
                  <div className="p-4 rounded-2xl bg-gray-850 border border-gray-800/80 space-y-2">
                    <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider block">4. What You Learned</span>
                    <ul className="space-y-1">
                      {briefing.sections.whatYouLearned.lessons.map((lesson, i) => (
                        <li key={i} className="text-xs text-gray-200 flex items-start gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                          <span>{lesson}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                      <HelpCircle className="h-3 w-3 text-purple-500/70 shrink-0" />
                      <span>{briefing.sections.whatYouLearned.why}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Reflection Question */}
              {briefing.sections.reflection && (
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold text-cyan-300">Reflection Prompt for this Cadence</span>
                  </div>
                  <p className="text-sm font-medium text-gray-100 italic">
                    "{briefing.sections.reflection.question}"
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono">{briefing.sections.reflection.why}</p>
                </div>
              )}
            </div>
          )}

          {/* Memory Moments (Anniversaries & Meaningful Resurfacing) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>Memory Moments (Quiet-Grounded Resurfacing)</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">
                {memoryMoments.length} moment{memoryMoments.length === 1 ? '' : 's'} surfaced
              </span>
            </div>

            {memoryMoments.length === 0 ? (
              <div className="p-5 rounded-2xl bg-gray-900/40 border border-gray-800 text-center text-xs text-gray-400">
                No memories scheduled for resurfacing today (quiet boundaries active).
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {memoryMoments.map(moment => (
                  <div key={moment.id} className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                      <span className="capitalize text-indigo-400 font-bold">{(moment?.type || 'moment').replace('_', ' ')}</span>
                      <span>Original Date: {moment.originalDate}</span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed italic">"{moment.snippet}"</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono border-t border-gray-800 pt-1.5">
                      <HelpCircle className="h-3 w-3 text-indigo-400 shrink-0" />
                      <span>{moment.whyAmISeeingThis}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: KNOWLEDGE VAULT */}
      {activeSubTab === 'vault' && (
        <div className="space-y-6">
          {/* Vault Top Action Row */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span>Life Knowledge Vault (Verified Wisdom)</span>
              </h3>
              <p className="text-xs text-gray-400">
                Permanent, verified life knowledge with transparent lineage. Never converted automatically without consent.
              </p>
            </div>
            <button
              onClick={() => setShowAddVaultModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs cursor-pointer transition-all shadow-md"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Knowledge</span>
            </button>
          </div>

          {/* Pending Lesson Proposals from Journals */}
          {pendingProposals.length > 0 && (
            <div className="p-5 rounded-3xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">
                    Pending Lesson Proposals ({pendingProposals.length})
                  </span>
                </div>
                <span className="text-[10px] text-purple-300/70 font-mono">Requires User Approval</span>
              </div>
              <p className="text-xs text-gray-300">
                LogEasy detected prospective insights from your spoken journal reflections. You choose what becomes permanent life knowledge.
              </p>

              <div className="space-y-2">
                {pendingProposals.map(prop => (
                  <div key={prop.id} className="p-3 rounded-2xl bg-gray-900/80 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase">
                          {prop.suggestedType}
                        </span>
                        <span className="text-xs font-bold text-gray-200">{prop.suggestedLesson}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 italic">Source: "{prop.sourceSnippet}"</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveProposal(prop.id, 'save')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer transition-all"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save to Vault</span>
                      </button>
                      <button
                        onClick={() => handleResolveProposal(prop.id, 'dismiss')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs cursor-pointer transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Verified Vault Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vaultItems.map(item => {
              const badgeColors: Record<string, string> = {
                principle: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                lesson: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
                strategy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              };

              return (
                <div key={item.id} className="p-5 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${badgeColors[item.type] || 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                      {item.type}
                    </span>

                    <button
                      onClick={() => handleToggleExcludeAI(item.id, !!item.isExcludedFromAI)}
                      title={item.isExcludedFromAI ? "Excluded from AI context. Click to re-allow." : "Accessible by AI. Click to exclude."}
                      className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono cursor-pointer transition-all ${
                        item.isExcludedFromAI
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'text-gray-500 hover:text-gray-300 border-transparent'
                      }`}
                    >
                      {item.isExcludedFromAI ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      <span className="text-[10px]">{item.isExcludedFromAI ? 'AI Blocked' : 'AI Active'}</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-100">{item.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{item.content}</p>
                  </div>

                  {item.lineage && (
                    <div className="border-t border-gray-800 pt-2 space-y-1 text-[10px] text-gray-400 font-mono">
                      <div className="flex justify-between">
                        <span>Lineage: {item.lineage.isUserApproved ? 'User Approved' : 'Inferred'}</span>
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {item.lineage.sourceSnippets && item.lineage.sourceSnippets.length > 0 && (
                        <p className="italic text-gray-500 truncate">Source: "{item.lineage.sourceSnippets[0]}"</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add Knowledge Modal */}
          {showAddVaultModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-md w-full p-6 rounded-3xl bg-gray-900 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-gray-100">Add Verified Life Knowledge</h3>
                  <button onClick={() => setShowAddVaultModal(false)} className="text-gray-400 hover:text-gray-200 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleAddVaultItem} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-gray-300">Knowledge Type</label>
                    <select
                      value={newVaultType}
                      onChange={e => setNewVaultType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-200"
                    >
                      <option value="principle">Principle (Core Truth)</option>
                      <option value="lesson">Lesson (Learned Experience)</option>
                      <option value="strategy">Strategy (Effective Action)</option>
                      <option value="warning">Warning (Friction / Risk Rule)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-gray-300">Title</label>
                    <input
                      type="text"
                      value={newVaultTitle}
                      onChange={e => setNewVaultTitle(e.target.value)}
                      placeholder="e.g. Sovereignty Over Convenience"
                      className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-gray-300">Knowledge Statement</label>
                    <textarea
                      value={newVaultContent}
                      onChange={e => setNewVaultContent(e.target.value)}
                      placeholder="Write your enduring observation or principle..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddVaultModal(false)}
                      className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs cursor-pointer"
                    >
                      Save Knowledge
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: PATTERNS & CONTRADICTIONS */}
      {activeSubTab === 'patterns' && (
        <div className="space-y-6">
          {/* Contradiction Reconciliation Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Memory Reconciliation & Contradiction Detection</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">
                {contradictions.filter(c => c.status === 'detected').length} active divergence(s)
              </span>
            </div>

            {contradictions.length === 0 ? (
              <div className="p-5 rounded-2xl bg-gray-900/40 border border-gray-800 text-center text-xs text-gray-400">
                No active contradictions detected across your life model.
              </div>
            ) : (
              <div className="space-y-3">
                {contradictions.map(c => (
                  <div key={c.id} className="p-5 rounded-3xl bg-gray-900/60 border border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">{c.topic}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${c.status === 'reconciled' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {c.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-2xl bg-gray-850 border border-gray-800 space-y-1">
                        <span className="text-[10px] font-mono text-gray-400">Earlier View ({c.olderVersion.date})</span>
                        <p className="text-gray-200 italic">"{c.olderVersion.text}"</p>
                      </div>
                      <div className="p-3 rounded-2xl bg-gray-850 border border-gray-800 space-y-1">
                        <span className="text-[10px] font-mono text-cyan-400">Recent View ({c.newerVersion.date})</span>
                        <p className="text-gray-200 italic">"{c.newerVersion.text}"</p>
                      </div>
                    </div>

                    {c.status === 'detected' && (
                      <div className="border-t border-gray-800 pt-3 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-gray-400">Reconcile preference:</span>
                        <button
                          onClick={() => handleResolveContradiction(c.id, 'keep_both_historically')}
                          className="px-2.5 py-1 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold cursor-pointer"
                        >
                          Keep Both Historically (Evolution)
                        </button>
                        <button
                          onClick={() => handleResolveContradiction(c.id, 'keep_newer')}
                          className="px-2.5 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer"
                        >
                          Adopt Newer Preference
                        </button>
                        <button
                          onClick={() => handleResolveContradiction(c.id, 'dismissed')}
                          className="px-2.5 py-1 rounded-xl bg-gray-800 text-gray-400 text-xs cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Life Pattern Observations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Discovered Patterns & Heuristics</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">{patterns.length} pattern(s) verified</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map(p => (
                <div key={p.id} className="p-5 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {(p?.category || 'pattern').replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Confidence: <strong className="text-cyan-400 uppercase">{p.confidence}</strong>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-gray-100">{p.title}</h4>
                    <p className="text-xs text-gray-300 leading-relaxed">{p.observation}</p>
                  </div>

                  {/* Supporting Evidence */}
                  <div className="space-y-1 border-t border-gray-800 pt-2 text-[10px] text-gray-400 font-mono">
                    <div className="flex justify-between text-gray-400">
                      <span>Observed: {p.observationCount} times</span>
                      <span>Range: {p.timeRange.start} to {p.timeRange.end}</span>
                    </div>
                    {p.supportingEvidence.slice(0, 1).map((e, idx) => (
                      <p key={idx} className="italic text-gray-500 truncate">Evidence: "{e.snippet}"</p>
                    ))}
                  </div>

                  {/* Alternative Interpretation */}
                  {p.alternativeInterpretation && (
                    <div className="p-2.5 rounded-xl bg-gray-850 border border-gray-800 text-[11px] text-gray-400">
                      <span className="font-semibold text-gray-300">Alternative view: </span>
                      {p.alternativeInterpretation}
                    </div>
                  )}

                  {/* Why am I seeing this */}
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono">
                    <HelpCircle className="h-3 w-3 text-cyan-500/70 shrink-0" />
                    <span className="truncate">{p.whyAmISeeingThis}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: DECISIONS & OPPORTUNITIES */}
      {activeSubTab === 'decisions' && (
        <div className="space-y-6">
          {/* Opportunities Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>Implied Opportunities</span>
            </h3>

            {opportunities.length === 0 ? (
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800 text-center text-xs text-gray-400">
                No new opportunities implied.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {opportunities.map(o => (
                  <div key={o.id} className="p-4 rounded-2xl bg-gray-900/60 border border-purple-500/20 space-y-2">
                    <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">{(o?.type || 'opportunity').replace('_', ' ')}</span>
                    <h4 className="text-xs font-bold text-gray-100">{o.title}</h4>
                    <p className="text-xs text-gray-300">{o.observation}</p>
                    <div className="text-[10px] text-gray-400 font-mono border-t border-gray-800 pt-1.5 flex items-center gap-1">
                      <HelpCircle className="h-3 w-3 text-purple-400 shrink-0" />
                      <span>{o.whyAmISeeingThis}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unfinished Business */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Unfinished Business</span>
            </h3>

            {unfinishedItems.length === 0 ? (
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-800 text-center text-xs text-gray-400">
                All projects, decisions, and goals are actively updated.
              </div>
            ) : (
              <div className="space-y-2">
                {unfinishedItems.map(item => (
                  <div key={item.id} className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                          {item.itemType}
                        </span>
                        <h4 className="text-xs font-bold text-gray-100">{item.title}</h4>
                      </div>
                      <p className="text-xs text-gray-300">{item.description}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{item.whyAmISeeingThis}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUnfinishedAction(item.id, 'continue')}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold cursor-pointer"
                      >
                        Continue Work
                      </button>
                      <button
                        onClick={() => handleUnfinishedAction(item.id, 'remind_later')}
                        className="px-3 py-1.5 rounded-xl bg-gray-800 text-gray-300 text-xs cursor-pointer"
                      >
                        Remind Later
                      </button>
                      <button
                        onClick={() => handleUnfinishedAction(item.id, 'archive')}
                        className="px-3 py-1.5 rounded-xl bg-gray-850 text-gray-500 text-xs cursor-pointer"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decision Journal & Post-Decision Learning */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
              <Compass className="h-4 w-4 text-cyan-400" />
              <span>Decision Journal & Expected vs Actual Reviews</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {decisions.map(d => (
                <div key={d.id} className="p-5 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-100">{d.title}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${d.status === 'reviewed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                      {d.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="text-gray-300"><strong className="text-gray-200">Reasoning: </strong>{d.reasoning}</p>
                    <p className="text-gray-300"><strong className="text-gray-200">Expected Outcome: </strong>{d.expectedOutcome}</p>
                  </div>

                  {d.actualOutcome ? (
                    <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-1.5 text-xs">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">Outcome Review</span>
                      <p className="text-gray-200"><strong className="text-emerald-300">What Happened: </strong>{d.actualOutcome.whatHappened}</p>
                      {d.actualOutcome.lessonsLearned.length > 0 && (
                        <p className="text-gray-200"><strong className="text-emerald-300">Lesson: </strong>{d.actualOutcome.lessonsLearned[0]}</p>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedDecisionForReview(d)}
                      className="w-full py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold cursor-pointer transition-all"
                    >
                      Conduct Expected vs Actual Review
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Decision Review Modal */}
          {selectedDecisionForReview && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-lg w-full p-6 rounded-3xl bg-gray-900 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-100">Review Decision Outcome</h3>
                    <p className="text-xs text-gray-400">"{selectedDecisionForReview.title}"</p>
                  </div>
                  <button onClick={() => setSelectedDecisionForReview(null)} className="text-gray-400 hover:text-gray-200 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmitDecisionReview} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-mono">What actually happened?</label>
                    <textarea
                      value={reviewWhatHappened}
                      onChange={e => setReviewWhatHappened(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-200"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-gray-300 font-mono">What was correct?</label>
                      <input
                        type="text"
                        value={reviewWhatWasCorrect}
                        onChange={e => setReviewWhatWasCorrect(e.target.value)}
                        className="w-full p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-gray-300 font-mono">What was wrong / unexpected?</label>
                      <input
                        type="text"
                        value={reviewWhatWasWrong}
                        onChange={e => setReviewWhatWasWrong(e.target.value)}
                        className="w-full p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 font-mono">Lessons to save into Knowledge Vault:</label>
                    <textarea
                      value={reviewLessons}
                      onChange={e => setReviewLessons(e.target.value)}
                      placeholder="One lesson per line..."
                      rows={2}
                      className="w-full p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-200"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDecisionForReview(null)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold cursor-pointer"
                    >
                      Finalize Review & Promote Lessons
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: FUTURE SELF & EXPERIMENTS */}
      {activeSubTab === 'future' && (
        <div className="space-y-6">
          {/* Future Self Studio Trajectories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
                <Compass className="h-4 w-4 text-cyan-400" />
                <span>Future Self Studio (3-Year Horizon Trajectories)</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">Multi-Path Trajectory Modeling</span>
            </div>

            {futureProfile && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {futureProfile.scenarios.map((scen, idx) => (
                  <div key={scen.id} className="p-5 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">Scenario {String.fromCharCode(65 + idx)}</span>
                      <h4 className="text-sm font-bold text-gray-100 leading-snug">{scen.name}</h4>
                      <p className="text-xs text-gray-300 leading-relaxed">{scen.focusDimensions.career}</p>

                      <div className="space-y-1 text-[11px] text-gray-400 border-t border-gray-800 pt-2">
                        <span className="font-semibold text-gray-300">Potential Trade-offs:</span>
                        <ul className="list-disc pl-4 space-y-0.5">
                          {scen.potentialTradeOffs.map((to, i) => (
                            <li key={i}>{to}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-[10px] text-cyan-300 font-mono">
                      {scen.estimatedTrajectory}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scenario Engine: "What If I..." Simulator */}
          <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span>Scenario Engine ("What if I..." Simulator)</span>
              </h3>
              <p className="text-xs text-gray-400">
                Grounded simulation separating known data, user assumptions, AI reasoning, and explicit uncertainty without fortune-telling.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={scenarioPrompt}
                onChange={e => setScenarioPrompt(e.target.value)}
                placeholder="What if I..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleRunScenario}
                disabled={simulating}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {simulating ? 'Simulating...' : 'Simulate Trajectory'}
              </button>
            </div>

            {activeSimulation && (
              <div className="p-5 rounded-2xl bg-gray-850 border border-cyan-500/20 space-y-3 text-xs">
                <h4 className="font-bold text-cyan-300">Simulation: "{activeSimulation.prompt}"</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">1. Known Information</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-gray-300">
                      {activeSimulation.knownInformation.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">2. User Assumptions</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-gray-300">
                      {activeSimulation.userAssumptions.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                    <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">3. AI Reasoning</span>
                    <p className="text-gray-300">{activeSimulation.aiReasoning}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">4. Explicit Uncertainties</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-amber-200/90">
                      {activeSimulation.uncertainties.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-200">
                  <strong>Trade-off Summary: </strong>{activeSimulation.tradeOffAnalysis}
                </div>
              </div>
            )}
          </div>

          {/* Personal Experiments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-100 uppercase font-mono tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                <span>Personal Experiments (Methodical Hypothesis Testing)</span>
              </h3>
              <button
                onClick={() => setShowExpModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Experiment</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {experiments.map(exp => (
                <div key={exp.id} className="p-5 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-100">{exp.title}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${exp.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                      {exp.status.toUpperCase()} ({exp.dailyObservations.length}/{exp.targetDurationDays} days)
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed"><strong className="text-gray-200">Intention: </strong>{exp.intention}</p>

                  {exp.dailyObservations.length > 0 && (
                    <div className="space-y-1 text-[11px] text-gray-400 border-t border-gray-800 pt-2">
                      <span className="font-semibold text-gray-300">Latest Observation:</span>
                      <p className="italic">"{exp.dailyObservations[exp.dailyObservations.length - 1].notes}"</p>
                    </div>
                  )}

                  {exp.lessonsExtracted.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300">
                      <strong>Lesson Extracted to Vault: </strong>{exp.lessonsExtracted[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* New Experiment Modal */}
          {showExpModal && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="max-w-md w-full p-6 rounded-3xl bg-gray-900 border border-gray-800 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <h3 className="text-sm font-bold text-gray-100">Start Personal Experiment</h3>
                  <button onClick={() => setShowExpModal(false)} className="text-gray-400 hover:text-gray-200 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleStartExperiment} className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-300 font-mono">Title</label>
                    <input
                      type="text"
                      value={newExpTitle}
                      onChange={e => setNewExpTitle(e.target.value)}
                      placeholder="e.g. 14 Days of Digital Evening Shutdown"
                      className="w-full p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-200"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 font-mono">Hypothesis / Intention</label>
                    <textarea
                      value={newExpIntention}
                      onChange={e => setNewExpIntention(e.target.value)}
                      placeholder="What are you evaluating and why?"
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-200"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-300 font-mono">Target Duration (Days)</label>
                    <input
                      type="number"
                      value={newExpDays}
                      onChange={e => setNewExpDays(Number(e.target.value))}
                      min={3}
                      max={90}
                      className="w-full p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-200"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowExpModal(false)}
                      className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold cursor-pointer"
                    >
                      Launch Experiment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 6: CONVERSATIONAL SEARCH & DATA PORTABILITY */}
      {activeSubTab === 'search_portability' && (
        <div className="space-y-6">
          {/* Conversational Personal Search Assistant */}
          <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <Search className="h-4 w-4 text-cyan-400" />
                <span>Conversational Personal Search Assistant</span>
              </h3>
              <p className="text-xs text-gray-400">
                Ground queries strictly across your life model with evidence citations. "Find the first time I wrote about...", "What did I learn from...", "When did I change my mind about..."
              </p>
            </div>

            <form onSubmit={handleExecuteSearch} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Ask your life model a question (e.g. invariants architecture, remote work, focus)..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {searching ? 'Searching...' : 'Search Life Model'}
              </button>
            </form>

            {/* Pre-canned query chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['invariants architecture', 'remote work', 'morning focus', 'sovereignty'].map(chip => (
                <button
                  key={chip}
                  onClick={() => setSearchQuery(chip)}
                  className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 text-[11px] font-mono cursor-pointer transition-all"
                >
                  "{chip}"
                </button>
              ))}
            </div>

            {searchAnswer && (
              <div className="p-5 rounded-2xl bg-gray-850 border border-cyan-500/20 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="font-bold text-cyan-300">Answer for: "{searchAnswer.query}"</span>
                  {searchAnswer.temporalEvolution && (
                    <span className="text-[10px] text-indigo-400 font-mono">{searchAnswer.temporalEvolution}</span>
                  )}
                </div>

                <p className="text-gray-200 leading-relaxed">{searchAnswer.summary}</p>

                {searchAnswer.evidence.length > 0 && (
                  <div className="space-y-2 border-t border-gray-800 pt-2">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block font-bold">
                      Grounded Evidence Citations ({searchAnswer.evidence.length})
                    </span>
                    {searchAnswer.evidence.map((ev, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                          <span className="capitalize text-indigo-300">[{ev.sourceType}] Date: {ev.date}</span>
                          <span>Relevance: {Math.round(ev.relevanceScore * 100)}%</span>
                        </div>
                        <p className="text-gray-300 italic">"{ev.snippet}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sovereign Data Portability & Life Chronicle */}
          <div className="p-6 rounded-3xl bg-gray-900/60 border border-gray-800 space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <Download className="h-4 w-4 text-cyan-400" />
                <span>Sovereign Data Portability & Life Chronicle</span>
              </h3>
              <p className="text-xs text-gray-400">
                Full export of your personal life model with clear separation between user-authored data and AI inferences.
              </p>
            </div>

            {portabilityMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{portabilityMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={handleExportJSON}
                className="p-4 rounded-2xl bg-gray-850 hover:bg-gray-800 border border-gray-700 text-left space-y-1.5 cursor-pointer transition-all"
              >
                <FileText className="h-5 w-5 text-cyan-400" />
                <h4 className="text-xs font-bold text-gray-100">Full Life Model (JSON)</h4>
                <p className="text-[10px] text-gray-400">Cryptographically signed manifest of all personal dimensions.</p>
              </button>

              <button
                onClick={handleExportMarkdown}
                className="p-4 rounded-2xl bg-gray-850 hover:bg-gray-800 border border-gray-700 text-left space-y-1.5 cursor-pointer transition-all"
              >
                <BookOpen className="h-5 w-5 text-indigo-400" />
                <h4 className="text-xs font-bold text-gray-100">Life Chronicle (Markdown)</h4>
                <p className="text-[10px] text-gray-400">Clean, human-readable book of journals, lessons, and chapters.</p>
              </button>

              <button
                onClick={handleCompileAnnualBook}
                className="p-4 rounded-2xl bg-gray-850 hover:bg-gray-800 border border-gray-700 text-left space-y-1.5 cursor-pointer transition-all"
              >
                <Calendar className="h-5 w-5 text-purple-400" />
                <h4 className="text-xs font-bold text-gray-100">Annual Life Book ("My Year")</h4>
                <p className="text-[10px] text-gray-400">Synthesize major milestones, lessons, and meaningful quotes.</p>
              </button>
            </div>

            {annualBook && (
              <div className="p-5 rounded-2xl bg-gray-850 border border-purple-500/20 space-y-2 text-xs">
                <h4 className="font-bold text-purple-300">{annualBook.title}</h4>
                <p className="text-gray-300 italic">{annualBook.themeStatement}</p>
                <div className="space-y-1 text-gray-400 border-t border-gray-800 pt-2">
                  <span className="font-semibold text-gray-200">Key Achievements:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {annualBook.achievements.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
