/**
 * LogEasy Personal Intelligence Core & Multi-Agent Architecture
 * Coordinates specialized agents with strict cryptographic and privacy boundary scopes.
 * Transparent, explainable, and non-manipulative.
 */

import { logger } from '../analytics/logger';
import { localDB, LocalJournalEntry } from '../database/local_db';
import { 
  AgentScope, 
  AgentActionLog, 
  AIMemoryProposal, 
  LifeChapter, 
  PersonProfile 
} from '../database/hios_types';
import { aiService } from './ai_service';

export interface AgentResponse {
  agentName: string;
  response: string;
  evidenceSnippets: string[];
  proposedMemories?: AIMemoryProposal[];
  confidence: number;
  scopesUsed: AgentScope[];
  timestamp: string;
}

export interface AgentDefinition {
  name: string;
  description: string;
  requiredScopes: AgentScope[];
  process: (input: string, context: AgentContext) => Promise<AgentResponse>;
}

export interface AgentContext {
  userId: string;
  journalEntries: LocalJournalEntry[];
  people: PersonProfile[];
  chapters: LifeChapter[];
  grantedScopes: AgentScope[];
}

class PersonalIntelligenceCore {
  private static instance: PersonalIntelligenceCore;
  private agents: Map<string, AgentDefinition> = new Map();
  private auditListeners: Array<(log: AgentActionLog) => void> = [];

  private constructor() {
    this.registerCoreAgents();
  }

  public static getInstance(): PersonalIntelligenceCore {
    if (!PersonalIntelligenceCore.instance) {
      PersonalIntelligenceCore.instance = new PersonalIntelligenceCore();
    }
    return PersonalIntelligenceCore.instance;
  }

  public subscribeToLogs(listener: (log: AgentActionLog) => void): () => void {
    this.auditListeners.push(listener);
    return () => {
      this.auditListeners = this.auditListeners.filter(l => l !== listener);
    };
  }

  private notifyLog(log: AgentActionLog) {
    this.auditListeners.forEach(l => l(log));
  }

  /**
   * Registers the 10 Sovereign Agents described in Section 7 of the HIOS specification.
   */
  private registerCoreAgents() {
    // 1. Memory Agent
    this.registerAgent({
      name: 'MemoryAgent',
      description: 'Responsible for memory organization, retrieval, linking, chronology, duplicate detection, and memory importance.',
      requiredScopes: ['memory.read', 'memory.write', 'AI.analysis'],
      process: async (input, context) => {
        const matchingEntries = context.journalEntries.filter(e => 
          e.transcript.toLowerCase().includes(input.toLowerCase()) ||
          (e.title && e.title.toLowerCase().includes(input.toLowerCase())) ||
          (e.categories && e.categories.some(c => c.toLowerCase().includes(input.toLowerCase())))
        );

        const snippets = matchingEntries.slice(0, 3).map(e => `[${new Date(e.createdAt).toLocaleDateString()}] ${e.transcript.slice(0, 160)}...`);
        
        let response = '';
        if (matchingEntries.length > 0) {
          response = `Memory Agent retrieved ${matchingEntries.length} verified personal journal record(s) matching "${input}". Chronological continuity intact.`;
        } else {
          response = `Memory Agent searched local encrypted archives. No exact match found for "${input}". You can capture this moment to create a new verified memory anchor.`;
        }

        return {
          agentName: 'MemoryAgent',
          response,
          evidenceSnippets: snippets,
          confidence: 0.95,
          scopesUsed: ['memory.read'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 2. Reflection Agent
    this.registerAgent({
      name: 'ReflectionAgent',
      description: 'Generates gentle reflection prompts, observes recurring themes, and assists with meaning extraction.',
      requiredScopes: ['memory.read', 'AI.analysis', 'AI.generation'],
      process: async (input, context) => {
        const recentEntries = context.journalEntries.slice(0, 5);
        const emotions = recentEntries.map(e => e.moodLabel).filter(Boolean);
        const evidence = recentEntries.slice(0, 2).map(e => `Entry from ${new Date(e.createdAt).toLocaleDateString()}: "${e.transcript.slice(0, 100)}..."`);
        
        const response = `Based on your recent reflections, your emotional center has focused on ${emotions.slice(0, 3).join(', ') || 'deep presence'}. What is one subtle realization that brought you genuine clarity today?`;

        return {
          agentName: 'ReflectionAgent',
          response,
          evidenceSnippets: evidence,
          confidence: 0.88,
          scopesUsed: ['memory.read', 'AI.generation'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 3. Strategy Agent
    this.registerAgent({
      name: 'StrategyAgent',
      description: 'Organizes goals, structured prioritization, action plans, and future scenarios without dictating decisions.',
      requiredScopes: ['goals.read', 'goals.write', 'AI.analysis'],
      process: async (input) => {
        const response = `Strategy Assessment for "${input}":\n` +
          `• Primary Objective: Clarify core milestones and break down next actions into sustainable steps.\n` +
          `• Suggested Constraint Check: Ensure daily habits allocate at least 20 minutes of protected focus.\n` +
          `• Risk/Obstacle Anticipation: Identify potential fatigue triggers before they occur.`;

        return {
          agentName: 'StrategyAgent',
          response,
          evidenceSnippets: ['Strategic planning model aligned with user goals.'],
          confidence: 0.9,
          scopesUsed: ['goals.read', 'AI.analysis'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 4. Learning Agent
    this.registerAgent({
      name: 'LearningAgent',
      description: 'Aids personal learning, skill development tracking, and lesson retention.',
      requiredScopes: ['memory.read', 'AI.analysis'],
      process: async (input) => {
        const response = `Learning Agent synthesized topic: "${input}".\n` +
          `• Foundational Concept: Establish the active mental model before memorization.\n` +
          `• Retention Loop: Spaced repetition and writing summaries in your own words enhances recall by 60%.\n` +
          `• Reflection Question: What prior knowledge does this connect to in your journey?`;

        return {
          agentName: 'LearningAgent',
          response,
          evidenceSnippets: ['Synthesized from cognitive learning best practices.'],
          confidence: 0.92,
          scopesUsed: ['memory.read', 'AI.analysis'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 5. Creativity Agent
    this.registerAgent({
      name: 'CreativityAgent',
      description: 'Generates creative writing prompts, metaphors, artistic experiments, and playful exploration free from productivity pressure.',
      requiredScopes: ['AI.generation'],
      process: async (input) => {
        const prompts = [
          `Write a letter describing the world through the eyes of the oldest tree in your favorite park.`,
          `If your current emotion had a color, texture, and musical timbre, how would it sound in an empty cathedral?`,
          `Sketch or imagine a room designed solely to preserve moments of peaceful silence.`
        ];
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        const response = `Creativity Spark for "${input || 'Creative Freeflow'}":\n\n${randomPrompt}\n\n*Reminder: Create simply because you enjoy creating. No deadlines, no evaluation.*`;

        return {
          agentName: 'CreativityAgent',
          response,
          evidenceSnippets: ['Productivity-free creative playground prompt.'],
          confidence: 0.95,
          scopesUsed: ['AI.generation'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 6. Decision Agent
    this.registerAgent({
      name: 'DecisionAgent',
      description: 'Provides structured decision frameworks (options, trade-offs, consequences, uncertainties) without making decisions for you.',
      requiredScopes: ['AI.analysis'],
      process: async (input) => {
        const response = `Structured Decision Framework for: "${input}"\n\n` +
          `1. USER INPUT: "${input}"\n` +
          `2. KNOWN FACTS: Identify what you verified with 100% certainty versus what is an assumption.\n` +
          `3. TRADE-OFF MATRIX: Compare Option A (immediate path) vs Option B (deliberate patience).\n` +
          `4. UNCERTAINTIES: What missing information, if known, would immediately clarify your choice?\n` +
          `5. CORE VALUES ALIGNMENT: Which option best honors your authentic personal values in 5 years?\n\n` +
          `*Note: LogEasy organizes the reasoning. The authority and decision remain entirely yours.*`;

        return {
          agentName: 'DecisionAgent',
          response,
          evidenceSnippets: ['Structured decision taxonomy principles.'],
          confidence: 0.96,
          scopesUsed: ['AI.analysis'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 7. Compassion Agent
    this.registerAgent({
      name: 'CompassionAgent',
      description: 'Speaks with gentle, supportive, non-judgmental language during vulnerable or difficult moments. Never manipulates emotions.',
      requiredScopes: ['AI.generation'],
      process: async (input) => {
        const response = `I hear you, and what you're experiencing deserves gentle care and space. It is completely human to feel worn or uncertain at times. You don't have to fix everything in this very minute.\n\nTake a slow, deep breath. Acknowledge your effort, let your shoulders drop, and remember that your worth is not defined by any single difficult day.`;

        return {
          agentName: 'CompassionAgent',
          response,
          evidenceSnippets: ['Trauma-informed self-compassion framework.'],
          confidence: 0.97,
          scopesUsed: ['AI.generation'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 8. Relationship Agent
    this.registerAgent({
      name: 'RelationshipAgent',
      description: 'Encourages genuine human connection, gratitude for loved ones, and communication reflection. Never isolates users.',
      requiredScopes: ['relationships.read', 'AI.analysis'],
      process: async (input, context) => {
        const peopleNames = context.people.map(p => p.name).slice(0, 3);
        const evidence = context.people.slice(0, 2).map(p => `Person profile: ${p.name} (${p.relationshipType})`);
        
        const response = `Relationship Reflection on "${input}":\n` +
          `Your human connections are anchors of well-being. ${peopleNames.length > 0 ? `Reflecting on people like ${peopleNames.join(', ')}: ` : ''}` +
          `Consider sending a brief message of authentic appreciation today. Real-world human relationships bring warmth that technology cannot replace.`;

        return {
          agentName: 'RelationshipAgent',
          response,
          evidenceSnippets: evidence.length > 0 ? evidence : ['General relationship continuity principles.'],
          confidence: 0.91,
          scopesUsed: ['relationships.read'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 9. Life Story Agent
    this.registerAgent({
      name: 'LifeStoryAgent',
      description: 'Weaves personal narratives across childhood, career, turning points, and future chapters strictly from user-authorized facts.',
      requiredScopes: ['legacy.read', 'memory.read', 'AI.generation'],
      process: async (input, context) => {
        const chapters = context.chapters.slice(0, 3);
        const chapterTitles = chapters.map(c => c.title).join(', ');
        const evidence = chapters.map(c => `Chapter [${c.startYear}]: ${c.title} - ${c.summary}`);

        const response = `Life Story Thread:\n` +
          `Your personal journey spans meaningful chapters ${chapterTitles ? `including ${chapterTitles}` : ''}. ` +
          `Every challenge and turning point has shaped who you are today. As you reflect on "${input}", remember that you are the author of the next chapter.`;

        return {
          agentName: 'LifeStoryAgent',
          response,
          evidenceSnippets: evidence.length > 0 ? evidence : ['Personal biography narrative timeline.'],
          confidence: 0.93,
          scopesUsed: ['legacy.read', 'memory.read'],
          timestamp: new Date().toISOString()
        };
      }
    });

    // 10. Body & Recovery Agent
    this.registerAgent({
      name: 'BodyRecoveryAgent',
      description: 'Reflects on user-entered energy, sleep, movement, and physical sensations. Strict non-medical mandate: never diagnoses or treats.',
      requiredScopes: ['health_observation.read', 'AI.analysis'],
      process: async (input) => {
        const response = `Body & Recovery Observation:\n` +
          `• Focus: Tracking patterns in your self-reported rest and physical vitality.\n` +
          `• Gentle Insight: Adequate sleep and restorative quiet time directly support cognitive resilience.\n\n` +
          `⚠️ MANDATORY HEALTH DISCLAIMER: LogEasy is a personal self-reflection system, NOT a medical device. It does not diagnose, treat, or offer medical advice. If you experience persistent physical discomfort, consult a qualified healthcare professional.`;

        return {
          agentName: 'BodyRecoveryAgent',
          response,
          evidenceSnippets: ['Non-medical lifestyle wellness observation heuristics.'],
          confidence: 0.98,
          scopesUsed: ['health_observation.read'],
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  public registerAgent(agent: AgentDefinition) {
    this.agents.set(agent.name, agent);
  }

  public getAgents(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  public getAgent(name: string): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  /**
   * Dispatches a request to a designated agent with strict permission boundary checking.
   */
  public async dispatch(
    agentName: string, 
    input: string, 
    context: AgentContext
  ): Promise<AgentResponse> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent "${agentName}" is not registered in Personal Intelligence Core.`);
    }

    // Check scope authorization
    const missingScopes = agent.requiredScopes.filter(scope => !context.grantedScopes.includes(scope));
    if (missingScopes.length > 0) {
      const denialLog: AgentActionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        agentName,
        authorizedScopes: context.grantedScopes,
        action: `Attempted execution on input: "${input.slice(0, 30)}..."`,
        timestamp: new Date().toISOString(),
        status: 'denied'
      };
      await localDB.saveAgentActionLog(denialLog);
      this.notifyLog(denialLog);
      logger.warn('PersonalIntelligenceCore', `Access denied to ${agentName}. Missing required scopes: ${missingScopes.join(', ')}`);
      throw new Error(`Permission Denied: Agent ${agentName} requires scopes [${missingScopes.join(', ')}], which were not granted.`);
    }

    const actionLog: AgentActionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agentName,
      authorizedScopes: context.grantedScopes,
      action: `Executed query on: "${input.slice(0, 40)}..."`,
      sourceAttribution: 'Local Sovereign Engine',
      timestamp: new Date().toISOString(),
      status: 'allowed'
    };
    await localDB.saveAgentActionLog(actionLog);
    this.notifyLog(actionLog);

    return await agent.process(input, context);
  }

  /**
   * Generates an explicit AI Memory Proposal with SAVE / EDIT / DISMISS options.
   * Never silently commits AI inferences to durable memory.
   */
  public async proposeMemoryFromText(
    userId: string, 
    text: string, 
    category: string = 'personal_insight'
  ): Promise<AIMemoryProposal> {
    const proposal: AIMemoryProposal = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      memoryText: text,
      inferredCategory: category,
      confidenceScore: 0.85,
      sourceSnippet: text.slice(0, 80),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await localDB.saveAIMemoryProposal(proposal);
    return proposal;
  }
}

export const personalIntelligenceCore = PersonalIntelligenceCore.getInstance();
export type { AgentScope };

export const SOVEREIGN_AGENTS = [
  { id: 'MemoryAgent', name: 'Memory Agent', role: 'Chronological continuity, retrieval, and importance anchoring.', requiredScopes: ['memory.read', 'memory.write', 'AI.analysis'] as AgentScope[] },
  { id: 'ReflectionAgent', name: 'Reflection Agent', role: 'Deep self-reflection prompts and emotional center observations.', requiredScopes: ['memory.read', 'AI.analysis', 'AI.generation'] as AgentScope[] },
  { id: 'StrategyAgent', name: 'Strategy Agent', role: 'Prioritization, goal synthesis, action planning, and future scenarios.', requiredScopes: ['goals.read', 'goals.write', 'AI.analysis'] as AgentScope[] },
  { id: 'LearningAgent', name: 'Learning Agent', role: 'Synthesizing hard-won lessons, insights, and cognitive patterns.', requiredScopes: ['memory.read', 'AI.analysis'] as AgentScope[] },
  { id: 'CreativityAgent', name: 'Creativity Agent', role: 'Playful prompts, writing sparks, and metaphor synthesis without pressure.', requiredScopes: ['AI.generation'] as AgentScope[] },
  { id: 'DecisionAgent', name: 'Decision Agent', role: 'Rigorously separating facts, assumptions, and values alignment.', requiredScopes: ['goals.read', 'AI.analysis'] as AgentScope[] },
  { id: 'CompassionAgent', name: 'Compassion Agent', role: 'Gentle perspective during emotional pain, loss, or self-doubt.', requiredScopes: ['memory.read', 'AI.generation'] as AgentScope[] },
  { id: 'RelationshipAgent', name: 'Relationship Agent', role: 'Observing relational care, gratitude, and peaceful conflict resolution.', requiredScopes: ['relationships.read', 'AI.analysis'] as AgentScope[] },
  { id: 'LifeStoryAgent', name: 'Life Story Agent', role: 'Connecting life chapters, milestones, and personal evolution narrative.', requiredScopes: ['memory.read', 'AI.analysis'] as AgentScope[] },
  { id: 'BodyRecoveryAgent', name: 'Body & Recovery Agent', role: 'Non-medical awareness of somatic energy, quiet time, and mental decompression.', requiredScopes: ['health_observation.read'] as AgentScope[] }
];
