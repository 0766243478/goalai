import { GoogleGenAI } from '@google/genai';

const apiKey =
  process.env.AI_INTEGRATIONS_GEMINI_API_KEY ||
  process.env.GOOGLE_GEMINI_API_KEY;
const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

const ai = apiKey
  ? baseUrl
    ? new GoogleGenAI({
        apiKey,
        httpOptions: { apiVersion: '', baseUrl },
      })
    : new GoogleGenAI({ apiKey })
  : null;

interface GeneratedTask {
  type: 'EXECUTE' | 'VALUE' | 'RESET';
  title: string;
  duration: number;
  hook: string;
}

interface GenerationResult {
  header: string;
  tasks: GeneratedTask[];
}

export async function generateTasks(
  northStar: string,
  valueSkill: string,
  frictionTrigger: string,
  dailyWindowMinutes: number,
  itsValue: number,
  loadMultiplier: number,
  yesterdayResult: string
): Promise<GenerationResult> {
  const frictionMap: Record<string, string> = {
    OVERTHINKING: 'Overthinking',
    ENERGY_CRASH: 'Energy Crash',
    DISTRACTION: 'Distraction',
  };

  const prompt = `Role: You are the "Silent Optimizer," a high-performance decision-elimination engine.
Objective: Generate exactly 3 daily tasks for a user based on their data.

User Constraints:
- North Star: ${northStar}
- Value Skill: ${valueSkill}
- Friction Trigger: ${frictionMap[frictionTrigger] || frictionTrigger}
- Daily Window: ${dailyWindowMinutes} minutes

Current Engine State:
- Internal Trust Score (ITS): ${itsValue.toFixed(2)} (0.0 to 1.0)
- Load Multiplier: ${loadMultiplier.toFixed(2)} (0.5 to 1.1)
- Yesterday's Result: ${yesterdayResult}

Task Generation Rules:
1. The Execute Card: Must advance the North Star. If Load Multiplier is < 1.0, decompose the task into a "Micro-Step" (e.g., "Draft" instead of "Build").
2. The Value Card: Must protect or generate income using the Value Skill.
3. The Reset Card: Must mitigate the "Friction Trigger." Low cognitive load, high relief.
4. Time Math: The total duration of all 3 tasks MUST NOT exceed ${Math.floor(dailyWindowMinutes * loadMultiplier)} minutes.

Tone & Voice:
- Use "Neutral Authority." No exclamation points. No motivational fluff.
- Verbs must be decisive: "Draft," "Send," "Clear," "Audit."
- Each task must have a "Relief Hook" - a 1-sentence explanation of why this task clears the path.

Output Format (JSON only, no markdown):
{
  "header": "${loadMultiplier < 1.0 ? 'Load adjusted.' : 'Path is clear.'}",
  "tasks": [
    { "type": "EXECUTE", "title": "...", "duration": 15, "hook": "..." },
    { "type": "VALUE", "title": "...", "duration": 10, "hook": "..." },
    { "type": "RESET", "title": "...", "duration": 5, "hook": "..." }
  ]
}`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: { maxOutputTokens: 1024, temperature: 0.7 },
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.tasks && parsed.tasks.length >= 3) {
          return {
            header: parsed.header || (loadMultiplier < 1.0 ? 'Load adjusted.' : 'Path is clear.'),
            tasks: parsed.tasks.slice(0, 3).map((t: GeneratedTask) => ({
              type: t.type || 'EXECUTE',
              title: t.title || '',
              duration: t.duration || 15,
              hook: t.hook || '',
            })),
          };
        }
      }
    } catch {
      return getFallbackTasks(northStar, valueSkill, frictionTrigger, dailyWindowMinutes, loadMultiplier);
    }
  }

  return getFallbackTasks(northStar, valueSkill, frictionTrigger, dailyWindowMinutes, loadMultiplier);
}

function getFallbackTasks(
  northStar: string,
  valueSkill: string,
  frictionTrigger: string,
  dailyWindowMinutes: number,
  loadMultiplier: number
): GenerationResult {
  const totalMinutes = Math.floor(dailyWindowMinutes * loadMultiplier);
  const executeDuration = Math.floor(totalMinutes * 0.5);
  const valueDuration = Math.floor(totalMinutes * 0.3);
  const resetDuration = Math.floor(totalMinutes * 0.2);

  const isReduced = loadMultiplier < 1.0;

  const resetTasks: Record<string, { title: string; hook: string }> = {
    OVERTHINKING: {
      title: 'Clear your workspace of open loops',
      hook: 'Fewer open items means fewer background processes draining your focus.',
    },
    ENERGY_CRASH: {
      title: 'Set a timer and take a structured break',
      hook: 'Scheduled rest prevents unscheduled collapse.',
    },
    DISTRACTION: {
      title: 'Close all non-essential tabs and notifications',
      hook: 'Every closed tab is one fewer decision pulling at your attention.',
    },
  };

  const resetTask = resetTasks[frictionTrigger] || resetTasks.OVERTHINKING;

  return {
    header: isReduced ? 'Load adjusted.' : 'Path is clear.',
    tasks: [
      {
        type: 'EXECUTE',
        title: isReduced
          ? `Draft the next micro-step toward: ${northStar}`
          : `Advance your objective: ${northStar}`,
        duration: executeDuration,
        hook: 'This moves the needle on what matters most.',
      },
      {
        type: 'VALUE',
        title: `Apply ${valueSkill} to protect or generate income`,
        duration: valueDuration,
        hook: 'Consistent skill application compounds over time.',
      },
      {
        type: 'RESET',
        title: resetTask.title,
        duration: resetDuration,
        hook: resetTask.hook,
      },
    ],
  };
}
