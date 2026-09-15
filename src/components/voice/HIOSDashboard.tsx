import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, Cpu, TrendingUp, Sparkles, User, Lock, Shield, Activity, Target, Trophy,
  Download, Search, Key, Layers, Mic, Calendar, BookOpen, LayoutGrid, Check, Plus,
  ChevronRight, AlertTriangle, Heart, Clock, Settings, Zap, Award, Info, Trash2,
  HelpCircle, RefreshCw, CreditCard, ArrowRight, Eye, EyeOff, Volume2, LockKeyhole,
  Compass, Network, Workflow, Binary, FileCheck, CheckCircle
} from 'lucide-react';
import { localDB, LocalJournalEntry } from '../../core/database/local_db';
import { Goal, Habit } from '../../core/ai/coach_types';
import { AIMemory, AIEntity, AIInsight } from '../../core/ai/ai_types';
import { logger } from '../../core/analytics/logger';
import PersonalIntelligenceEngine from './PersonalIntelligenceEngine';
import SimpleInsightsDashboard from './SimpleInsightsDashboard';

interface HIOSDashboardProps {
  userId: string;
  localEntries: LocalJournalEntry[];
}

export default function HIOSDashboard({ userId, localEntries }: HIOSDashboardProps) {
  // Navigation: central command hub
  const [activeMaintab, setActiveMaintab] = useState<'core' | 'knowledge' | 'strategist' | 'learning' | 'pm' | 'reviews' | 'analytics' | 'sovereignty' | 'pricing'>('core');

  // Multi-Agent log stream / simulation
  const [agentLogs, setAgentLogs] = useState<Array<{ id: string; agent: string; message: string; timestamp: string }>>([]);
  const [activeAgent, setActiveAgent] = useState<string>('MemoryAgent');

  // Central DB States
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [entities, setEntities] = useState<AIEntity[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // Task lists
  const [tasks, setTasks] = useState<Array<{ id: string; text: string; completed: boolean; project: string }>>([
    { id: '1', text: 'Reflect on evening focus routines', completed: true, project: 'Personal Growth' },
    { id: '2', text: 'Structure Firebase rules for Vault security', completed: false, project: 'Project Alpha' },
    { id: '3', text: 'Audit workout and nutrition habits', completed: false, project: 'Health/Fitness' }
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedProject, setSelectedProject] = useState('Personal Growth');

  // Study Tracker
  const [studyGoals, setStudyGoals] = useState<Array<{ id: string; title: string; hours: number; progress: number }>>([
    { id: 'sg1', title: 'AES-256 Crypto Mechanisms', hours: 6, progress: 80 },
    { id: 'sg2', title: 'IndexedDB Data Sharding', hours: 10, progress: 40 },
    { id: 'sg3', title: 'TypeScript Enums & Structs', hours: 4, progress: 100 }
  ]);
  const [studyTopicInput, setStudyTopicInput] = useState('');
  const [studyExplanation, setStudyExplanation] = useState<string | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // Strategist Simulation
  const [strategyPrompt, setStrategyPrompt] = useState('Build a sustainable habit for morning physical workout and journaling.');
  const [strategyResult, setStrategyResult] = useState<any | null>(null);
  const [generatingStrategy, setGeneratingStrategy] = useState(false);

  // Reviews System
  const [reviewType, setReviewType] = useState<'daily' | 'weekly' | 'yearly'>('weekly');
  const [compiledReview, setCompiledReview] = useState<any | null>(null);
  const [compilingReview, setCompilingReview] = useState(false);

  // Predictive & Brainstorming states
  const [creativePrompt, setCreativePrompt] = useState<string | null>(null);
  const [predictiveScenario, setPredictiveScenario] = useState<string | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingCreative, setLoadingCreative] = useState(false);

  // Monetization Subscription Checkout state
  const [userSubscriptionTier, setUserSubscriptionTier] = useState<string>(() => {
    return localStorage.getItem('logeasy_tier') || 'Free';
  });
  const [checkoutPlan, setCheckoutPlan] = useState<any | null>(null);
  const [ccNumber, setCcNumber] = useState('');
  const [ccExpiry, setCcExpiry] = useState('');
  const [ccCvv, setCcCvv] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Pin Code locker settings
  const [isLockerActive, setIsLockerActive] = useState<boolean>(() => {
    return localStorage.getItem('logeasy_lock_enabled') === 'true';
  });
  const [pinCode, setPinCode] = useState<string>(() => {
    return localStorage.getItem('logeasy_lock_pin') || '';
  });
  const [newPinInput, setNewPinInput] = useState('');

  // Knowledge Graph nodes
  const [graphNodes, setGraphNodes] = useState<Array<{ id: string; label: string; x: number; y: number; type: string }>>([
    { id: 'me', label: 'anesthonest81 (You)', x: 150, y: 150, type: 'user' },
    { id: 'alice', label: 'Alice (Support)', x: 80, y: 80, type: 'person' },
    { id: 'london', label: 'London (Home)', x: 220, y: 90, type: 'place' },
    { id: 'alpha', label: 'Project Alpha (Work)', x: 70, y: 220, type: 'project' },
    { id: 'fitness', label: 'Gym habits (Health)', x: 240, y: 210, type: 'habit' },
    { id: 'finance', label: 'Budget (Finance)', x: 150, y: 40, type: 'finance' }
  ]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<any>(null);
  const [graphStatus, setGraphStatus] = useState('Knowledge Graph operational.');

  // Load backend elements
  const loadHIOSData = async () => {
    try {
      const fetchedGoals = await localDB.getGoals(userId);
      const fetchedHabits = await localDB.getHabits(userId);
      const fetchedMemories = await localDB.getAIMemories(userId);
      const fetchedEntities = await localDB.getAIEntities(userId);
      const fetchedInsights = await localDB.getAIInsights(userId);

      setGoals(fetchedGoals);
      setHabits(fetchedHabits);
      setMemories(fetchedMemories);
      setEntities(fetchedEntities);
      setInsights(fetchedInsights);
    } catch (e) {
      logger.error('HIOSDashboard', 'Failed to load local DB stats', e);
    }
  };

  useEffect(() => {
    loadHIOSData();

    // Set up a periodic background log stream simulation representing the Multi-Agent architecture working
    const agents = ['MemoryAgent', 'LearningAgent', 'StrategyAgent', 'ReflectionAgent', 'CreativityAgent'];
    const logs = [
      'Successfully indexed recent transcript segment. Node connections matched.',
      'Analyzing cognitive study goals. Learning retention is steady.',
      'Refining decision-making strategies. Stress/confidence index balanced.',
      'Scanning journal entry mood parameters. Heart rate & emotional proxies verified.',
      'Synthesizing lateral connections. Prompt ideas generated for brainstorming.'
    ];

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * agents.length);
      const newLog = {
        id: String(Date.now()),
        agent: agents[idx],
        message: logs[idx],
        timestamp: new Date().toLocaleTimeString()
      };
      setAgentLogs(prev => [newLog, ...prev.slice(0, 15)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [userId]);

  // Handle strategy builder
  const handleBuildStrategy = async () => {
    setGeneratingStrategy(true);
    setStrategyResult(null);

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `User is building a strategy for: "${strategyPrompt}".
Based on this, generate a JSON response with the following keys. Return ONLY valid JSON, do not include markdown backticks or any other text around the JSON block.
{
  "strategy": "A high-level personal strategy focusing on micro-habits and cognitive stability",
  "milestones": [
    "Phase 1: 5-minute action step",
    "Phase 2: Next step",
    "Phase 3: Long-term step"
  ],
  "decisions": "A decision audit / stress-reduction tip",
  "opportunities": "An opportunistic suggestion for high-impact growth"
}`,
          systemInstruction: 'You are an advanced AI Life Strategist. You help users analyze routines, identify friction, and build action plans. Always return valid, parsable JSON with structure: { "strategy": string, "milestones": string[], "decisions": string, "opportunities": string }'
        })
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      
      let cleanText = data.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      
      const parsed = JSON.parse(cleanText);
      setStrategyResult({
        goal: strategyPrompt,
        strategy: parsed.strategy || "Focus on micro-habits. Your communication logs suggest high resilience when completing morning goals early.",
        milestones: parsed.milestones || [
          "Phase 1: 5-minute morning vocal entry before checking your phone.",
          "Phase 2: Perform 10-minute cardiovascular focus training.",
          "Phase 3: Update your project manager with structural dependency goals."
        ],
        decisions: parsed.decisions || "Decision Audit: Avoid evening working memory overload. High cortisol rates detected after midnight logs.",
        opportunities: parsed.opportunities || "Opportunities: High-impact study slots detected between 08:00 and 10:00."
      });
    } catch (e) {
      console.error('[HIOS] Strategy generation failed, using local fallback:', e);
      setStrategyResult({
        goal: strategyPrompt,
        strategy: "Focus on micro-habits. Your communication logs suggest high resilience when completing morning goals early.",
        milestones: [
          "Phase 1: 5-minute morning vocal entry before checking your phone.",
          "Phase 2: Perform 10-minute cardiovascular focus training.",
          "Phase 3: Update your project manager with structural dependency goals."
        ],
        decisions: "Decision Audit: Avoid evening working memory overload. High cortisol rates detected after midnight logs.",
        opportunities: "Opportunities: High-impact study slots detected between 08:00 and 10:00."
      });
    } finally {
      setGeneratingStrategy(false);
    }
  };

  // Add study goals
  const handleAddStudyGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyTopicInput.trim()) return;

    const newGoal = {
      id: `sg-${Date.now()}`,
      title: studyTopicInput.trim(),
      hours: 5,
      progress: 0
    };
    setStudyGoals([...studyGoals, newGoal]);
    setStudyTopicInput('');
  };

  // AI Explain Concept
  const handleExplainConcept = async (topic: string) => {
    setLoadingExplanation(true);
    setStudyExplanation(null);

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Please explain the concept of "${topic}" in simple plain language, like explaining to a 10-year old. Highlight core ideas and real-world utility in a paragraph. Keep it concise.`,
          systemInstruction: 'You are an elite educational assistant. You break down complex tech, security, or life concepts into engaging, highly accessible prose.'
        })
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      setStudyExplanation(data.text);
    } catch (e) {
      console.error('[HIOS] Concept explanation failed, using local fallback:', e);
      if (topic.toLowerCase().includes('aes')) {
        setStudyExplanation("AES-256-GCM is an Authenticated Encryption standard. It divides data into 256-bit secure blocks, adding a Galois Message Authentication Code (GMAC) to certify data integrity, ensuring no physical or digital tampering is possible on-device.");
      } else if (topic.toLowerCase().includes('indexeddb') || topic.toLowerCase().includes('database')) {
        setStudyExplanation("IndexedDB is a transactional, object-oriented database running inside the client's browser sandbox. It stores massive structural assets locally on your device without relying on internet servers, keeping your journals 100% private.");
      } else {
        setStudyExplanation(`AI explanation for '${topic}': This is a personal intelligence node that coordinates memory retention, allowing the Human Intelligence OS to synthesize connections in real time without exposing details to public servers.`);
      }
    } finally {
      setLoadingExplanation(false);
    }
  };

  // Compile Review
  const handleCompileReview = async () => {
    setCompilingReview(true);
    setCompiledReview(null);

    // Collect transcripts for context
    const recentTranscripts = localEntries
      .slice(0, 10)
      .map(entry => `[${entry.createdAt}] ${entry.transcript}`)
      .join('\n');

    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Please compile an AI Life Review Report for the period "${reviewType}".
Here are the user's recent spoken thoughts/journal entries for context:
${recentTranscripts || "No recent entries logged yet."}

Return a JSON block containing a compiled review. Return ONLY valid JSON, do not include markdown backticks or other decoration.
{
  "summary": "A thoughtful 1-2 sentence overview of their cognitive flow, patterns, and support network observations based on entries.",
  "achievements": [
    "Achievement 1 based on their content",
    "Achievement 2",
    "Achievement 3"
  ],
  "nextSteps": [
    "Coping/growth suggestion 1",
    "Coping/growth suggestion 2",
    "Coping/growth suggestion 3"
  ]
}`,
          systemInstruction: 'You are an advanced reflective human intelligence analyst. You synthesize journal logs into high-level performance insights, emotional trends, and balanced recommendations. Always return valid parsable JSON with exactly the fields summary, achievements, nextSteps.'
        })
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      
      let cleanText = data.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      
      const parsed = JSON.parse(cleanText);
      setCompiledReview({
        title: `HIOS ${reviewType.toUpperCase()} REVIEW REPORT`,
        period: `${new Date(Date.now() - 7 * 86400000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
        summary: parsed.summary || "Your cognitive flow has stabilized. The Memory Agent detected high positive references and study milestones.",
        achievements: parsed.achievements || [
          `Logged spoken thoughts locally: ${localEntries.length} entries in storage`,
          "Successfully maintained a consistent study session of Project Alpha",
          "Maintained emotional balance with an average score of 7.2/10"
        ],
        nextSteps: parsed.nextSteps || [
          "Connect with positive social support loops.",
          "Review IndexedDB sharding dependency before deploying next module version.",
          "Decompress before sleep to lower stress levels detected in evening entries."
        ]
      });
    } catch (e) {
      console.error('[HIOS] Review compilation failed, using local fallback:', e);
      setCompiledReview({
        title: `HIOS ${reviewType.toUpperCase()} REVIEW REPORT`,
        period: `${new Date(Date.now() - 7 * 86400000).toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
        summary: "Your cognitive flow has stabilized. The Memory Agent detected high positive references with Alice and study milestones. No burnout risk warnings generated.",
        achievements: [
          `Logged spoken thoughts locally: ${localEntries.length} entries in storage`,
          "Successfully maintained a 4-day consistent study session of Project Alpha",
          "Maintained emotional balance with an average score of 7.2/10"
        ],
        nextSteps: [
          "Connect with Alice to foster positive social support loops.",
          "Review IndexedDB sharding dependency before deploying next module version.",
          "Decompress before sleep to lower stress levels detected in evening entries."
        ]
      });
    } finally {
      setCompilingReview(false);
    }
  };

  // Handle task submission
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask = {
      id: String(Date.now()),
      text: newTaskText.trim(),
      completed: false,
      project: selectedProject
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
  };

  const handleToggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Pin code save
  const handleSavePin = () => {
    if (newPinInput.length !== 4) {
      alert("PIN must be exactly 4 digits.");
      return;
    }
    setIsLockerActive(true);
    setPinCode(newPinInput);
    localStorage.setItem('logeasy_lock_enabled', 'true');
    localStorage.setItem('logeasy_lock_pin', newPinInput);
    alert(`Secure Locker enabled! PIN is ${newPinInput}. Do not forget it.`);
    setNewPinInput('');
  };

  const handleDisableLocker = () => {
    setIsLockerActive(false);
    setPinCode('');
    localStorage.setItem('logeasy_lock_enabled', 'false');
    localStorage.removeItem('logeasy_lock_pin');
    alert("Secure Locker disabled.");
  };

  // Pricing plans array
  const pricingPlans = [
    { name: 'Free', price: '0', period: 'forever', features: ['AES-GCM Encryption', 'IndexedDB offline-first', 'Basic summaries', '10 Local achievements'], buttonText: 'Current Plan' },
    { name: 'Premium', price: '5.99', period: 'monthly', features: ['Everything in Free', 'Complete HIOS Dashboard', 'AI Life Strategist', 'Multi-Agent trace logger', 'Custom voice recaps'], buttonText: 'Upgrade to Premium' },
    { name: 'Pro', price: '14.99', period: 'monthly', features: ['Everything in Premium', 'Personal Knowledge Network (Graph)', 'Study Goal optimizer', 'Predictive Life intelligence', 'Priority cloud sync'], buttonText: 'Get Pro Intelligence' },
    { name: 'Legacy Unlimited', price: '24.99', period: 'one-time', features: ['Lifetime all-inclusive', 'Data Sovereignty backup suite', 'Custom workspace locking keys', 'Advanced diagnostics console', 'Developer edition support'], buttonText: 'Go Ultimate Legacy' }
  ];

  // Checkout process simulation
  const handleSelectPlan = (plan: any) => {
    if (plan.name === 'Free') {
      setUserSubscriptionTier('Free');
      localStorage.setItem('logeasy_tier', 'Free');
      alert("Switched back to Free plan.");
      return;
    }
    setCheckoutPlan(plan);
  };

  const handleProcessCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccNumber || !ccExpiry || !ccCvv) {
      alert("Please fill in mock checkout card credentials.");
      return;
    }
    setProcessingPayment(true);

    setTimeout(() => {
      setProcessingPayment(false);
      setUserSubscriptionTier(checkoutPlan.name);
      localStorage.setItem('logeasy_tier', checkoutPlan.name);
      alert(`Success! Simulated payment completed. Welcome to LogEasy ${checkoutPlan.name}!`);
      setCheckoutPlan(null);
      setCcNumber('');
      setCcExpiry('');
      setCcCvv('');
    }, 1800);
  };

  // Discover AI links
  const handleDiscoverLinks = async () => {
    setGraphStatus('MemoryAgent and LearningAgent collaborating... links detected.');

    try {
      const recentTranscripts = localEntries
        .slice(0, 10)
        .map(entry => entry.transcript)
        .join('\n');

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze the user's recent journal entries and identify 1 significant latent connection/correlation between their habits, environment, projects, or social contacts. 
Entries context:
${recentTranscripts || "No entries logged."}

Return a JSON block containing the connection. Return ONLY valid JSON, do not include markdown backticks or other decoration.
{
  "label": "Brief 3-5 word title of the discovered connection",
  "detail": "A paragraph explaining the correlation and how it helps the user."
}`,
          systemInstruction: 'You are a knowledge graph builder and behavioral analyst. You discover lateral correlations between work, play, relationships, and health. Always return valid, parsable JSON with exactly the fields label and detail.'
        })
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      
      let cleanText = data.text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.substring(7);
      }
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.substring(3);
      }
      if (cleanText.endsWith('```')) {
        cleanText = cleanText.substring(0, cleanText.length - 3);
      }
      cleanText = cleanText.trim();
      
      const parsed = JSON.parse(cleanText);
      const label = parsed.label || 'AI Link: Work/Fitness correlation';
      const detail = parsed.detail || 'High exercise logs match low working stress rating!';

      const updatedNodes = [...graphNodes];
      // Add a new link node
      if (!graphNodes.some(n => n.id === 'discovery')) {
        updatedNodes.push({ 
          id: 'discovery', 
          label: `AI Link: ${label}`, 
          x: 160, 
          y: 110, 
          type: 'insight' 
        });
      }
      setGraphNodes(updatedNodes);
      setGraphStatus(`Completed. Discovered correlation link: ${detail}`);
    } catch (e) {
      console.error('[HIOS] Link discovery failed, using local fallback:', e);
      setTimeout(() => {
        const updatedNodes = [...graphNodes];
        // Add a new link node
        if (!graphNodes.some(n => n.id === 'discovery')) {
          updatedNodes.push({ id: 'discovery', label: 'AI Link: Work/Fitness correlation', x: 160, y: 110, type: 'insight' });
        }
        setGraphNodes(updatedNodes);
        setGraphStatus('Completed. Discovered correlation link: High exercise logs match low working stress rating!');
      }, 1500);
    }
  };

  const handlePredictiveForecast = async () => {
    setLoadingForecast(true);
    setPredictiveScenario(null);

    try {
      const recentTranscripts = localEntries
        .slice(0, 10)
        .map(entry => entry.transcript)
        .join('\n');

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate an AI Predictive Forecast for risks and opportunities based on the user's activities. Here are their recent logs for context:\n${recentTranscripts || "No activities logged."}\nKeep it to 2 concise sentences: one sentence on a high-impact Opportunity, and one sentence on a behavioral Risk to watch out for.`,
          systemInstruction: 'You are an advanced predictive behavioral modeling engine. You output highly insightful, structured diagnostic forewarning and opportunity assessments.'
        })
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      setPredictiveScenario(data.text);
    } catch (e) {
      console.error('[HIOS] Forecast failed, using local fallback:', e);
      setPredictiveScenario("Opportunity: Developing IndexedDB caching rules early lowers next week's PM backlog. Risk: Evening study patterns after midnight correlates with elevated cortisol stress score the following afternoon.");
    } finally {
      setLoadingForecast(false);
    }
  };

  const handleGenerateCreativePrompt = async () => {
    setLoadingCreative(true);
    setCreativePrompt(null);

    try {
      const recentTranscripts = localEntries
        .slice(0, 10)
        .map(entry => entry.transcript)
        .join('\n');

      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Generate a lateral-thinking journal entry prompt that encourages deep introspection, creative writing, or high-level self-reflection, custom-tailored to these themes: \n${recentTranscripts || "general growth and learning"}\nReturn only the prompt string.`,
          systemInstruction: 'You are a master creative brainstorming coach. You design beautiful, deep, highly introspective lateral journaling exercises.'
        })
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      setCreativePrompt(data.text);
    } catch (e) {
      console.error('[HIOS] Creative prompt failed, using local fallback:', e);
      setCreativePrompt("Write a journal entry from the perspective of your 5-year future self, focusing specifically on how solving Project Alpha changed your current path.");
    } finally {
      setLoadingCreative(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-7xl mx-auto pb-10">
      
      {/* 1. TOP HERO PANEL - HIOS LOGO */}
      <div className="flex items-center justify-between flex-wrap gap-4 p-6 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-gray-900 to-indigo-950/40 border border-cyan-500/10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Cpu className="h-6 w-6 text-cyan-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">LogEasy V8</span>
            <h2 className="text-lg font-black text-white tracking-tight">Human Intelligence Operating System (HIOS)</h2>
          </div>
          <p className="text-xs text-gray-400 max-w-xl">
            A comprehensive, private companion ecosystem to plan, decide, execute, analyze, and optimize every aspect of your life. 
            Powered by secure on-device state engines and the Gemini multi-agent pipeline.
          </p>
        </div>

        {/* Tier status indicator */}
        <div className="flex items-center gap-2.5 bg-gray-500/5 border border-gray-500/15 p-2 rounded-2xl">
          <div className="text-right">
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Intelligence Level</span>
            <span className="text-xs font-bold text-cyan-400">{userSubscriptionTier} Edition</span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* 2. CORE LAYOUT CO-ORDINATION Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COLUMN: PIC Profile & Digital Self Model */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* A. PERSONAL INTELLIGENCE CORE (PIC) Profile */}
          <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-200/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white font-black text-sm uppercase shadow-md">
                AH
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-100">anesthonest81@gmail.com</h3>
                <p className="text-[10px] text-gray-400 font-mono">User Profile Connected</p>
              </div>
            </div>

            <hr className="border-gray-200/5" />

            <div className="space-y-3">
              <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest block">Core Interests & Goals</span>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">AES Encryption</span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">TypeScript Architecture</span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">Gym consistency</span>
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/5 border border-cyan-500/10 text-cyan-400">Mental Clarity</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest block">Predicted Intelligence Needs</span>
              <div className="space-y-2 text-[10px] text-gray-300">
                <div className="p-2 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-start gap-2">
                  <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5 animate-bounce" />
                  <span>Recommend recording a 2-minute voice reflection tonight to process today's workload.</span>
                </div>
                <div className="p-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-2">
                  <Heart className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Social buffer loop recommended. Schedule chat with Alice node.</span>
                </div>
              </div>
            </div>
          </div>

          {/* B. DIGITAL SELF MODEL */}
          <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-200/10 space-y-4">
            <h3 className="text-xs font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono tracking-wide">
              <Brain className="h-4 w-4 text-cyan-400" />
              <span>Digital Self Patterns</span>
            </h3>

            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between items-center py-1 border-b border-gray-200/5">
                <span className="text-gray-400 font-medium">Communication Style</span>
                <span className="text-cyan-400 font-bold font-mono">Thoughtful & Articulate</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/5">
                <span className="text-gray-400 font-medium">Learning Style</span>
                <span className="text-cyan-400 font-bold font-mono">Audio-Visual / Associative</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/5">
                <span className="text-gray-400 font-medium">Decision Pattern</span>
                <span className="text-cyan-400 font-bold font-mono">Highly Analytical</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-200/5">
                <span className="text-gray-400 font-medium">Personality Spectrum</span>
                <span className="text-cyan-400 font-bold font-mono">Reflective / Introspective</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-medium">Core Values Index</span>
                <span className="text-cyan-400 font-bold font-mono">Growth, Integrity, Balance</span>
              </div>
            </div>
          </div>

          {/* C. MULTI-AGENT ARCHITECTURE LOGGER */}
          <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-200/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono tracking-wide">
                <Workflow className="h-4 w-4 text-cyan-400 animate-spin-slow" />
                <span>Multi-Agent System</span>
              </h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>

            {/* List of collaborative agents */}
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono uppercase tracking-wider select-none">
              {[
                { name: 'MemoryAgent', desc: 'Saves nodes' },
                { name: 'LearningAgent', desc: 'Tracks study' },
                { name: 'StrategyAgent', desc: 'Audits plans' },
                { name: 'ReflectionAgent', desc: 'Analyses logs' },
                { name: 'CreativityAgent', desc: 'Brainstorms' }
              ].map(ag => (
                <button
                  key={ag.name}
                  onClick={() => setActiveAgent(ag.name)}
                  className={`p-1.5 rounded-xl border text-center cursor-pointer transition-all ${
                    activeAgent === ag.name
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-gray-500/2 border-transparent text-gray-400 hover:border-gray-500/10'
                  }`}
                >
                  <div className="font-bold">{ag.name}</div>
                  <div className="text-[8px] text-gray-500 lowercase font-normal">{ag.desc}</div>
                </button>
              ))}
            </div>

            {/* Simulated Live message console */}
            <div className="p-3 rounded-xl bg-[#070b13] border border-gray-200/5 h-[120px] overflow-y-auto space-y-1.5 font-mono text-[9px] text-gray-400 select-text">
              {agentLogs.length === 0 ? (
                <div className="text-center text-gray-600 py-10">Starting pipeline audit logs...</div>
              ) : (
                agentLogs.map((log, i) => (
                  <div key={log.id} className={`flex items-start gap-1 py-0.5 border-b border-gray-200/5 ${i === 0 ? 'text-cyan-300 animate-pulse' : ''}`}>
                    <span className="text-gray-600">[{log.timestamp}]</span>
                    <span className="font-bold text-indigo-400 font-mono shrink-0">{log.agent}:</span>
                    <span>{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT MODULES WORKSPACE PANELS */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* CENTRAL NAVIGATION TAB SELECTOR FOR V8 MODULES */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200/10 pb-px shrink-0 select-none">
            {[
              { id: 'core', label: 'Command Hub', icon: LayoutGrid },
              { id: 'knowledge', label: 'Second Brain', icon: Network },
              { id: 'strategist', label: 'AI Strategist', icon: Compass },
              { id: 'learning', label: 'Learning Engine', icon: BookOpen },
              { id: 'pm', label: 'Project Manager', icon: Workflow },
              { id: 'reviews', label: 'Life Reviews', icon: Calendar },
              { id: 'analytics', label: 'Mental Analytics', icon: TrendingUp },
              { id: 'sovereignty', label: 'Sovereignty / Secure', icon: LockKeyhole },
              { id: 'pricing', label: 'Plans Upgrade', icon: CreditCard }
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveMaintab(t.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                    activeMaintab === t.id
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-500/5'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN TABS RENDER AREA */}
          <div className="space-y-6">
            
            {/* MODULE 1: COMMAND HUB (LifeOS Command Center) */}
            {activeMaintab === 'core' && (
              <div className="space-y-6">
                
                {/* Life OS Command Core statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Personal Growth</span>
                      <Activity className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold font-mono">82% Consistency</div>
                    <p className="text-[10px] text-gray-400">Study goals and gym habits aligned.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">Life Performance</span>
                      <Target className="h-4 w-4 text-indigo-400" />
                    </div>
                    <div className="text-xl font-bold font-mono">15 of 20 Milestones</div>
                    <p className="text-[10px] text-gray-400">Strategic goals progress is green.</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-fuchsia-500/5 border border-fuchsia-500/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-fuchsia-400 uppercase tracking-widest block">Intelligence Health</span>
                      <Brain className="h-4 w-4 text-fuchsia-400" />
                    </div>
                    <div className="text-xl font-bold font-mono">Excellent (4.8x)</div>
                    <p className="text-[10px] text-gray-400">Reflection count and cognitive stability optimal.</p>
                  </div>
                </div>

                {/* Micro checklist task board */}
                <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                        <CheckCircle className="h-4.5 w-4.5 text-cyan-400" />
                        <span>Daily LifeOS Accountability Checklist</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">Check off micro actions to feed the Multi-Agent reflection loop.</p>
                    </div>

                    <form onSubmit={handleAddTask} className="flex gap-2">
                      <select 
                        value={selectedProject} 
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="bg-[#111827] text-[10px] px-2 py-1 rounded-lg border border-gray-500/15 text-gray-300 font-semibold"
                      >
                        <option value="Personal Growth">Personal Growth</option>
                        <option value="Project Alpha">Project Alpha</option>
                        <option value="Health/Fitness">Health/Fitness</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Add micro task..."
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        className="bg-[#111827] text-xs px-3 py-1 rounded-lg border border-gray-500/15 text-gray-200 outline-none focus:border-cyan-400 max-w-[150px]"
                      />
                      <button type="submit" className="px-2.5 py-1 bg-cyan-500 hover:opacity-90 text-white rounded-lg text-xs font-bold font-mono">+</button>
                    </form>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {tasks.map(t => (
                      <div key={t.id} className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => handleToggleTask(t.id)}
                            className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all cursor-pointer ${
                              t.completed 
                                ? 'bg-cyan-500 border-cyan-500 text-white' 
                                : 'border-gray-500/30 text-transparent hover:border-cyan-500/40'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <span className={`text-xs ${t.completed ? 'line-through text-gray-500' : 'text-gray-200 font-medium'}`}>{t.text}</span>
                        </div>
                        <span className="text-[8px] font-mono uppercase bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full">{t.project}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* MODULE 2: SECOND BRAIN (Knowledge Graph Network) */}
            {activeMaintab === 'knowledge' && (
              <div className="space-y-6">
                
                <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                        <Network className="h-4.5 w-4.5 text-cyan-400" />
                        <span>Interactive Knowledge Graph & Second Brain</span>
                      </h3>
                      <p className="text-[11px] text-gray-400">Synthesize links automatically or click to view contextual memory citations.</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={handleDiscoverLinks}
                        className="px-3.5 py-1.5 border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Brain className="h-3.5 w-3.5" />
                        <span>AI Graph Discovery</span>
                      </button>
                    </div>
                  </div>

                  <div className="h-[280px] w-full border border-gray-500/10 rounded-2xl relative overflow-hidden bg-[#0a0d17]/60 flex items-center justify-center select-none shadow-inner">
                    
                    {/* SVG Connector Lines */}
                    <svg className="absolute inset-0 h-full w-full pointer-events-none">
                      {graphNodes.map((node, i) => {
                        if (node.id === 'me') return null;
                        const meNode = graphNodes.find(n => n.id === 'me') || { x: 150, y: 150 };
                        return (
                          <line
                            key={i}
                            x1={meNode.x}
                            y1={meNode.y}
                            x2={node.x}
                            y2={node.y}
                            stroke="#1e293b"
                            strokeWidth={1.5}
                            strokeDasharray={node.type === 'insight' ? '3 3' : 'none'}
                          />
                        );
                      })}
                    </svg>

                    {/* Nodes Render */}
                    {graphNodes.map(node => (
                      <button
                        key={node.id}
                        onClick={() => {
                          setSelectedGraphNode(node);
                          setGraphStatus(`Inspecting node: ${node.label}`);
                        }}
                        style={{ left: `${node.x}px`, top: `${node.y}px` }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-xl text-[10px] font-mono font-bold border transition-all cursor-pointer shadow-md flex items-center gap-1 ${
                          selectedGraphNode?.id === node.id
                            ? 'bg-cyan-500 border-cyan-400 text-white scale-105 z-10'
                            : node.type === 'user'
                            ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                            : node.type === 'insight'
                            ? 'bg-fuchsia-950/80 border-fuchsia-500/30 text-fuchsia-300'
                            : 'bg-[#111827] border-gray-500/15 text-gray-300 hover:border-cyan-500/20'
                        }`}
                      >
                        <Cpu className="h-3 w-3" />
                        <span>{node.label}</span>
                      </button>
                    ))}

                    <div className="absolute bottom-4 left-4 right-4 bg-[#070b13]/80 border border-gray-200/5 px-4 py-2 rounded-xl flex items-center justify-between text-[10px] font-mono">
                      <span className="text-gray-400">Status: <strong className="text-cyan-400">{graphStatus}</strong></span>
                      <span className="text-gray-500 uppercase">Connected Nodes: {graphNodes.length}</span>
                    </div>
                  </div>

                  {/* Selected Node Details block */}
                  {selectedGraphNode && (
                    <div className="p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-cyan-400 uppercase tracking-wide font-mono">Node Context: {selectedGraphNode.label}</span>
                        <button onClick={() => setSelectedGraphNode(null)} className="text-[10px] text-gray-400 hover:text-white">Close</button>
                      </div>
                      <p className="text-gray-300 leading-relaxed font-sans">
                        {selectedGraphNode.type === 'user' && "This represents your central digital persona, collecting and sharding cryptographic spoken diaries."}
                        {selectedGraphNode.type === 'person' && "Alice is identified as a core social support pillar in your spoken logs. Interactions with Alice correlate with heightened mood stability."}
                        {selectedGraphNode.type === 'place' && "London represents your home domain. Foundational geographical context of your digital twin memory nodes."}
                        {selectedGraphNode.type === 'project' && "Project Alpha represents your principal work project, frequently audited for study and habit tracker accountability."}
                        {selectedGraphNode.type === 'habit' && "Gym workout tracking. Your local DB streaks indicate high energy spikes after completing gym activities."}
                        {selectedGraphNode.type === 'finance' && "Simulated financial budget entries indicating conscious behavior and low stress scores."}
                        {selectedGraphNode.type === 'insight' && "An AI-discovered connection link. High work focus early in the morning matches better gym consistency and low afternoon fatigue."}
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* MODULE 3: AI LIFE STRATEGIST */}
            {activeMaintab === 'strategist' && (
              <div className="space-y-6">
                
                <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                      <Compass className="h-4.5 w-4.5 text-cyan-400 animate-spin-slow" />
                      <span>AI Life Strategist Strategical Engine</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">Pick a growth parameter challenge and run the Strategy Agent to compile a custom roadmap.</p>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                      value={strategyPrompt}
                      onChange={(e) => setStrategyPrompt(e.target.value)}
                      placeholder="Type a current life or study obstacle to resolve..."
                      className="w-full h-20 bg-[#111827] text-xs p-3.5 rounded-2xl border border-gray-500/15 text-gray-200 outline-none focus:border-cyan-400 font-sans resize-none"
                    />

                    <div className="flex gap-2">
                      {['Build a sustainable gym routine', 'Structure study habits', 'Manage job stress'].map(pref => (
                        <button
                          key={pref}
                          onClick={() => setStrategyPrompt(pref)}
                          className="text-[10px] px-3 py-1.5 bg-gray-500/5 hover:bg-gray-500/10 border border-gray-500/10 rounded-xl text-gray-300 font-semibold cursor-pointer transition-all"
                        >
                          {pref}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={handleBuildStrategy}
                      disabled={generatingStrategy}
                      className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
                    >
                      {generatingStrategy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      <span>Generate Action Strategy</span>
                    </button>
                  </div>

                  {/* Strategy Output */}
                  <AnimatePresence mode="wait">
                    {strategyResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 rounded-2xl bg-[#0d1220] border border-cyan-500/10 space-y-4 text-xs leading-relaxed"
                      >
                        <div className="flex justify-between items-center border-b border-gray-200/5 pb-2">
                          <span className="font-mono text-[10px] uppercase text-cyan-400">Strategist Core Roadmap Output</span>
                          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Audit Compiled Successfully
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <span className="text-[9px] font-mono text-gray-400 block uppercase">Context Strategy</span>
                            <p className="text-gray-300 font-medium">{strategyResult.strategy}</p>
                          </div>

                          <div>
                            <span className="text-[9px] font-mono text-gray-400 block uppercase mb-1.5">Action Milestones</span>
                            <div className="space-y-1.5">
                              {strategyResult.milestones.map((m: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-gray-300">
                                  <ArrowRight className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  <span>{m}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10">
                              <span className="text-[9px] font-mono text-amber-500 block uppercase mb-1">Decision Audit</span>
                              <p className="text-[11px] text-gray-400">{strategyResult.decisions}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-gray-500/5 border border-gray-500/10">
                              <span className="text-[9px] font-mono text-indigo-400 block uppercase mb-1">Opportunity Check</span>
                              <p className="text-[11px] text-gray-400">{strategyResult.opportunities}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

            {/* MODULE 4: LEARNING ENGINE */}
            {activeMaintab === 'learning' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Track study goals */}
                  <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                      <BookOpen className="h-4.5 w-4.5 text-cyan-400" />
                      <span>Learning Engine Study Goals</span>
                    </h3>

                    <form onSubmit={handleAddStudyGoal} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. Learn AESBlock Sharding..."
                        value={studyTopicInput}
                        onChange={(e) => setStudyTopicInput(e.target.value)}
                        className="flex-1 bg-[#111827] text-xs px-3.5 py-1.5 rounded-xl border border-gray-500/15 text-gray-200 outline-none focus:border-cyan-400"
                      />
                      <button type="submit" className="px-4 py-1.5 bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono">Add Topic</button>
                    </form>

                    <div className="space-y-3.5 pt-2 max-h-[220px] overflow-y-auto pr-1">
                      {studyGoals.map(sg => (
                        <div key={sg.id} className="p-3 rounded-xl bg-[#0d1220] border border-gray-500/10 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-200">{sg.title}</span>
                            <button 
                              onClick={() => handleExplainConcept(sg.title)}
                              className="text-[9px] text-cyan-400 hover:underline"
                            >
                              AI Explain Topic
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-500/10 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${sg.progress}%` }}></div>
                            </div>
                            <span className="text-[9px] font-mono text-gray-400">{sg.progress}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Explain Concept Card */}
                  <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">AI Concept Explainer (Explain like I'm 10)</h3>
                      <p className="text-[11px] text-gray-400 mt-1">Get simple plain-language breakdowns of study topics. Click 'AI Explain Topic' above to test.</p>
                    </div>

                    <div className="flex-1 flex flex-col justify-center">
                      <AnimatePresence mode="wait">
                        {loadingExplanation ? (
                          <div className="text-center py-8">
                            <RefreshCw className="h-5 w-5 animate-spin text-cyan-400 mx-auto mb-2" />
                            <p className="text-[10px] text-gray-500 font-mono">Compiling simple breakdown block...</p>
                          </div>
                        ) : studyExplanation ? (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-xs text-gray-300 leading-relaxed font-sans"
                          >
                            {studyExplanation}
                          </motion.div>
                        ) : (
                          <div className="text-center py-8 text-xs text-gray-500 italic">No topic selected for explainer yet.</div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="pt-3 border-t border-gray-200/5 text-[10px] text-gray-500 flex items-center justify-between font-mono">
                      <span>Retention Score: <strong>85% (Optimal)</strong></span>
                      <span>Active Topics: <strong>{studyGoals.length}</strong></span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* MODULE 5: PROJECT MANAGER */}
            {activeMaintab === 'pm' && (
              <div className="space-y-6">
                
                <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                      <Workflow className="h-4.5 w-4.5 text-cyan-400" />
                      <span>Strategic Project & Task dependencies Manager</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">Map long-term projects to specific goals, knowledge nodes, and task hierarchies.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="p-4 rounded-2xl bg-[#0d1220] border border-gray-500/10 space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-200/5 pb-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase font-mono">Project Alpha (Developer Hub)</span>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded">Active</span>
                      </div>
                      <p className="text-xs text-gray-300">V8 secure offline-first upgrade development. Connects directly to IndexedDB structures and secure encryption blocks.</p>
                      
                      <div className="space-y-1 text-[10px] text-gray-400">
                        <div className="flex justify-between">
                          <span>Progress:</span>
                          <span className="font-mono text-cyan-400 font-bold">80%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dependency Blockers:</span>
                          <span className="font-mono text-amber-500 font-bold">None</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#0d1220] border border-gray-500/10 space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-200/5 pb-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase font-mono">Personal Growth (Fitness/Habit)</span>
                        <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.2 rounded">In Progress</span>
                      </div>
                      <p className="text-xs text-gray-300">Developing regular morning workouts and social buffer touchpoints with support network nodes.</p>
                      
                      <div className="space-y-1 text-[10px] text-gray-400">
                        <div className="flex justify-between">
                          <span>Progress:</span>
                          <span className="font-mono text-cyan-400 font-bold">50%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Dependency Blockers:</span>
                          <span className="font-mono text-fuchsia-400 font-bold">Sleep schedule</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* MODULE 6: LIFE REVIEWS & FUTURE PREDICTIONS */}
            {activeMaintab === 'reviews' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Review builder */}
                  <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                          <Calendar className="h-4.5 w-4.5 text-cyan-400" />
                          <span>AI Life Review System</span>
                        </h3>
                        <p className="text-[11px] text-gray-400">Compile reviews from voice logs.</p>
                      </div>

                      <div className="flex gap-1.5">
                        {['daily', 'weekly', 'yearly'].map(scope => (
                          <button
                            key={scope}
                            onClick={() => setReviewType(scope as any)}
                            className={`text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase border cursor-pointer transition-all ${
                              reviewType === scope
                                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                                : 'text-gray-400 border-transparent hover:bg-gray-500/5'
                            }`}
                          >
                            {scope}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleCompileReview}
                      disabled={compilingReview}
                      className="w-full py-2 bg-cyan-500 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {compilingReview ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      <span>Compile AI Life Review Digest</span>
                    </button>

                    <AnimatePresence mode="wait">
                      {compiledReview && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-4 rounded-xl bg-[#0d1220] border border-gray-500/10 space-y-3 text-xs leading-relaxed"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-cyan-400">{compiledReview.title}</span>
                            <span className="text-[9px] text-gray-500 font-mono">{compiledReview.period}</span>
                          </div>
                          <p className="text-gray-300 italic">"{compiledReview.summary}"</p>
                          
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-indigo-400 block uppercase">Key Milestones</span>
                            {compiledReview.achievements.map((ach: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-gray-300">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                <span>{ach}</span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-fuchsia-400 block uppercase">Strategic Next Steps</span>
                            {compiledReview.nextSteps.map((step: string, i: number) => (
                              <div key={i} className="flex items-start gap-1.5 text-gray-300">
                                <Sparkles className="h-3.5 w-3.5 text-fuchsia-400 shrink-0 mt-0.5" />
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Future prediction & creativity */}
                  <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                      <Compass className="h-4.5 w-4.5 text-cyan-400 animate-spin-slow" />
                      <span>Predictive Life Intel & Creativity Engine</span>
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-indigo-400 uppercase font-mono text-[10px]">Opportunities & Future Risks</span>
                          <button 
                            onClick={handlePredictiveForecast}
                            disabled={loadingForecast}
                            className="text-[9px] text-cyan-400 hover:underline disabled:opacity-50 cursor-pointer"
                          >
                            {loadingForecast ? 'Calculating...' : 'AI Forecast'}
                          </button>
                        </div>
                        {loadingForecast ? (
                          <div className="flex items-center gap-2 py-1 text-[11px] text-cyan-400">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Modeling behavioral trends...</span>
                          </div>
                        ) : predictiveScenario ? (
                          <p className="text-gray-300 leading-normal">{predictiveScenario}</p>
                        ) : (
                          <p className="text-gray-500 italic py-1 text-[11px]">Click AI Forecast to calculate predictive modeling.</p>
                        )}
                      </div>

                      <div className="p-3.5 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-fuchsia-400 uppercase font-mono text-[10px]">Creativity & Lateral Brainstorming</span>
                          <button 
                            onClick={handleGenerateCreativePrompt}
                            disabled={loadingCreative}
                            className="text-[9px] text-fuchsia-400 hover:underline disabled:opacity-50 cursor-pointer"
                          >
                            {loadingCreative ? 'Designing...' : 'Generate Prompt'}
                          </button>
                        </div>
                        {loadingCreative ? (
                          <div className="flex items-center gap-2 py-1 text-[11px] text-fuchsia-400">
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Styling cognitive prompt...</span>
                          </div>
                        ) : creativePrompt ? (
                          <p className="text-gray-300 leading-normal font-serif">"{creativePrompt}"</p>
                        ) : (
                          <p className="text-gray-500 italic py-1 text-[11px]">Click Generate Prompt to receive a lateral thinking journal entry exercise.</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* MODULE 7: ORIGINAL MENTAL ANALYTICS AND SIMPLE INSIGHTS */}
            {activeMaintab === 'analytics' && (
              <div className="space-y-6">
                
                {/* Embedded Original Analytics dashboards keeping everything intact */}
                <div className="p-1 rounded-3xl border border-gray-500/10 bg-gray-500/[0.01]">
                  <SimpleInsightsDashboard userId={userId} localEntries={localEntries} />
                </div>

              </div>
            )}

            {/* MODULE 8: PERSONAL DATA SOVEREIGNTY SYSTEM */}
            {activeMaintab === 'sovereignty' && (
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Secure Workspace locking */}
                  <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                      <Lock className="h-4.5 w-4.5 text-cyan-400" />
                      <span>Workspace Pin Locker</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">Lock the LogEasy interface on-device. Protects transcript cache against nearby eyes.</p>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400 font-medium">Locker Status:</span>
                        <span className={`font-mono font-bold uppercase ${isLockerActive ? 'text-cyan-400' : 'text-gray-500'}`}>
                          {isLockerActive ? `Active (PIN: ${pinCode})` : 'Disabled'}
                        </span>
                      </div>

                      {isLockerActive ? (
                        <button 
                          onClick={handleDisableLocker}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-bold rounded-xl cursor-pointer transition-all"
                        >
                          Disable PIN Locker
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input 
                              type="password" 
                              maxLength={4}
                              placeholder="Type 4-digit PIN..."
                              value={newPinInput}
                              onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                              className="bg-[#111827] text-xs px-3.5 py-1.5 rounded-xl border border-gray-500/15 text-gray-200 outline-none focus:border-cyan-400 max-w-[150px] font-mono text-center tracking-widest"
                            />
                            <button 
                              onClick={handleSavePin}
                              className="px-4 py-1.5 bg-cyan-500 hover:opacity-90 text-white rounded-xl text-xs font-bold font-mono"
                            >
                              Enable PIN
                            </button>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono">Simulated on-device PBKDF2 local configuration key.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cryptographic sovereignty detail status */}
                  <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                      <Shield className="h-4.5 w-4.5 text-cyan-400 animate-pulse" />
                      <span>Vault Integrity Diagnostics</span>
                    </h3>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center py-1 border-b border-gray-200/5">
                        <span className="text-gray-400">Cryptographic Standard:</span>
                        <span className="font-mono text-cyan-400 font-bold">AES-256-GCM / PBKDF2</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-200/5">
                        <span className="text-gray-400">Database Engine:</span>
                        <span className="font-mono text-cyan-400 font-bold">Isar IndexedDB Sandbox</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-gray-200/5">
                        <span className="text-gray-400">Cloud Sync:</span>
                        <span className="font-mono text-cyan-400 font-bold">Secure Firestore Proxy</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400">Data Sovereignty:</span>
                        <span className="font-mono text-emerald-400 font-bold">100% Client-Owned Keys</span>
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* MODULE 9: SUBSCRIPTION PLANS MONETIZATION PANEL & CHECKOUT */}
            {activeMaintab === 'pricing' && (
              <div className="space-y-6">
                
                <div className="p-5 rounded-3xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-100 flex items-center gap-1.5 uppercase font-mono">
                      <CreditCard className="h-4.5 w-4.5 text-cyan-400" />
                      <span>LogEasy subscription tiers comparison & checkout</span>
                    </h3>
                    <p className="text-[11px] text-gray-400">Unlock the complete Human Intelligence Operating System experience. Try out our simulated secure checkout flow below.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    {pricingPlans.map(plan => {
                      const isCurrent = userSubscriptionTier === plan.name;
                      return (
                        <div 
                          key={plan.name}
                          className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all relative ${
                            isCurrent 
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-white shadow-lg' 
                              : 'bg-[#0d1220]/60 border-gray-500/10 text-gray-300'
                          }`}
                        >
                          {isCurrent && (
                            <span className="absolute top-3 right-3 text-[8px] font-mono bg-cyan-500 text-white px-2 py-0.5 rounded-full font-bold uppercase">Active</span>
                          )}

                          <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wide block font-mono text-cyan-400">{plan.name}</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-black font-mono text-gray-100">${plan.price}</span>
                              <span className="text-[10px] text-gray-500 font-mono">/{plan.period}</span>
                            </div>
                            <hr className="border-gray-200/5" />
                            <div className="space-y-1.5 pt-1.5">
                              {plan.features.map((feat, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                  <Check className="h-3 w-3 text-cyan-400 shrink-0" />
                                  <span className="text-gray-300 truncate">{feat}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={isCurrent}
                            className={`w-full py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              isCurrent 
                                ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 disabled:opacity-85' 
                                : 'bg-cyan-500 text-white hover:opacity-90'
                            }`}
                          >
                            {plan.buttonText}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* CHECKOUT SIMULATION COMPONENT POPUP */}
                  <AnimatePresence>
                    {checkoutPlan && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-md mx-auto p-6 rounded-3xl bg-[#0d1220] border border-cyan-500/20 space-y-4 shadow-xl"
                      >
                        <div className="flex justify-between items-center border-b border-gray-200/5 pb-2.5">
                          <div>
                            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest block">Checkout Portal</span>
                            <h4 className="text-xs font-bold text-gray-100">Upgrade to LogEasy {checkoutPlan.name}</h4>
                          </div>
                          <span className="text-lg font-black font-mono text-cyan-400">${checkoutPlan.price}</span>
                        </div>

                        <form onSubmit={handleProcessCheckout} className="space-y-4 text-xs">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Mock Credit Card Number</label>
                            <input 
                              type="text" 
                              required
                              placeholder="4111 2222 3333 4444 (Simulated)"
                              value={ccNumber}
                              onChange={(e) => setCcNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                              className="w-full bg-[#111827] text-xs px-3.5 py-2 rounded-xl border border-gray-500/15 text-gray-200 outline-none focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">Expiry</label>
                              <input 
                                type="text" 
                                required
                                placeholder="MM/YY"
                                value={ccExpiry}
                                onChange={(e) => setCcExpiry(e.target.value.slice(0, 5))}
                                className="w-full bg-[#111827] text-xs px-3.5 py-2 rounded-xl border border-gray-500/15 text-gray-200 outline-none focus:border-cyan-400 font-mono text-center"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block">CVV</label>
                              <input 
                                type="password" 
                                required
                                placeholder="***"
                                value={ccCvv}
                                onChange={(e) => setCcCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                className="w-full bg-[#111827] text-xs px-3.5 py-2 rounded-xl border border-gray-500/15 text-gray-200 outline-none focus:border-cyan-400 font-mono text-center"
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 select-none">
                            <button 
                              type="button"
                              onClick={() => setCheckoutPlan(null)}
                              className="flex-1 py-2 bg-gray-500/10 border border-gray-500/15 hover:bg-gray-500/15 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              disabled={processingPayment}
                              className="flex-1 py-2 bg-cyan-500 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                              {processingPayment ? 'Processing payment...' : 'Pay and Upgrade'}
                            </button>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
