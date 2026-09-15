import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart, Briefcase, Compass, Target, Zap, Crown, MinusCircle, Settings, Send,
  MessageSquare, Plus, CheckCircle, ChevronRight, Star, Award, Calendar, Bookmark,
  RefreshCw, Smile, Clock, ThumbsUp, ThumbsDown, BookOpen, User, HelpCircle,
  AlertCircle, ShieldAlert, ArrowLeft, CheckSquare, Square, Trash2, Edit3, Eye
} from 'lucide-react';
import { localDB } from '../../core/database/local_db';
import {
  CoachingStyle,
  COACHING_STYLES,
  CoachingSession,
  ConversationMessage,
  CoachingPreferences,
  Goal,
  Habit,
  DecisionEntry,
  GratitudeEntry,
  DailyCheckIn,
  ReflectionSession,
  GuidedSessionType,
  GUIDED_SESSIONS
} from '../../core/ai/coach_types';
import { coachService } from '../../core/ai/coach_service';
import { logger } from '../../core/analytics/logger';
import { notificationManager } from '../../core/notifications/notification_manager';

interface AIReflectionCoachProps {
  userId: string;
}

export default function AIReflectionCoach({ userId }: AIReflectionCoachProps) {
  // Navigation states within the coach tab
  const [activePane, setActivePane] = useState<'cockpit' | 'chat' | 'goals' | 'habits' | 'gratitude' | 'decisions' | 'checkin' | 'guided'>('cockpit');

  // DB Data States
  const [preferences, setPreferences] = useState<CoachingPreferences | null>(null);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<CoachingSession | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [gratitudes, setGratitudes] = useState<GratitudeEntry[]>([]);
  const [decisions, setDecisions] = useState<DecisionEntry[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckIn[]>([]);
  const [reflections, setReflections] = useState<ReflectionSession[]>([]);

  // Input states
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // Goal creation inputs
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [newGoalCat, setNewGoalCat] = useState<'personal' | 'career' | 'health' | 'finance' | 'relationship' | 'other'>('personal');
  const [newGoalDate, setNewGoalDate] = useState('2026-12-31');
  const [newGoalMilestones, setNewGoalMilestones] = useState<string[]>(['']);
  
  // Goal reflection input
  const [goalReflectionText, setGoalReflectionText] = useState<Record<string, string>>({});

  // Habit creation inputs
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'weekly_3x' | 'weekly_5x'>('daily');

  // Gratitude inputs
  const [gratItem1, setGratItem1] = useState('');
  const [gratItem2, setGratItem2] = useState('');
  const [gratItem3, setGratItem3] = useState('');
  const [gratNotes, setGratNotes] = useState('');

  // Decision inputs
  const [decTitle, setDecTitle] = useState('');
  const [decReason, setDecReason] = useState('');
  const [decExpected, setDecExpected] = useState('');
  const [decDate, setDecDate] = useState('2026-08-31');
  
  // Decision Review input
  const [decReviewOutcome, setDecReviewOutcome] = useState('');
  const [decReviewLessons, setDecReviewLessons] = useState('');
  const [reviewingDecisionId, setReviewingDecisionId] = useState<string | null>(null);

  // Daily Checkin inputs
  const [chkFeeling, setChkFeeling] = useState('Calm');
  const [chkScore, setChkScore] = useState(7);
  const [chkFocus, setChkFocus] = useState('');
  const [chkChallenge, setChkChallenge] = useState('');
  const [chkWentWell, setChkWentWell] = useState('');
  const [chkForward, setChkForward] = useState('');

  // Guided wizard inputs
  const [activeGuidedType, setActiveGuidedType] = useState<GuidedSessionType | null>(null);
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({});
  const [guidedAIFeedback, setGuidedAIFeedback] = useState<string | null>(null);
  const [guidedLoading, setGuidedLoading] = useState(false);

  // Feedback correction inputs
  const [correctionMessageId, setCorrectionMessageId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');

  // Load Database Core
  const loadAllCoachData = async () => {
    try {
      // Seed default values if db is totally blank for coaching features
      await coachService.seedDefaultDataIfEmpty(userId);

      const prefs = await coachService.getOrCreatePreferences(userId);
      setPreferences(prefs);

      const sessList = await localDB.getCoachingSessions(userId);
      setSessions(sessList);

      // Select active session or create default
      let active = sessList.find((s) => s.isActive);
      if (!active && sessList.length > 0) {
        active = sessList[0];
      }
      if (!active) {
        const dId = `sess_${Date.now()}`;
        active = {
          id: dId,
          userId,
          style: prefs.activeStyle || 'supportive_friend',
          title: 'Growth Reflection Space',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          depth: prefs.coachingDepth || 'standard',
          frequency: prefs.coachingFrequency || 'medium'
        };
        await localDB.saveCoachingSession(active);
        sessList.push(active);
        setSessions([...sessList]);
      }
      setCurrentSession(active);

      // Fetch message history for active session
      const msgList = await localDB.getConversationMessagesForSession(active.id);
      setMessages(msgList);

      // Other entities
      const goalList = await localDB.getGoals(userId);
      setGoals(goalList);

      const habitList = await localDB.getHabits(userId);
      setHabits(habitList);

      const gratList = await localDB.getGratitudeEntries(userId);
      setGratitudes(gratList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      const decList = await localDB.getDecisionEntries(userId);
      setDecisions(decList);

      const chkList = await localDB.getDailyCheckIns(userId);
      setCheckins(chkList);

      const refList = await localDB.getReflectionSessions(userId);
      setReflections(refList);

    } catch (e) {
      logger.error('AIReflectionCoach', 'Error loading database context', e);
    }
  };

  useEffect(() => {
    loadAllCoachData();
  }, [userId]);

  // Handle Coach Style Switch
  const handleStyleChange = async (style: CoachingStyle) => {
    if (!currentSession) return;
    try {
      const updatedSess = { ...currentSession, style, updatedAt: new Date().toISOString() };
      await localDB.saveCoachingSession(updatedSess);
      setCurrentSession(updatedSess);

      if (preferences) {
        const updatedPrefs = { ...preferences, activeStyle: style, updatedAt: new Date().toISOString() };
        await localDB.saveCoachingPreferences(updatedPrefs);
        setPreferences(updatedPrefs);
      }

      // Add context system message to conversation history
      const systemMsg: ConversationMessage = {
        id: `sys_${Date.now()}`,
        sessionId: currentSession.id,
        userId,
        role: 'system',
        content: `Coaching personality transitioned to ${COACHING_STYLES[style].name}. Ready to listen with a fresh perspective.`,
        createdAt: new Date().toISOString()
      };
      await localDB.saveConversationMessage(systemMsg);
      
      const updatedMsgs = await localDB.getConversationMessagesForSession(currentSession.id);
      setMessages(updatedMsgs);

      notificationManager.addNotification({
        title: `Coach Shifted: ${COACHING_STYLES[style].name}`,
        body: COACHING_STYLES[style].description,
        type: 'reminder'
      });
      logger.info('AIReflectionCoach', `Shifted coaching style to ${style}`);
    } catch (err) {
      logger.error('AIReflectionCoach', 'Failed style shift', err);
    }
  };

  // Submit chat message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !currentSession || chatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    const userMsg: ConversationMessage = {
      id: `msg_u_${Date.now()}`,
      sessionId: currentSession.id,
      userId,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString()
    };

    try {
      // Save user message
      await localDB.saveConversationMessage(userMsg);
      setMessages((prev) => [...prev, userMsg]);

      // Trigger Coach Response
      const reply = await coachService.generateCoachResponse(userId, currentSession.id, userText);
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      logger.error('AIReflectionCoach', 'Failed message transaction', err);
    } finally {
      setChatLoading(false);
    }
  };

  // --- GOAL ACTIONS ---
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const cleanMilestones = newGoalMilestones
      .filter((m) => m.trim())
      .map((m, i) => ({ id: `m_${i}_${Date.now()}`, title: m.trim(), isCompleted: false }));

    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      userId,
      title: newGoalTitle.trim(),
      description: newGoalDesc.trim(),
      category: newGoalCat,
      status: 'active',
      targetDate: newGoalDate,
      milestones: cleanMilestones,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reflections: []
    };

    await localDB.saveGoal(newGoal);
    setGoals((prev) => [newGoal, ...prev]);

    // Reset inputs
    setNewGoalTitle('');
    setNewGoalDesc('');
    setNewGoalMilestones(['']);
    setActivePane('cockpit');

    notificationManager.addNotification({
      title: 'Active Goal Drafted',
      body: `"${newGoal.title}" is locked into your personal tracker.`,
      type: 'reminder'
    });
  };

  const toggleMilestone = async (goalId: string, milestoneId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedMilestones = goal.milestones.map((m) => {
      if (m.id === milestoneId) {
        return { ...m, isCompleted: !m.isCompleted, completedAt: !m.isCompleted ? new Date().toISOString() : undefined };
      }
      return m;
    });

    const completedCount = updatedMilestones.filter((m) => m.isCompleted).length;
    const progressPercent = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;

    const updatedGoal: Goal = {
      ...goal,
      milestones: updatedMilestones,
      progressPercent,
      updatedAt: new Date().toISOString()
    };

    await localDB.saveGoal(updatedGoal);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)));
  };

  const addGoalReflection = async (goalId: string) => {
    const text = goalReflectionText[goalId];
    if (!text || !text.trim()) return;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedReflections = [
      ...(goal.reflections || []),
      { id: `r_${Date.now()}`, text: text.trim(), createdAt: new Date().toISOString() }
    ];

    const updatedGoal = { ...goal, reflections: updatedReflections, updatedAt: new Date().toISOString() };
    await localDB.saveGoal(updatedGoal);
    setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)));

    setGoalReflectionText((prev) => ({ ...prev, [goalId]: '' }));
  };

  // --- HABIT ACTIONS ---
  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      userId,
      name: newHabitName.trim(),
      description: newHabitDesc.trim(),
      frequency: newHabitFreq === 'daily' ? 'daily' : newHabitFreq === 'weekly_3x' ? 'weekly_3x' : 'weekly_5x',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: {},
      currentStreak: 0,
      longestStreak: 0
    };

    await localDB.saveHabit(newHabit);
    setHabits((prev) => [newHabit, ...prev]);

    setNewHabitName('');
    setNewHabitDesc('');
    setActivePane('cockpit');
  };

  const toggleHabitCompletion = async (habitId: string, dateStr: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    const currentStatus = !!habit.history[dateStr];
    const updatedHistory = { ...habit.history, [dateStr]: !currentStatus };

    // Calculate Streak
    let currentStreak = 0;
    let tempDate = new Date();
    // check backwards
    for (let i = 0; i < 365; i++) {
      const checkStr = tempDate.toISOString().split('T')[0];
      if (updatedHistory[checkStr]) {
        currentStreak++;
      } else {
        // if checkStr is today and it's not checked yet, we don't break yet if yesterday was checked
        if (i === 0) {
          // check yesterday
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          if (updatedHistory[yesterday]) {
            continue;
          }
        }
        break;
      }
      tempDate.setDate(tempDate.getDate() - 1);
    }

    const longestStreak = Math.max(habit.longestStreak, currentStreak);

    const updatedHabit: Habit = {
      ...habit,
      history: updatedHistory,
      currentStreak,
      longestStreak,
      updatedAt: new Date().toISOString()
    };

    await localDB.saveHabit(updatedHabit);
    setHabits((prev) => prev.map((h) => (h.id === habitId ? updatedHabit : h)));
  };

  // --- GRATITUDE ACTIONS ---
  const handleAddGratitude = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gratItem1.trim() && !gratItem2.trim() && !gratItem3.trim()) return;

    const items = [gratItem1, gratItem2, gratItem3].map((i) => i.trim()).filter(Boolean);

    const newGrat: GratitudeEntry = {
      id: `grat_${Date.now()}`,
      userId,
      items,
      notes: gratNotes.trim(),
      streakCount: gratitudes.length > 0 ? gratitudes[0].streakCount + 1 : 1,
      createdAt: new Date().toISOString()
    };

    await localDB.saveGratitudeEntry(newGrat);
    setGratitudes((prev) => [newGrat, ...prev]);

    setGratItem1('');
    setGratItem2('');
    setGratItem3('');
    setGratNotes('');
    setActivePane('cockpit');

    notificationManager.addNotification({
      title: 'Gratitude Preserved',
      body: 'Strengthening your focus on small life blessings.',
      type: 'reminder'
    });
  };

  // --- DECISION ACTIONS ---
  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decTitle.trim()) return;

    const newDec: DecisionEntry = {
      id: `dec_${Date.now()}`,
      userId,
      decision: decTitle.trim(),
      reason: decReason.trim(),
      expectedOutcome: decExpected.trim(),
      reviewDate: decDate,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await localDB.saveDecisionEntry(newDec);
    setDecisions((prev) => [newDec, ...prev]);

    setDecTitle('');
    setDecReason('');
    setDecExpected('');
    setActivePane('cockpit');
  };

  const handleReviewDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingDecisionId || !decReviewOutcome.trim()) return;

    const dec = decisions.find((d) => d.id === reviewingDecisionId);
    if (!dec) return;

    const updatedDec: DecisionEntry = {
      ...dec,
      actualOutcome: decReviewOutcome.trim(),
      lessonsLearned: decReviewLessons.trim(),
      status: 'reviewed',
      reviewedAt: new Date().toISOString()
    };

    await localDB.saveDecisionEntry(updatedDec);
    setDecisions((prev) => prev.map((d) => (d.id === reviewingDecisionId ? updatedDec : d)));

    setReviewingDecisionId(null);
    setDecReviewOutcome('');
    setDecReviewLessons('');
    setActivePane('cockpit');
  };

  // --- DAILY CHECKIN ACTIONS ---
  const handleAddCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chkFocus.trim()) return;

    const newChk: DailyCheckIn = {
      id: `chk_${Date.now()}`,
      userId,
      feeling: chkFeeling,
      moodScore: chkScore,
      focus: chkFocus.trim(),
      challenge: chkChallenge.trim(),
      wentWell: chkWentWell.trim(),
      lookingForward: chkForward.trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    await localDB.saveDailyCheckIn(newChk);
    setCheckins((prev) => [newChk, ...prev]);

    // Also add to Journal entries so that AI summaries can reference it!
    const cleanEntry: any = {
      id: `check_journal_${Date.now()}`,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: `Daily Mental Check-In (${chkFeeling})`,
      transcript: `Feeling: ${chkFeeling}. Mood: ${chkScore}/10.\nToday's Focus: ${chkFocus.trim()}.\nMain Challenge: ${chkChallenge.trim() || 'None'}.\nWhat went well: ${chkWentWell.trim() || 'None'}.\nLooking forward to: ${chkForward.trim() || 'None'}.`,
      audioDuration: 0,
      moodScore: chkScore,
      moodLabel: chkFeeling,
      categories: ['Checkin', 'Growth'],
      syncStatus: 'synced',
      favorite: false
    };
    await localDB.saveJournalEntry(cleanEntry);

    // Clear and redirect
    setChkFocus('');
    setChkChallenge('');
    setChkWentWell('');
    setChkForward('');
    setActivePane('cockpit');

    notificationManager.addNotification({
      title: 'Daily Alignment Saved',
      body: `You cataloged: Feeling ${chkFeeling}. Let's keep making progress!`,
      type: 'reminder'
    });
  };

  // --- GUIDED JOURNALING ACTIONS ---
  const handleStartGuided = (type: GuidedSessionType) => {
    setActiveGuidedType(type);
    setGuidedStepIndex(0);
    setGuidedAnswers({});
    setGuidedAIFeedback(null);
    setActivePane('guided');
  };

  const handleNextGuidedStep = async () => {
    if (!activeGuidedType) return;
    const promptDef = GUIDED_SESSIONS[activeGuidedType];

    if (guidedStepIndex < promptDef.steps.length - 1) {
      setGuidedStepIndex((prev) => prev + 1);
    } else {
      // Completed last step, trigger AI Synthesis
      setGuidedLoading(true);
      try {
        const feedback = await coachService.generateGuidedSessionSummary(userId, activeGuidedType, guidedAnswers);
        setGuidedAIFeedback(feedback);

        const newSess: ReflectionSession = {
          id: `ref_${Date.now()}`,
          userId,
          type: activeGuidedType,
          status: 'completed',
          answers: guidedAnswers,
          aiSummary: feedback,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await localDB.saveReflectionSession(newSess);
        setReflections((prev) => [newSess, ...prev]);

        // Also save as a journal entry so it binds into their general graph!
        const journalTranscript = Object.entries(guidedAnswers)
          .map(([q, a]) => `Prompt: ${q}\nReflection: ${a}`)
          .join('\n\n');

        await localDB.saveJournalEntry({
          id: `ref_journal_${Date.now()}`,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          title: `Guided Session: ${promptDef.name}`,
          transcript: `Completed Guided Session: ${promptDef.name}\n\n${journalTranscript}\n\nCoach Feedback:\n${feedback}`,
          audioDuration: 0,
          moodScore: 8,
          moodLabel: 'Reflective',
          categories: ['Guided_Reflection', promptDef.category],
          syncStatus: 'synced'
        });

      } catch (err) {
        logger.error('AIReflectionCoach', 'Error compile guided synthesis', err);
      } finally {
        setGuidedLoading(false);
      }
    }
  };

  // Message ratings/feedback
  const rateMessageMessage = async (msgId: string, rating: number) => {
    const updated = messages.map((m) => {
      if (m.id === msgId) {
        return { ...m, rating };
      }
      return m;
    });
    setMessages(updated);

    const msg = messages.find((m) => m.id === msgId);
    if (msg) {
      msg.rating = rating;
      await localDB.saveConversationMessage(msg);
      logger.info('AIReflectionCoach', `Rated coach message ${msgId} with ${rating} stars`);
    }
  };

  const likeMessageMessage = async (msgId: string, feedbackStatus: 'liked' | 'disliked' | 'none') => {
    const updated = messages.map((m) => {
      if (m.id === msgId) {
        return { ...m, feedbackStatus };
      }
      return m;
    });
    setMessages(updated);

    const msg = messages.find((m) => m.id === msgId);
    if (msg) {
      msg.feedbackStatus = feedbackStatus;
      await localDB.saveConversationMessage(msg);
      logger.info('AIReflectionCoach', `Gave feedback ${feedbackStatus} on message ${msgId}`);
    }
  };

  const submitCorrection = async (msgId: string) => {
    if (!correctionText.trim()) return;

    const updated = messages.map((m) => {
      if (m.id === msgId) {
        return { ...m, correctionText: correctionText.trim() };
      }
      return m;
    });
    setMessages(updated);

    const msg = messages.find((m) => m.id === msgId);
    if (msg) {
      msg.correctionText = correctionText.trim();
      await localDB.saveConversationMessage(msg);

      // Re-trigger coach pipeline incorporating this correction as prompt
      const clText = `Correction: You previously misunderstood me. Let me clarify: "${correctionText.trim()}". Let's continue.`;
      setCorrectionMessageId(null);
      setCorrectionText('');
      setChatInput(clText);
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  const regenerateMessage = async (msgId: string) => {
    if (chatLoading) return;
    setChatLoading(true);
    
    // Find previous user prompt
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    if (msgIndex <= 0) {
      setChatLoading(false);
      return;
    }

    const previousUserMsg = messages[msgIndex - 1];
    if (!previousUserMsg || previousUserMsg.role !== 'user') {
      setChatLoading(false);
      return;
    }

    try {
      // Remove bad assistant message from state and DB
      await localDB.deleteConversationMessage(msgId);
      const filtered = messages.filter((m) => m.id !== msgId);
      setMessages(filtered);

      // Trigger re-generation
      const reply = await coachService.generateCoachResponse(userId, currentSession!.id, previousUserMsg.content);
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      logger.error('AIReflectionCoach', 'Failed response regeneration', err);
    } finally {
      setChatLoading(false);
    }
  };

  // Helper styles mapping Lucide icons
  const renderIcon = (iconName: string, className = 'h-5 w-5') => {
    switch (iconName) {
      case 'Heart': return <Heart className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'Compass': return <Compass className={className} />;
      case 'Target': return <Target className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'Crown': return <Crown className={className} />;
      case 'MinusCircle': return <MinusCircle className={className} />;
      default: return <Settings className={className} />;
    }
  };

  return (
    <div className="flex-grow flex flex-col min-h-0 bg-transparent text-gray-100 font-sans">
      
      {/* 1. TOP HEADER STATUS */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-500/10 pb-4 mb-5">
        <div>
          <h2 className="text-xl font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            <Award className="h-5 w-5 text-cyan-400" />
            <span>AI Cognitive Coach & Mind Gym</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Build self-awareness, track progress patterns, align habits, and challenge obstacles.
          </p>
        </div>

        {/* Coach Selector header button */}
        {activePane !== 'chat' && currentSession && (
          <button
            onClick={() => setActivePane('chat')}
            className="flex items-center gap-2 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <MessageSquare className="h-4 w-4 animate-pulse" />
            <span>Engage Reflective Coach</span>
          </button>
        )}
      </div>

      {/* 2. CORE WORKSPACE ROUTER */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* A. GENERAL GROWTH COCKPIT */}
          {activePane === 'cockpit' && (
            <motion.div
              key="cockpit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Row 1: Coach Status & Daily Checkin Prompt */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                
                {/* ACTIVE PERSONALITY CARD */}
                <div className="xl:col-span-2 p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all pointer-events-none"></div>
                  
                  <div className="space-y-3 relative z-10">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Active Reflective Persona</span>
                    <div className="flex items-start gap-4">
                      <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        {currentSession ? renderIcon(COACHING_STYLES[currentSession.style].icon, 'h-7 w-7') : <User className="h-7 w-7" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-200">
                          {currentSession ? COACHING_STYLES[currentSession.style].name : 'Loading Coach...'}
                        </h3>
                        <p className="text-xs text-gray-400 leading-relaxed mt-1">
                          {currentSession ? COACHING_STYLES[currentSession.style].description : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-gray-500/5 mt-4 flex flex-wrap gap-2 justify-between items-center relative z-10">
                    {/* Personalities Pillbox toggles */}
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(COACHING_STYLES) as CoachingStyle[]).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStyleChange(st)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            currentSession?.style === st
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                              : 'border-transparent text-gray-400 hover:bg-gray-500/5 hover:text-gray-200'
                          }`}
                        >
                          {COACHING_STYLES[st].name}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setActivePane('chat')}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold group"
                    >
                      <span>Open chat room</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* QUICK ALIGNMENT CHECKIN CARD */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/10 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">Daily Self Alignment</span>
                    <h3 className="text-sm font-bold text-gray-200">Check-in with yourself</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Catalog how you feel, log today's primary focus, and identify immediate bottlenecks. Only takes 60 seconds.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-500/5 flex items-center justify-between">
                    <div className="text-[11px] text-gray-400 font-mono">
                      {checkins.length > 0 ? (
                        <span>Last check-in: <strong className="text-indigo-400">{checkins[0].createdAt}</strong></span>
                      ) : (
                        <span>Not checked in today</span>
                      )}
                    </div>
                    <button
                      onClick={() => setActivePane('checkin')}
                      className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Begin alignment
                    </button>
                  </div>
                </div>

              </div>

              {/* Row 2: Bento Grid of Guided reflections, goals, habits */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                
                {/* 1. GUIDED REFLECTIONS PANEL */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400">Guided Sessions</h4>
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded-full font-mono">{reflections.length} completed</span>
                  </div>

                  <div className="space-y-2.5">
                    {(Object.keys(GUIDED_SESSIONS) as GuidedSessionType[]).slice(0, 4).map((key) => {
                      const sess = GUIDED_SESSIONS[key];
                      return (
                        <button
                          key={key}
                          onClick={() => handleStartGuided(key)}
                          className="w-full p-2.5 text-left border border-gray-500/10 rounded-xl hover:border-cyan-500/20 bg-gray-500/5 hover:bg-gray-500/10 transition-all flex justify-between items-center group cursor-pointer"
                        >
                          <div className="space-y-0.5">
                            <h5 className="text-xs font-bold text-gray-200">{sess.name}</h5>
                            <p className="text-[10px] text-gray-400 truncate max-w-[190px]">{sess.description}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setActivePane('guided')}
                    className="w-full py-1.5 border border-dashed border-gray-500/20 hover:border-gray-500/30 text-[11px] text-gray-400 hover:text-gray-200 rounded-xl transition-all font-semibold font-mono"
                  >
                    View All 12 Guided sessions
                  </button>
                </div>

                {/* 2. ACTIVE GOAL WORKSPACE */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-emerald-400">Strategic Goals</h4>
                      <button
                        onClick={() => setActivePane('goals')}
                        className="text-[10px] text-emerald-400 hover:underline font-mono"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {goals.length === 0 ? (
                        <p className="text-xs text-gray-500 italic text-center py-6">No goals. Establish your first intentions!</p>
                      ) : (
                        goals.slice(0, 2).map((g) => (
                          <div key={g.id} className="space-y-1.5 p-2.5 rounded-xl bg-gray-500/5 border border-gray-500/10">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-200 truncate max-w-[150px]">{g.title}</span>
                              <span className="text-[10px] font-mono text-emerald-400">{g.progressPercent}% completion</span>
                            </div>
                            {/* Simple Progress Bar */}
                            <div className="h-1.5 w-full bg-gray-500/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 rounded-full transition-all"
                                style={{ width: `${g.progressPercent}%` }}
                              ></div>
                            </div>
                            <div className="text-[9px] text-gray-500 flex justify-between">
                              <span>Target: {g.targetDate}</span>
                              <span>{g.milestones.filter(m => m.isCompleted).length}/{g.milestones.length} milestones</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePane('goals')}
                    className="w-full py-1.5 border border-dashed border-emerald-500/10 hover:border-emerald-500/20 text-[11px] text-emerald-400 hover:text-emerald-300 rounded-xl transition-all font-semibold font-mono mt-4 cursor-pointer"
                  >
                    + Add New Strategic Goal
                  </button>
                </div>

                {/* 3. HABIT CONSISTENCY STREAKS */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-amber-400">Habit Streaks</h4>
                      <button
                        onClick={() => setActivePane('habits')}
                        className="text-[10px] text-amber-400 hover:underline font-mono"
                      >
                        Manage
                      </button>
                    </div>

                    <div className="space-y-3">
                      {habits.length === 0 ? (
                        <p className="text-xs text-gray-500 italic text-center py-6">No habits. Begin drafting healthy routines.</p>
                      ) : (
                        habits.slice(0, 2).map((h) => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          const completedToday = !!h.history[todayStr];
                          return (
                            <div key={h.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-500/5 border border-gray-500/10">
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-gray-200">{h.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-500 font-mono capitalize">{h.frequency}</span>
                                  <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1 py-0.2 rounded font-bold font-mono">
                                    Streak: {h.currentStreak}d
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => toggleHabitCompletion(h.id, todayStr)}
                                className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                                  completedToday
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'border-gray-500/20 text-gray-500 hover:border-gray-500/30'
                                }`}
                              >
                                <CheckSquare className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePane('habits')}
                    className="w-full py-1.5 border border-dashed border-amber-500/10 hover:border-amber-500/20 text-[11px] text-amber-400 hover:text-amber-300 rounded-xl transition-all font-semibold font-mono mt-4 cursor-pointer"
                  >
                    + Create Routine Habit
                  </button>
                </div>

              </div>

              {/* Row 3: Gratitude Notebook & Decision Journal */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                
                {/* GRATITUDE LOG PRESERVES */}
                <div className="p-5 rounded-2xl bg-pink-500/5 border border-pink-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-pink-400">Gratitude Notebook</h4>
                    <button
                      onClick={() => setActivePane('gratitude')}
                      className="text-[10px] text-pink-400 hover:underline font-mono"
                    >
                      Record Gratitude
                    </button>
                  </div>

                  <div className="space-y-3">
                    {gratitudes.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-5 text-center">Your gratitude book is blank. Start tracking small victories.</p>
                    ) : (
                      gratitudes.slice(0, 1).map((g) => (
                        <div key={g.id} className="p-3.5 rounded-xl bg-pink-500/5 border border-pink-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-pink-400 block">Cataloged on {new Date(g.createdAt).toLocaleDateString()}</span>
                          <ul className="space-y-1.5 text-xs text-gray-200">
                            {g.items.map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-pink-400 mt-0.5">❤</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                          {g.notes && <p className="text-[10px] text-gray-400 italic font-medium leading-relaxed">Notes: "{g.notes}"</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* STRATEGIC DECISION AUDIT */}
                <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono uppercase tracking-widest text-indigo-400">Strategic Decisions Journal</h4>
                    <button
                      onClick={() => setActivePane('decisions')}
                      className="text-[10px] text-indigo-400 hover:underline font-mono"
                    >
                      Audit choices
                    </button>
                  </div>

                  <div className="space-y-3">
                    {decisions.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-5 text-center">No decisions logged. Safeguard your strategic choices.</p>
                    ) : (
                      decisions.slice(0, 1).map((d) => (
                        <div key={d.id} className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-3.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-200 truncate max-w-[200px]">{d.decision}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                              d.status === 'reviewed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {d.status}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-[11px] leading-relaxed">
                            <p className="text-gray-400"><strong>Rationale</strong>: "{d.reason}"</p>
                            <p className="text-gray-400"><strong>Expected</strong>: "{d.expectedOutcome}"</p>
                            {d.status === 'pending' && (
                              <p className="text-amber-400 font-semibold mt-1">Review set for: {d.reviewDate}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* B. ACTIVE REFLECTIVE CHAT VIEW */}
          {activePane === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-grow flex flex-col bg-[#0b0f19] border border-gray-500/15 rounded-3xl overflow-hidden shadow-2xl h-[560px]"
            >
              {/* Chat Title bar */}
              <div className="p-4 bg-gray-500/5 border-b border-gray-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActivePane('cockpit')}
                    className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h3 className="text-sm font-bold text-gray-200 flex items-center gap-2">
                      <span>Reflective Sandbox</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    </h3>
                    <p className="text-[10px] text-cyan-400 font-mono">
                      Provider: {COACHING_STYLES[currentSession?.style || 'supportive_friend'].name}
                    </p>
                  </div>
                </div>

                {/* Dropdown switch on the fly */}
                <select
                  value={currentSession?.style}
                  onChange={(e) => handleStyleChange(e.target.value as CoachingStyle)}
                  className="bg-gray-900 border border-gray-500/20 text-xs px-2.5 py-1.5 rounded-xl text-gray-300 outline-none focus:border-cyan-400 transition-colors"
                >
                  {(Object.keys(COACHING_STYLES) as CoachingStyle[]).map((st) => (
                    <option key={st} value={st}>
                      Style: {COACHING_STYLES[st].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chat logs */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2 p-6">
                    <div className="h-10 w-10 bg-cyan-500/10 text-cyan-400 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-300">Start Reflecting Today</h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed max-w-sm">
                      Type anything you're processing right now. The selected coach style will analyze your history, active goals, and help you think deeper.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isSystem = m.role === 'system';
                    const isUser = m.role === 'user';
                    
                    if (isSystem) {
                      return (
                        <div key={m.id} className="text-center font-mono text-[9px] text-cyan-400 py-1 bg-cyan-950/20 rounded border border-cyan-950/40 max-w-xs mx-auto">
                          {m.content}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col space-y-1 max-w-[85%] ${
                          isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        {/* Name header */}
                        <span className="text-[9px] text-gray-500 font-mono">
                          {isUser ? 'YOU' : 'AI COACH'}
                        </span>

                        <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isUser 
                            ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white rounded-tr-none shadow-md font-medium'
                            : 'bg-gray-500/10 border border-gray-500/10 text-gray-200 rounded-tl-none font-medium'
                        }`}>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          
                          {/* Messages rate elements on assistant messages */}
                          {!isUser && (
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-gray-500/5 text-[10px] text-gray-500 font-mono">
                              
                              {/* Likes element */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => likeMessageMessage(m.id, 'liked')}
                                  className={`p-1 rounded hover:bg-gray-500/10 transition-colors ${m.feedbackStatus === 'liked' ? 'text-cyan-400' : ''}`}
                                  title="Like this response"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => likeMessageMessage(m.id, 'disliked')}
                                  className={`p-1 rounded hover:bg-gray-500/10 transition-colors ${m.feedbackStatus === 'disliked' ? 'text-red-400' : ''}`}
                                  title="Dislike this response"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </button>
                              </div>

                              {/* Star Ratings */}
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => rateMessageMessage(m.id, star)}
                                    className={`hover:text-yellow-400 transition-colors ${
                                      (m.rating || 0) >= star ? 'text-yellow-500' : 'text-gray-600'
                                    }`}
                                  >
                                    <Star className="h-2.5 w-2.5 fill-current" />
                                  </button>
                                ))}
                              </div>

                              {/* Action items */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => regenerateMessage(m.id)}
                                  className="hover:text-cyan-400 flex items-center gap-0.5"
                                  title="Regenerate this response"
                                >
                                  <RefreshCw className="h-2.5 w-2.5" />
                                  <span>Regen</span>
                                </button>

                                <button
                                  onClick={() => setCorrectionMessageId(m.id)}
                                  className="hover:text-cyan-400 flex items-center gap-0.5"
                                  title="Correct AI misunderstanding"
                                >
                                  <Edit3 className="h-2.5 w-2.5" />
                                  <span>Correct</span>
                                </button>
                              </div>

                            </div>
                          )}
                        </div>

                        {/* Interactive correction popup element inline */}
                        {correctionMessageId === m.id && (
                          <div className="p-3 bg-gray-900 border border-gray-500/20 rounded-xl space-y-2 mt-1.5 w-full">
                            <span className="text-[9px] font-mono text-cyan-400 block uppercase">Correct AI comprehension</span>
                            <textarea
                              value={correctionText}
                              onChange={(e) => setCorrectionText(e.target.value)}
                              placeholder="Describe how I was misunderstood (e.g. 'I was actually speaking of work, not relationships')"
                              rows={2}
                              className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-cyan-400"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setCorrectionMessageId(null)}
                                className="px-2.5 py-1 text-[10px] text-gray-400 font-mono hover:bg-gray-500/5 rounded-md"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => submitCorrection(m.id)}
                                className="px-3 py-1 text-[10px] bg-cyan-500/20 text-cyan-400 font-mono rounded-md hover:bg-cyan-500/30"
                              >
                                Submit & Reprompt
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {chatLoading && (
                  <div className="mr-auto max-w-[70%] space-y-1">
                    <span className="text-[9px] text-gray-500 font-mono">COACH COMPILING RESPONSE...</span>
                    <div className="p-3.5 bg-gray-500/5 border border-gray-500/10 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                      <div className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 bg-gray-500/5 border-t border-gray-500/10 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question, reflect on stress, check active goals..."
                  className="flex-grow bg-gray-950 border border-gray-500/20 rounded-xl px-4 py-2.5 text-xs text-gray-200 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-gray-500"
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-4 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white rounded-xl hover:opacity-95 disabled:opacity-50 flex items-center justify-center cursor-pointer transition-all shadow-md"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </motion.div>
          )}

          {/* C. GOALS WORKSPACE */}
          {activePane === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setActivePane('cockpit')} className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-bold">Goal Accountability Workspace</h3>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* CREATE NEW GOAL FORM */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">Goal Creator</span>
                  <form onSubmit={handleAddGoal} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Strategic Intention</label>
                      <input
                        type="text"
                        required
                        value={newGoalTitle}
                        onChange={(e) => setNewGoalTitle(e.target.value)}
                        placeholder="Establish Morning Routine"
                        className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Description</label>
                      <textarea
                        value={newGoalDesc}
                        onChange={(e) => setNewGoalDesc(e.target.value)}
                        placeholder="Why does this matter to you? How will you track progress?"
                        rows={3}
                        className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">Category</label>
                        <select
                          value={newGoalCat}
                          onChange={(e: any) => setNewGoalCat(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none"
                        >
                          <option value="personal">Personal</option>
                          <option value="career">Career</option>
                          <option value="health">Health</option>
                          <option value="finance">Finance</option>
                          <option value="relationship">Relationship</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-400">Target Date</label>
                        <input
                          type="date"
                          value={newGoalDate}
                          onChange={(e) => setNewGoalDate(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none"
                        />
                      </div>
                    </div>

                    {/* Milestones dynamic list */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 block">Required Milestones</label>
                      {newGoalMilestones.map((m, i) => (
                        <div key={i} className="flex gap-1.5">
                          <input
                            type="text"
                            value={m}
                            onChange={(e) => {
                              const updated = [...newGoalMilestones];
                              updated[i] = e.target.value;
                              setNewGoalMilestones(updated);
                            }}
                            placeholder={`Milestone #${i + 1}`}
                            className="flex-grow bg-gray-500/5 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setNewGoalMilestones([...newGoalMilestones, ''])}
                        className="text-[10px] text-emerald-400 font-mono hover:underline"
                      >
                        + Add Milestone
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all"
                    >
                      Establish Intentions & Milestones
                    </button>
                  </form>
                </div>

                {/* ACTIVE GOALS PANEL */}
                <div className="xl:col-span-2 space-y-4">
                  {goals.map((g) => (
                    <div key={g.id} className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-emerald-400 capitalize bg-emerald-500/15 px-2 py-0.5 rounded-full font-bold">
                            {g.category}
                          </span>
                          <h4 className="font-bold text-base text-gray-200 mt-1">{g.title}</h4>
                          <p className="text-xs text-gray-400">{g.description}</p>
                        </div>
                        <span className="text-sm font-mono font-bold text-emerald-400">{g.progressPercent}% Completed</span>
                      </div>

                      {/* Milestones render */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Action Milestones</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {g.milestones.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => toggleMilestone(g.id, m.id)}
                              className={`p-3 rounded-xl border text-left text-xs flex items-center gap-3 transition-all cursor-pointer ${
                                m.isCompleted
                                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 line-through opacity-80'
                                  : 'bg-gray-500/5 border-gray-500/10 text-gray-300 hover:border-gray-500/20'
                              }`}
                            >
                              {m.isCompleted ? <CheckCircle className="h-4.5 w-4.5 text-emerald-400" /> : <Plus className="h-4.5 w-4.5 text-gray-500" />}
                              <span>{m.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reflections history */}
                      {g.reflections && g.reflections.length > 0 && (
                        <div className="space-y-2 bg-gray-950/45 p-3 rounded-xl border border-gray-500/5">
                          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Goal reflection timeline</span>
                          <div className="space-y-2">
                            {g.reflections.map((ref) => (
                              <div key={ref.id} className="text-xs text-gray-400 pl-3 border-l-2 border-emerald-500/30">
                                <p className="italic">"{ref.text}"</p>
                                <span className="text-[9px] font-mono block mt-1 text-gray-500">{new Date(ref.createdAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reflection input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={goalReflectionText[g.id] || ''}
                          onChange={(e) => setGoalReflectionText((prev) => ({ ...prev, [g.id]: e.target.value }))}
                          placeholder="Log progress, breakthroughs, or blockers encountered..."
                          className="flex-grow bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-emerald-400"
                        />
                        <button
                          onClick={() => addGoalReflection(g.id)}
                          className="px-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
                        >
                          Log reflection
                        </button>
                      </div>

                    </div>
                  ))}
                </div>

              </div>
            </motion.div>
          )}

          {/* D. HABITS CONSISTENCY MATRIX */}
          {activePane === 'habits' && (
            <motion.div
              key="habits"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setActivePane('cockpit')} className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-bold">Habit Streaks & Consistency Log</h3>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* HABIT FORM */}
                <div className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest block">Habit Configurator</span>
                  <form onSubmit={handleAddHabit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Habit Name</label>
                      <input
                        type="text"
                        required
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        placeholder="Somatic Breathing Loop"
                        className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Description</label>
                      <textarea
                        value={newHabitDesc}
                        onChange={(e) => setNewHabitDesc(e.target.value)}
                        placeholder="When and where will you do this? E.g. 'Sit quietly at desk after coffee'."
                        rows={2}
                        className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">Target Frequency</label>
                      <select
                        value={newHabitFreq}
                        onChange={(e: any) => setNewHabitFreq(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-amber-400"
                      >
                        <option value="daily">Daily Consistency</option>
                        <option value="weekly_3x">3 Days / Week</option>
                        <option value="weekly_5x">5 Days / Week</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all"
                    >
                      Seal Routine Habit
                    </button>
                  </form>
                </div>

                {/* HABIT STREAK LISTS & GRID */}
                <div className="xl:col-span-2 space-y-4">
                  {habits.map((h) => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    return (
                      <div key={h.id} className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4">
                        
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-bold text-gray-200 text-sm">{h.name}</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">{h.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold font-mono">
                              Current: {h.currentStreak}d
                            </span>
                            <span className="text-[10px] bg-gray-500/10 text-gray-300 px-2 py-0.5 rounded-full font-bold font-mono">
                              Max: {h.longestStreak}d
                            </span>
                          </div>
                        </div>

                        {/* Calendar matrix - last 14 days */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Last 14 days tracking sheet</span>
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 14 }).map((_, idx) => {
                              const checkDate = new Date();
                              checkDate.setDate(checkDate.getDate() - (13 - idx));
                              const dateStr = checkDate.toISOString().split('T')[0];
                              const isCompleted = !!h.history[dateStr];
                              
                              return (
                                <button
                                  key={idx}
                                  onClick={() => toggleHabitCompletion(h.id, dateStr)}
                                  className={`p-2 rounded-xl text-[10px] font-bold font-mono border flex flex-col items-center justify-between min-w-[42px] cursor-pointer transition-all ${
                                    isCompleted
                                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                      : 'bg-gray-500/5 border-gray-500/10 text-gray-500 hover:border-gray-500/25'
                                  }`}
                                >
                                  <span>{checkDate.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
                                  <span className="mt-1 text-[9px]">{checkDate.getDate()}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            </motion.div>
          )}

          {/* E. GRATITUDE JOURNAL */}
          {activePane === 'gratitude' && (
            <motion.div
              key="gratitude"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setActivePane('cockpit')} className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-bold">Gratitude & Daily Highlights</h3>
              </div>

              <div className="p-5 rounded-2xl bg-pink-500/5 border border-pink-500/10 space-y-4">
                <span className="text-[10px] font-mono text-pink-400 uppercase tracking-widest block">Gratitude Notebook Draft</span>
                <p className="text-xs text-gray-400">
                  Reflect deeply. What are three small, simple moments or things that brought warm light or ease to you today?
                </p>

                <form onSubmit={handleAddGratitude} className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-pink-400 font-bold text-xs">❤ 1.</span>
                      <input
                        type="text"
                        required
                        value={gratItem1}
                        onChange={(e) => setGratItem1(e.target.value)}
                        placeholder="The peaceful quiet before my phone wakes up..."
                        className="flex-grow bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-pink-400"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-pink-400 font-bold text-xs">❤ 2.</span>
                      <input
                        type="text"
                        value={gratItem2}
                        onChange={(e) => setGratItem2(e.target.value)}
                        placeholder="The taste of the cold water after my morning walk..."
                        className="flex-grow bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-pink-400"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-pink-400 font-bold text-xs">❤ 3.</span>
                      <input
                        type="text"
                        value={gratItem3}
                        onChange={(e) => setGratItem3(e.target.value)}
                        placeholder="A funny video my brother sent me..."
                        className="flex-grow bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-pink-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">Contextual notes</label>
                    <textarea
                      value={gratNotes}
                      onChange={(e) => setGratNotes(e.target.value)}
                      placeholder="Any additional thoughts or feelings about today's highlights?"
                      rows={2}
                      className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2.5 text-xs text-gray-200 outline-none focus:border-pink-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Seal gratitude preservation entry
                  </button>
                </form>
              </div>

              {/* Gratitude timeline logs */}
              <div className="space-y-3.5 pt-4">
                <span className="text-xs font-mono uppercase tracking-widest text-gray-400">Previous Gratitude Collections</span>
                {gratitudes.map((g) => (
                  <div key={g.id} className="p-4 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-3">
                    <span className="text-[10px] font-mono text-gray-500">{new Date(g.createdAt).toLocaleDateString()}</span>
                    <ul className="space-y-1.5 text-xs">
                      {g.items.map((it, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="text-pink-400 font-bold">●</span>
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

            </motion.div>
          )}

          {/* F. STRATEGIC DECISION JOURNAL */}
          {activePane === 'decisions' && (
            <motion.div
              key="decisions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setActivePane('cockpit')} className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-bold">Strategic Decisions Audit Logs</h3>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* CREATE DECISION OR REVIEW FORM */}
                <div className="space-y-5">
                  
                  {reviewingDecisionId ? (
                    /* REVIEW FORM */
                    <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4 animate-pulse">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">Audit review</span>
                        <button
                          onClick={() => setReviewingDecisionId(null)}
                          className="text-[10px] text-gray-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>

                      <h4 className="font-bold text-xs text-gray-200 truncate">
                        Choice: "{decisions.find(d => d.id === reviewingDecisionId)?.decision}"
                      </h4>

                      <form onSubmit={handleReviewDecision} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400">Actual Outcome</label>
                          <textarea
                            required
                            value={decReviewOutcome}
                            onChange={(e) => setDecReviewOutcome(e.target.value)}
                            placeholder="What actually happened? Be completely honest."
                            rows={3}
                            className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400">Lessons Learned</label>
                          <textarea
                            value={decReviewLessons}
                            onChange={(e) => setDecReviewLessons(e.target.value)}
                            placeholder="What did this teach you about your planning logic or biases?"
                            rows={3}
                            className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold transition-all"
                        >
                          Log decision post-mortem review
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* DECISION CREATE FORM */
                    <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                      <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block">Log choice context</span>
                      <form onSubmit={handleAddDecision} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400">Strategic Choice</label>
                          <input
                            type="text"
                            required
                            value={decTitle}
                            onChange={(e) => setDecTitle(e.target.value)}
                            placeholder="Hire full-stack developer or write code myself"
                            className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-indigo-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400">Rationale / Motivations</label>
                          <textarea
                            value={decReason}
                            onChange={(e) => setDecReason(e.target.value)}
                            placeholder="Why are you choosing this? Name factors and trade-offs."
                            rows={3}
                            className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-indigo-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400">Expected Outcome</label>
                          <textarea
                            value={decExpected}
                            onChange={(e) => setDecExpected(e.target.value)}
                            placeholder="What do you project will happen as a result of this decision?"
                            rows={2}
                            className="w-full bg-gray-500/5 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none focus:border-indigo-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs text-gray-400">Review Audit Date</label>
                          <input
                            type="date"
                            value={decDate}
                            onChange={(e) => setDecDate(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-500/20 rounded-lg p-2 text-xs text-gray-200 outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold transition-all"
                        >
                          Lock decision logic in journal
                        </button>
                      </form>
                    </div>
                  )}

                </div>

                {/* HISTORICAL DECISION GRID */}
                <div className="xl:col-span-2 space-y-4">
                  {decisions.map((d) => (
                    <div key={d.id} className="p-5 rounded-2xl bg-gray-500/5 border border-gray-500/10 space-y-4 relative overflow-hidden">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-gray-200 text-sm">{d.decision}</h4>
                          <span className="text-[9px] font-mono text-gray-500 block">Created on {new Date(d.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                            d.status === 'reviewed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {d.status}
                          </span>
                          {d.status === 'pending' && (
                            <button
                              onClick={() => setReviewingDecisionId(d.id)}
                              className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md hover:bg-emerald-500/20 font-bold font-mono transition-colors"
                            >
                              Audit Review
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed text-gray-300">
                        <div className="bg-gray-950/30 p-3 rounded-xl border border-gray-500/5">
                          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block mb-1">Rational logic</p>
                          <p className="italic">"{d.reason}"</p>
                        </div>
                        <div className="bg-gray-950/30 p-3 rounded-xl border border-gray-500/5">
                          <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest block mb-1">Expected Projection</p>
                          <p className="italic">"{d.expectedOutcome}"</p>
                        </div>
                      </div>

                      {d.status === 'reviewed' && (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl space-y-2 text-xs">
                          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">Post-mortem audit assessment</p>
                          <p className="text-gray-200"><strong>Actual Outcome:</strong> "{d.actualOutcome}"</p>
                          {d.lessonsLearned && (
                            <p className="text-gray-400"><strong>Cognitive lessons:</strong> "{d.lessonsLearned}"</p>
                          )}
                          <span className="text-[9px] font-mono text-gray-500 block">Reviewed on {new Date(d.reviewedAt || '').toLocaleDateString()}</span>
                        </div>
                      )}

                    </div>
                  ))}
                </div>

              </div>
            </motion.div>
          )}

          {/* G. DAILY ALIGNMENT CHECKIN SCREEN */}
          {activePane === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-xl mx-auto p-5 rounded-2xl bg-[#0d1222] border border-gray-500/10 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <button onClick={() => setActivePane('cockpit')} className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h3 className="text-lg font-bold">Daily Mental Alignment</h3>
              </div>

              <form onSubmit={handleAddCheckin} className="space-y-4">
                
                {/* 1. FEELINGS SELECTOR */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400 block">How are you feeling at your core right now?</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {['Calm', 'Anxious', 'Focused', 'Exhausted', 'Inspired', 'Tense', 'Happy', 'Frustrated', 'Quiet', 'Overwhelmed'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setChkFeeling(f)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          chkFeeling === f
                            ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400'
                            : 'bg-gray-500/5 border-gray-500/10 text-gray-400 hover:border-gray-500/20 hover:text-gray-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. SLIDER SCORE */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-gray-400">Rate your overall focus and alignment score (1 to 10)</label>
                    <span className="font-bold text-indigo-400 text-sm">{chkScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={chkScore}
                    onChange={(e) => setChkScore(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-500/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* 3. INPUT FIELDS */}
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">What is your primary focus area today?</label>
                    <input
                      type="text"
                      required
                      value={chkFocus}
                      onChange={(e) => setChkFocus(e.target.value)}
                      placeholder="Executing the full clean-code reflection platform..."
                      className="w-full bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400">What is the most significant bottleneck or source of stress?</label>
                    <input
                      type="text"
                      value={chkChallenge}
                      onChange={(e) => setChkChallenge(e.target.value)}
                      placeholder="Keeping variable names tightly compiled without type conflicts..."
                      className="w-full bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">What went particularly well?</label>
                      <input
                        type="text"
                        value={chkWentWell}
                        onChange={(e) => setChkWentWell(e.target.value)}
                        placeholder="The linter verified all core systems as green..."
                        className="w-full bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-400">What are you looking forward to?</label>
                      <input
                        type="text"
                        value={chkForward}
                        onChange={(e) => setChkForward(e.target.value)}
                        placeholder="Resting and walking after building a massive feature..."
                        className="w-full bg-gray-950 border border-gray-500/20 rounded-xl px-3 py-2 text-xs text-gray-200 outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all mt-4 cursor-pointer shadow-md"
                >
                  Log check-in & seal alignment journal
                </button>
              </form>
            </motion.div>
          )}

          {/* H. GUIDED JOURNALING WIZARD */}
          {activePane === 'guided' && (
            <motion.div
              key="guided"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (activeGuidedType && !guidedAIFeedback && !confirm('Discard active guided reflection session?')) return;
                      setActiveGuidedType(null);
                      setActivePane('cockpit');
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-500/10 text-gray-400 hover:text-gray-200 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <h3 className="text-lg font-bold">Guided Journaling Space</h3>
                </div>
                {activeGuidedType && !guidedAIFeedback && (
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
                    Step {guidedStepIndex + 1} of {GUIDED_SESSIONS[activeGuidedType].steps.length}
                  </span>
                )}
              </div>

              {!activeGuidedType ? (
                /* SELECTION LIST */
                <div className="space-y-6">
                  <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                    Begin any of the 12 expert-designed reflection sessions at any time. When completed, our cognitive coaching engine will automatically synthesize your insights and suggest concrete micro-habits.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {(Object.keys(GUIDED_SESSIONS) as GuidedSessionType[]).map((key) => {
                      const sess = GUIDED_SESSIONS[key];
                      return (
                        <div key={key} className="p-4 rounded-xl bg-gray-500/5 border border-gray-500/10 space-y-4 flex flex-col justify-between hover:border-cyan-500/20 transition-all">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest">{sess.category}</span>
                            <h4 className="font-bold text-sm text-gray-200">{sess.name}</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">{sess.description}</p>
                          </div>

                          <button
                            onClick={() => handleStartGuided(key)}
                            className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold transition-all cursor-pointer mt-3"
                          >
                            Start Session
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : guidedAIFeedback ? (
                /* WIZARD COMPLETED FEEDBACK */
                <div className="max-w-2xl mx-auto p-5 rounded-2xl bg-[#0b0f19] border border-gray-500/10 space-y-5 shadow-2xl">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold text-center text-gray-100">Guided Reflection Sealed & Saved</h4>

                  <div className="p-4 bg-gray-950/60 rounded-xl border border-gray-500/5 space-y-4 text-xs leading-relaxed text-gray-300">
                    <p className="text-[10px] font-mono text-cyan-400 block uppercase tracking-widest mb-1">Coach Synthesis Report</p>
                    <p className="whitespace-pre-wrap">{guidedAIFeedback}</p>
                  </div>

                  <button
                    onClick={() => {
                      setActiveGuidedType(null);
                      setActivePane('cockpit');
                    }}
                    className="w-full py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    Finish Session & Return to Cockpit
                  </button>
                </div>
              ) : (
                /* ACTIVE WIZARD STEP */
                <div className="max-w-xl mx-auto p-5 rounded-2xl bg-[#0d1222] border border-gray-500/10 space-y-5 shadow-2xl">
                  <h4 className="font-bold text-sm text-gray-400">{GUIDED_SESSIONS[activeGuidedType].name}</h4>
                  
                  <div className="space-y-4 pt-2">
                    <p className="text-sm font-bold text-gray-100 leading-relaxed">
                      {GUIDED_SESSIONS[activeGuidedType].steps[guidedStepIndex]}
                    </p>

                    <textarea
                      required
                      value={guidedAnswers[GUIDED_SESSIONS[activeGuidedType].steps[guidedStepIndex]] || ''}
                      onChange={(e) => {
                        const currentQuestion = GUIDED_SESSIONS[activeGuidedType].steps[guidedStepIndex];
                        setGuidedAnswers((prev) => ({ ...prev, [currentQuestion]: e.target.value }));
                      }}
                      placeholder="Type your authentic thoughts here..."
                      rows={5}
                      className="w-full bg-gray-950 border border-gray-500/20 rounded-xl p-3 text-xs text-gray-200 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex gap-2 justify-between pt-2">
                    <button
                      disabled={guidedStepIndex === 0}
                      onClick={() => setGuidedStepIndex((prev) => prev - 1)}
                      className="px-4 py-2 border border-gray-500/20 hover:bg-gray-500/5 text-gray-400 rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      disabled={guidedLoading || !(guidedAnswers[GUIDED_SESSIONS[activeGuidedType].steps[guidedStepIndex]]?.trim())}
                      onClick={handleNextGuidedStep}
                      className="px-5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      {guidedLoading ? (
                        <span>Synthesizing...</span>
                      ) : guidedStepIndex === GUIDED_SESSIONS[activeGuidedType].steps.length - 1 ? (
                        <span>Complete Session & Synthesize</span>
                      ) : (
                        <>
                          <span>Next Question</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
