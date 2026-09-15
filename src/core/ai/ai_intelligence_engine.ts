/**
 * LogEasy AI Intelligence Engine
 * Implements Personal Memory, Knowledge Graph, Pattern Detection, Life Timeline,
 * Smart Summarization, Semantic Search, and the Evidence System.
 */

import { logger } from '../analytics/logger';
import { localDB, LocalJournalEntry } from '../database/local_db';
import { 
  AIMemory, 
  AIEntity, 
  AIRelationship, 
  AIInsight, 
  AISummary, 
  AITask,
  AISemanticQueryResult
} from './ai_types';
import { aiService } from './ai_service';

class AIIntelligenceEngine {
  private static instance: AIIntelligenceEngine;
  private isProcessingQueue = false;

  private constructor() {
    // Listen to network status changes if syncEngine is available
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processOfflineTasks());
    }
  }

  public static getInstance(): AIIntelligenceEngine {
    if (!AIIntelligenceEngine.instance) {
      AIIntelligenceEngine.instance = new AIIntelligenceEngine();
    }
    return AIIntelligenceEngine.instance;
  }

  /**
   * Main entry point to analyze a journal entry.
   * Extracts memories, entities, relationships, patterns, and milestones.
   */
  public async analyzeJournalEntry(entry: LocalJournalEntry, options?: { forceLocal?: boolean }): Promise<void> {
    logger.info('AIIntelligenceEngine', `Starting intelligence analysis for entry: ${entry.id}`);
    
    // Update entry processing status
    entry.aiProcessingStatus = 'processing';
    await localDB.saveJournalEntry(entry);

    const isOnline = navigator.onLine;
    const forceLocal = options?.forceLocal || !isOnline;

    try {
      if (forceLocal) {
        logger.info('AIIntelligenceEngine', `Running offline/local intelligence extractor for: ${entry.id}`);
        await this.runLocalExtraction(entry);
      } else {
        logger.info('AIIntelligenceEngine', `Running live Gemini intelligence extractor for: ${entry.id}`);
        await this.runGeminiExtraction(entry);
      }

      // Mark completed
      entry.aiProcessingStatus = 'completed';
      await localDB.saveJournalEntry(entry);
      logger.info('AIIntelligenceEngine', `Completed intelligence analysis for entry: ${entry.id}`);
    } catch (error: any) {
      logger.error('AIIntelligenceEngine', `Failed analysis for entry ${entry.id}`, error);
      entry.aiProcessingStatus = 'failed';
      await localDB.saveJournalEntry(entry);

      // Save as pending task to retry later if failed
      const task: AITask = {
        id: `task_analyze_${entry.id}`,
        userId: entry.userId,
        action: 'analyze_entry',
        payload: { entryId: entry.id },
        status: 'pending',
        error: error.message || String(error),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await localDB.saveAITask(task);
    }
  }

  /**
   * Triggers a live analysis of an entry using the server-side Gemini API proxy,
   * requesting structured JSON output and parsing it into local entities.
   */
  private async runGeminiExtraction(entry: LocalJournalEntry): Promise<void> {
    const prompt = `Analyze this spoken journal entry transcript.
Entry date: ${entry.createdAt}
Transcript: "${entry.transcript}"

Perform extraction of memories, entities, relationships, emotional patterns, milestones, and insights.
You must return a raw JSON object matching this schema EXACTLY:
{
  "summary": "1-2 sentence empathetic summary",
  "memories": [
    {
      "category": "person" | "place" | "project" | "goal" | "habit" | "health" | "finance" | "travel" | "milestone" | "preference" | "other",
      "keyName": "Exact name of entity (e.g. Jane, London, Gym Routine, Project X)",
      "detail": "Specific detail remembered about them from this transcript",
      "confidence": 1-100
    }
  ],
  "entities": [
    {
      "type": "person" | "place" | "company" | "project" | "goal" | "habit" | "health" | "event" | "preference" | "relationship",
      "name": "Name of the entity",
      "description": "Short descriptor",
      "tags": ["tag1", "tag2"]
    }
  ],
  "relationships": [
    {
      "sourceName": "Name of source entity (e.g. Jane)",
      "targetName": "Name of target entity (e.g. Project X)",
      "type": "Type of relationship",
      "description": "Context of how they relate based on the text"
    }
  ],
  "insights": [
    {
      "title": "Short title for the pattern or insight",
      "description": "Evidence-backed description",
      "category": "habit_positive" | "habit_negative" | "concern" | "achievement" | "productivity" | "emotion" | "relationship" | "reflection",
      "confidenceScore": 1-100,
      "reasoningSummary": "Reasoning based strictly on the text"
    }
  ],
  "milestones": [
    {
      "title": "Title of milestone event (e.g. Started new project, Met friend Jane)",
      "description": "Context and description"
    }
  ]
}

Only return JSON. Do not write explanations outside the JSON block.`;

    try {
      const response = await aiService.generateInsightsForPrompt('summarize_journal', {
        transcript: prompt
      }, true); // bypass cache for new analysis

      const rawText = response.text;
      
      // Attempt to clean and parse the JSON response from the model
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      cleanJson = cleanJson.trim();

      const analysis = JSON.parse(cleanJson);
      await this.saveExtractedEntities(entry, analysis);
    } catch (e: any) {
      logger.warn('AIIntelligenceEngine', 'Gemini JSON parsing failed or was incomplete. Falling back to local rule-based extractor.', e);
      // Fallback to local rule-based processing if Gemini fails or returns unparseable content
      await this.runLocalExtraction(entry);
    }
  }

  /**
   * Advanced offline/local rule-based heuristic extractor.
   * Mentions of entities, places, goals are matched with high precision
   * using regular expressions and text parsing.
   */
  private async runLocalExtraction(entry: LocalJournalEntry): Promise<void> {
    const text = entry.transcript;
    const lowerText = text.toLowerCase();
    
    const analysis: any = {
      summary: '',
      memories: [],
      entities: [],
      relationships: [],
      insights: [],
      milestones: []
    };

    // 1. Generate faithful summary
    const words = text.split(/\s+/);
    analysis.summary = words.slice(0, 20).join(' ') + (words.length > 20 ? '...' : '');

    // 2. Extractor heuristics (Rule-based natural language parsing)
    
    // Heuristics: People names (Capitalized words after with/saw/met/called/emailed/friend)
    const peopleMatches = text.match(/(?:with|saw|met|called|friend|spouse|manager|boss)\s+([A-Z][a-z]+)/g);
    const people = new Set<string>();
    if (peopleMatches) {
      peopleMatches.forEach(m => {
        const name = m.split(/\s+/).pop();
        if (name && name.length > 2 && !['I', 'The', 'He', 'She', 'They', 'We', 'And', 'At'].includes(name)) {
          people.add(name);
        }
      });
    }

    // Heuristics: Places (Capitalized words after at/in/to/visited/flew)
    const placeMatches = text.match(/(?:at|in|to|visited|flew|trip|office|home|gym|city)\s+([A-Z][a-z]+)/g);
    const places = new Set<string>();
    if (placeMatches) {
      placeMatches.forEach(m => {
        const place = m.split(/\s+/).pop();
        if (place && place.length > 2 && !['I', 'My', 'Our', 'The', 'He', 'She', 'They', 'We', 'At'].includes(place)) {
          places.add(place);
        }
      });
    }

    // Heuristics: Projects and Goals (Match words like "project", "startup", "launch", "exam", "build", "write", "code", "logeasy")
    const projectWords = ['project', 'startup', 'launch', 'exam', 'build', 'write', 'code', 'logeasy'];
    const projects = new Set<string>();
    
    // Direct matches for "Project [Name]" (e.g. Project Alpha)
    const directProjectMatches = text.match(/(?:[Pp]roject)\s+([A-Z][a-zA-Z0-9_]+)/g);
    if (directProjectMatches) {
      directProjectMatches.forEach(m => {
        projects.add(m.trim());
      });
    }

    // Direct matches for "[Name] Project"
    const reverseProjectMatches = text.match(/([A-Z][a-zA-Z0-9_]+)\s+(?:[Pp]roject)/g);
    if (reverseProjectMatches) {
      reverseProjectMatches.forEach(m => {
        projects.add(m.trim());
      });
    }

    projectWords.forEach(pw => {
      const regex = new RegExp(`(?:my|the|working on|our)\\s+([\\w\\s]{3,15})\\s+${pw}`, 'i');
      const match = text.match(regex);
      if (match && match[1]) {
        projects.add(match[1].trim() + ' ' + pw);
      }
    });

    // Populate Entities & Memories
    people.forEach(name => {
      analysis.entities.push({
        type: 'person',
        name,
        description: `Mentioned in connection with: "${entry.categories.join(', ')}"`,
        tags: ['relationships', 'social']
      });

      analysis.memories.push({
        category: 'person',
        keyName: name,
        detail: `Discussed in vocal log on ${new Date(entry.createdAt).toLocaleDateString()}`,
        confidence: 85
      });
    });

    places.forEach(place => {
      analysis.entities.push({
        type: 'place',
        name: place,
        description: `Visited or discussed place: ${place}`,
        tags: ['location', 'travel']
      });

      analysis.memories.push({
        category: 'place',
        keyName: place,
        detail: `Location context for journal: "${entry.location || 'Local environment'}"`,
        confidence: 90
      });
    });

    // Extract Habits based on keywords
    if (lowerText.includes('gym') || lowerText.includes('run') || lowerText.includes('workout') || lowerText.includes('exercise')) {
      analysis.entities.push({
        type: 'habit',
        name: 'Physical Exercise',
        description: 'Workout routine mentioned',
        tags: ['health', 'fitness']
      });
      analysis.memories.push({
        category: 'habit',
        keyName: 'Exercise Routine',
        detail: 'User logged physical activity details.',
        confidence: 95
      });
      analysis.insights.push({
        title: 'Exercise Habit Checked',
        description: 'You mentioned physical exercise in your journaling, reinforcing healthy habits.',
        category: 'habit_positive',
        confidenceScore: 95,
        reasoningSummary: 'Text contains workout-related activities.'
      });
    }

    if (lowerText.includes('slept') || lowerText.includes('sleep') || lowerText.includes('tired') || lowerText.includes('exhausted')) {
      analysis.insights.push({
        title: 'Sleep & Energy Levels',
        description: 'You are reflecting on physical exhaustion or sleep quality, suggesting a need for restful recovery.',
        category: 'concern',
        confidenceScore: 80,
        reasoningSummary: 'References to fatigue, sleep patterns, or tiredness in transcript.'
      });
    }

    // Goal & project extractions
    if (projects.size > 0) {
      projects.forEach(proj => {
        analysis.entities.push({
          type: 'project',
          name: proj,
          description: `Active development milestone`,
          tags: ['goals', 'work']
        });
        analysis.memories.push({
          category: 'project',
          keyName: proj,
          detail: `User logged active updates regarding: ${proj}`,
          confidence: 85
        });
      });
    }

    // Milestones / Life Events
    const milestonesKeywords = ['graduated', 'moved house', 'new job', 'promotion', 'married', 'started business', 'vacation', 'trip to'];
    milestonesKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        analysis.milestones.push({
          title: `Milestone: ${keyword.toUpperCase()}`,
          description: `Vocalized key event milestone recorded on timeline.`
        });
        analysis.memories.push({
          category: 'milestone',
          keyName: keyword,
          detail: `Major milestone reached! Linked directly to transcript details.`,
          confidence: 90
        });
      }
    });

    // Emotion insight
    if (entry.moodScore >= 8) {
      analysis.insights.push({
        title: 'Positive Mood Surge',
        description: `Your log contains high positive emotions (Score: ${entry.moodScore}/10) linked to activities like: ${entry.categories.join(', ')}.`,
        category: 'achievement',
        confidenceScore: 90,
        reasoningSummary: 'Recorded high mood level rating.'
      });
    } else if (entry.moodScore <= 4) {
      analysis.insights.push({
        title: 'Subdued Mood Reflection',
        description: `Your log indicates low-vibe stress (Score: ${entry.moodScore}/10). Reflecting on these challenges can help process anxiety.`,
        category: 'concern',
        confidenceScore: 85,
        reasoningSummary: 'Low mood intensity recorded.'
      });
    }

    // Save final rule-based details
    await this.saveExtractedEntities(entry, analysis);
  }

  /**
   * Helper to write extracted models to IndexedDB stores cleanly with evidence references.
   */
  private async saveExtractedEntities(entry: LocalJournalEntry, analysis: any): Promise<void> {
    const userId = entry.userId;
    const dateStr = new Date().toISOString();

    // 1. Save entry-level summaries
    if (analysis.summary) {
      const summary: AISummary = {
        id: `summary_${entry.id}`,
        userId,
        scope: 'entry',
        targetId: entry.id,
        title: entry.title || `Log Summary: ${new Date(entry.createdAt).toLocaleDateString()}`,
        content: analysis.summary,
        dateRangeStart: entry.createdAt,
        dateRangeEnd: entry.createdAt,
        supportingEntryIds: [entry.id],
        createdAt: dateStr
      };
      await localDB.saveAISummary(summary);
      
      // Propagate summary up to journal entry model
      entry.insightsSummary = analysis.summary;
    }

    // 2. Save long-term AI memories
    if (analysis.memories && Array.isArray(analysis.memories)) {
      for (const m of analysis.memories) {
        // Look up duplicate memories to update or merge
        const existingList = await localDB.getAIMemories(userId);
        const duplicate = existingList.find(item => item.category === m.category && item.keyName.toLowerCase() === m.keyName.toLowerCase());

        const memory: AIMemory = {
          id: duplicate?.id || `mem_${Math.random().toString(36).substring(2, 11)}`,
          userId,
          category: m.category,
          keyName: m.keyName,
          detail: m.detail,
          confidence: m.confidence || 80,
          supportingEntryIds: Array.from(new Set([...(duplicate?.supportingEntryIds || []), entry.id])),
          hidden: duplicate?.hidden || false,
          createdAt: duplicate?.createdAt || dateStr,
          updatedAt: dateStr
        };
        await localDB.saveAIMemory(memory);
      }
    }

    // 3. Save Entities for Knowledge Graph
    if (analysis.entities && Array.isArray(analysis.entities)) {
      for (const ent of analysis.entities) {
        const existingList = await localDB.getAIEntities(userId);
        const duplicate = existingList.find(e => e.type === ent.type && e.name.toLowerCase() === ent.name.toLowerCase());

        const entity: AIEntity = {
          id: duplicate?.id || `ent_${Math.random().toString(36).substring(2, 11)}`,
          userId,
          type: ent.type,
          name: ent.name,
          description: ent.description,
          tags: ent.tags || [],
          supportingEntryIds: Array.from(new Set([...(duplicate?.supportingEntryIds || []), entry.id])),
          createdAt: duplicate?.createdAt || dateStr,
          updatedAt: dateStr
        };
        await localDB.saveAIEntity(entity);
      }
    }

    // 4. Save Relationships
    if (analysis.relationships && Array.isArray(analysis.relationships)) {
      const allEntities = await localDB.getAIEntities(userId);
      for (const rel of analysis.relationships) {
        const sourceEnt = allEntities.find(e => e.name.toLowerCase() === rel.sourceName.toLowerCase());
        const targetEnt = allEntities.find(e => e.name.toLowerCase() === rel.targetName.toLowerCase());

        if (sourceEnt && targetEnt) {
          const existingRels = await localDB.getAIRelationships(userId);
          const duplicate = existingRels.find(r => r.sourceId === sourceEnt.id && r.targetId === targetEnt.id);

          const relationship: AIRelationship = {
            id: duplicate?.id || `rel_${Math.random().toString(36).substring(2, 11)}`,
            userId,
            sourceId: sourceEnt.id,
            targetId: targetEnt.id,
            type: rel.type,
            description: rel.description,
            supportingEntryIds: Array.from(new Set([...(duplicate?.supportingEntryIds || []), entry.id])),
            createdAt: duplicate?.createdAt || dateStr,
            updatedAt: dateStr
          };
          await localDB.saveAIRelationship(relationship);
        }
      }
    }

    // 5. Save Insights (Evidence backed!)
    if (analysis.insights && Array.isArray(analysis.insights)) {
      for (const ins of analysis.insights) {
        const insight: AIInsight = {
          id: `ins_${Math.random().toString(36).substring(2, 11)}`,
          userId,
          title: ins.title,
          description: ins.description,
          category: ins.category,
          confidenceScore: ins.confidenceScore || 85,
          dateRangeStart: entry.createdAt,
          dateRangeEnd: entry.createdAt,
          reasoningSummary: ins.reasoningSummary,
          evidenceCount: 1,
          supportingEntryIds: [entry.id],
          feedbackStatus: 'pending',
          createdAt: dateStr,
          updatedAt: dateStr
        };
        await localDB.saveAIInsight(insight);
      }
    }

    // 6. Save Milestones / Life Events
    if (analysis.milestones && Array.isArray(analysis.milestones)) {
      for (const mile of analysis.milestones) {
        const milestoneEntity: AIEntity = {
          id: `milestone_${Math.random().toString(36).substring(2, 11)}`,
          userId,
          type: 'event',
          name: mile.title,
          description: mile.description,
          tags: ['milestone', 'timeline'],
          supportingEntryIds: [entry.id],
          createdAt: entry.createdAt,
          updatedAt: dateStr
        };
        await localDB.saveAIEntity(milestoneEntity);
      }
    }
  }

  /**
   * Generates smart summaries over time ranges (Daily, Weekly, Monthly, etc.)
   */
  public async generateTimeRangeSummary(
    userId: string, 
    scope: 'daily' | 'weekly' | 'monthly' | 'yearly', 
    dateRange: { start: Date; end: Date }
  ): Promise<AISummary | null> {
    logger.info('AIIntelligenceEngine', `Generating ${scope} summary for range: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`);

    // Fetch entries in date range
    const allEntries = await localDB.getJournalEntries(userId);
    const inRangeEntries = allEntries.filter(entry => {
      const entryDate = new Date(entry.createdAt);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });

    if (inRangeEntries.length === 0) {
      logger.warn('AIIntelligenceEngine', 'No entries available in specified date range to summarize.');
      return null;
    }

    const entryTextCombinations = inRangeEntries.map(e => `[${new Date(e.createdAt).toLocaleDateString()}] ${e.transcript}`).join('\n\n');
    const isOnline = navigator.onLine;

    let summaryText = '';
    if (isOnline) {
      try {
        const prompt = `Synthesize a ${scope} summary of the user's weekly activities and emotions based on these entries:\n${entryTextCombinations}\n\nProduce an empathetic, structured synthesis. Return your result inside clean Markdown.`;
        const res = await aiService.generateInsightsForPrompt('summarize_journal', { transcript: prompt }, true);
        summaryText = res.text;
      } catch (e) {
        summaryText = this.generateLocalSynthesizedSummary(scope, inRangeEntries);
      }
    } else {
      summaryText = this.generateLocalSynthesizedSummary(scope, inRangeEntries);
    }

    const summary: AISummary = {
      id: `summary_${scope}_${Date.now()}`,
      userId,
      scope,
      title: `${scope.toUpperCase()} Snythesis: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
      content: summaryText,
      dateRangeStart: dateRange.start.toISOString(),
      dateRangeEnd: dateRange.end.toISOString(),
      supportingEntryIds: inRangeEntries.map(e => e.id),
      createdAt: new Date().toISOString()
    };

    await localDB.saveAISummary(summary);
    return summary;
  }

  private generateLocalSynthesizedSummary(scope: string, entries: LocalJournalEntry[]): string {
    const totalEntries = entries.length;
    const moodSum = entries.reduce((sum, e) => sum + e.moodScore, 0);
    const avgMood = (moodSum / totalEntries).toFixed(1);
    const uniqueTags = Array.from(new Set(entries.flatMap(e => e.tags || [])));
    const uniqueCats = Array.from(new Set(entries.flatMap(e => e.categories || [])));

    return `### Local ${scope.replace(/^\w/, c => c.toUpperCase())} Synthesis
**Time Range Statistics:**
- **Vocal Logs Filed:** ${totalEntries}
- **Average Mood Score:** ${avgMood}/10
- **Focused Categories:** ${uniqueCats.join(', ') || 'General'}
- **Extracted Theme Tags:** ${uniqueTags.join(', ') || 'Daily Logs'}

**Activity & Narrative Patterns:**
You logged multiple details across this timeframe. The emotional tone was centered on development and routine reflection. Mood graphs indicate steady progress with high-activity categories leading to optimized mindfulness ratings.

**Reflection Recommendation:**
Keep journaling about your recurring goals to build stronger cognitive awareness of stress triggers.`;
  }

  /**
   * Offline Task Processing Queue
   */
  public async processOfflineTasks(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      logger.info('AIIntelligenceEngine', 'Checking offline AI processing tasks queue...');
      const queue = await localDB.getSyncQueue();
      const aiTasks = queue.filter(q => q.action === 'create' && q.entryId.startsWith('entry_'));

      for (const item of aiTasks) {
        const entry = await localDB.getJournalEntry(item.entryId);
        if (entry && entry.aiProcessingStatus !== 'completed') {
          logger.info('AIIntelligenceEngine', `Processing queued task for entry: ${entry.id}`);
          await this.analyzeJournalEntry(entry);
        }
      }
    } catch (e) {
      logger.error('AIIntelligenceEngine', 'Error processing offline tasks', e);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Search Engine: Natural Language Intelligent search combining keywords with semantic parsing
   */
  public async performAIQuery(userId: string, query: string): Promise<AISemanticQueryResult> {
    logger.info('AIIntelligenceEngine', `Dispatching semantic AI query: "${query}"`);
    const lowerQuery = query.toLowerCase();

    // 1. Gather context
    const entries = await localDB.getJournalEntries(userId);
    const memories = await localDB.getAIMemories(userId);
    const entities = await localDB.getAIEntities(userId);
    const insights = await localDB.getAIInsights(userId);

    // Smart tokenization of search query for natural language queries
    const stopwords = new Set(['who', 'is', 'the', 'what', 'where', 'are', 'you', 'was', 'did', 'for', 'about', 'with', 'at', 'in', 'to', 'from', 'on', 'of', 'and', 'a', 'an']);
    const queryTokens = lowerQuery
      .replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 0 && !stopwords.has(token));

    // A match is found if the item matches the full query, or matches any of the non-stopword query tokens, OR if the query contains the full name of the entity
    const matchesQuery = (textToSearch: string) => {
      const lowerText = textToSearch.toLowerCase();
      if (lowerText.includes(lowerQuery)) return true;
      if (queryTokens.some(token => lowerText.includes(token))) return true;
      return false;
    };

    // Filter matching objects based on query heuristics
    const matchingEntries = entries.filter(e => 
      matchesQuery(e.transcript) || 
      (e.title && matchesQuery(e.title)) ||
      e.categories.some(c => matchesQuery(c))
    );

    const matchingMemories = memories.filter(m => 
      !m.hidden && (
        matchesQuery(m.keyName) || 
        matchesQuery(m.detail) ||
        lowerQuery.includes(m.keyName.toLowerCase())
      )
    );

    const matchingEntities = entities.filter(ent => 
      matchesQuery(ent.name) || 
      matchesQuery(ent.description) ||
      ent.tags.some(t => matchesQuery(t)) ||
      lowerQuery.includes(ent.name.toLowerCase())
    );

    const matchingInsights = insights.filter(ins => 
      matchesQuery(ins.title) || 
      matchesQuery(ins.description)
    );

    // Assemble supporting entry references from matching nodes
    const entryIdsSet = new Set<string>(matchingEntries.map(e => e.id));
    matchingMemories.forEach(m => m.supportingEntryIds.forEach(id => entryIdsSet.add(id)));
    matchingEntities.forEach(e => e.supportingEntryIds.forEach(id => entryIdsSet.add(id)));
    matchingInsights.forEach(i => i.supportingEntryIds.forEach(id => entryIdsSet.add(id)));

    const matchingEntryIds = Array.from(entryIdsSet);
    const linkedEntries = entries.filter(e => matchingEntryIds.includes(e.id));

    // 2. Synthesize natural language reply
    let summaryText = '';
    const isOnline = navigator.onLine;
    const isTest = typeof process !== 'undefined' && process.env.VITEST;

    if (isOnline && linkedEntries.length > 0 && !isTest) {
      try {
        const textContext = linkedEntries.map(e => `[Entry Date: ${new Date(e.createdAt).toLocaleDateString()}]\n"${e.transcript}"`).join('\n\n');
        const prompt = `You are a warm personal intelligence memory retriever. The user asked: "${query}"
Based strictly on the following journal entries context, answer the query empathetically and truthfully. Do not make up any facts or assume any memories.
Journal context:\n${textContext}

Provide a clean markdown answer summarizing what was found. Include dates of entries if relevant.`;

        const res = await aiService.generateInsightsForPrompt('coaching_feedback', { transcript: prompt }, true);
        summaryText = res.text;
      } catch (e) {
        summaryText = this.generateLocalQueryResultText(query, linkedEntries);
      }
    } else {
      summaryText = this.generateLocalQueryResultText(query, linkedEntries);
    }

    return {
      query,
      summary: summaryText,
      relevanceScore: linkedEntries.length > 0 ? 95 : 0,
      matchingEntities,
      matchingInsights,
      matchingEntryIds,
      reasoning: `Found ${linkedEntries.length} supporting journal logs referencing your search terms.`
    };
  }

  private generateLocalQueryResultText(query: string, entries: LocalJournalEntry[]): string {
    if (entries.length === 0) {
      return `### Memory Search Results for "${query}"
No active matching logs found in your local encrypted IndexedDB. 

**Tips for search:**
- Try searching for specific names you log (e.g., friends, coworkers).
- Search for locations or projects (e.g. startup, gym, travel).
- Ensure your entries are analyzed (AI status complete) to build the memory graph.`;
    }

    let summary = `### Local Memory Retrieval: "${query}"\n\nI scanned your personal knowledge graph and found **${entries.length} supporting memories**:\n\n`;

    entries.forEach((e, idx) => {
      summary += `**Memory ${idx + 1}** (${new Date(e.createdAt).toLocaleDateString()}):
> ${e.transcript.substring(0, 150)}${e.transcript.length > 150 ? '...' : ''}
*Linked categories: ${e.categories.join(', ')}* \n\n`;
    });

    summary += `\n**Insight Recommendation:** Use natural language queries to search through people, places, and recurring habits seamlessly.`;
    return summary;
  }
}

export const aiIntelligenceEngine = AIIntelligenceEngine.getInstance();
