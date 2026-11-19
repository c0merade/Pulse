import { GoogleGenAI, Type } from "@google/genai";
import { DropFlag, ScoreAverages, ThemeCluster } from "./analytics";

export interface AnalysisResult {
  overallSummary: string;
  themes: ThemeCluster[];
  source: "GEMINI" | "FALLBACK";
}

interface CommentInput {
  comment: string;
  lecturesScore: number;
  practiceScore: number;
  materialsScore: number;
  organizationScore: number;
}

export async function analyzeSurveyComments(params: {
  surveyTitle: string;
  groupName: string;
  courseName: string;
  averages: ScoreAverages;
  drops: DropFlag[];
  responses: CommentInput[];
  useFallbackOnly?: boolean;
}): Promise<AnalysisResult> {
  const commentsWithText = params.responses.filter(
    (r) => r.comment && r.comment.trim().length > 0
  );

  if (commentsWithText.length === 0) {
    return {
      overallSummary: `Collected ${params.responses.length} numeric responses (overall ${params.averages.overall.toFixed(1)}/5) with no written comments yet.`,
      themes: [],
      source: "FALLBACK",
    };
  }

  const apiKey = params.useFallbackOnly ? "" : process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    const candidates = Array.from(
      new Set(
        [
          process.env.GEMINI_MODEL?.trim(),
          "gemini-3.8-flash",
          "gemini-3.8-flash-lite",
        ].filter(Boolean) as string[]
      )
    );
    for (const modelName of candidates) {
      try {
        return await runGeminiAnalysis(apiKey, modelName, params, commentsWithText);
      } catch (err) {
        console.error(`[Pulse AI] Gemini (${modelName}) failed:`, err);
      }
    }
    console.warn("[Pulse AI] All Gemini models unavailable, falling back to heuristic analyzer.");
  }

  return runFallbackAnalysis(params, commentsWithText);
}

async function runGeminiAnalysis(
  apiKey: string,
  modelName: string,
  params: {
    surveyTitle: string;
    groupName: string;
    courseName: string;
    averages: ScoreAverages;
    drops: DropFlag[];
  },
  commentsWithText: CommentInput[]
): Promise<AnalysisResult> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = [
    `You are Pulse, an Academy quality-assurance analyst.`,
    `Analyze student survey responses for "${params.surveyTitle}" (Group: ${params.groupName}, Course: ${params.courseName}).`,
    `Average scores (1-5): Lectures ${params.averages.lectures}, Practice ${params.averages.practice}, Materials ${params.averages.materials}, Organization ${params.averages.organization} (Overall ${params.averages.overall}).`,
    params.drops.length > 0
      ? `Flagged score drops vs previous wave: ${params.drops.map((d) => `${d.label} (${d.delta})`).join(", ")}.`
      : `No major score drops vs previous wave.`,
    `Student comments (${commentsWithText.length} total):`,
    ...commentsWithText.map(
      (r, idx) =>
        `${idx + 1}. [L:${r.lecturesScore} P:${r.practiceScore} M:${r.materialsScore} O:${r.organizationScore}] "${r.comment.trim()}"`
    ),
    ``,
    `Group the comments into 2-6 clear, actionable themes with accurate mention counts, category (LECTURES, PRACTICE, MATERIALS, or ORGANIZATION), sentiment (POSITIVE, NEUTRAL, NEGATIVE), severity (LOW, MEDIUM, HIGH), a 1-sentence summary, and 1-3 short verbatim quotes.`,
    `Also write a concise 2-3 sentence overallSummary suitable for the Edu Lead, Admin Lead, and Director.`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallSummary: { type: Type.STRING },
          themes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                theme: { type: Type.STRING },
                category: {
                  type: Type.STRING,
                  enum: ["LECTURES", "PRACTICE", "MATERIALS", "ORGANIZATION"],
                },
                count: { type: Type.INTEGER },
                sentiment: {
                  type: Type.STRING,
                  enum: ["POSITIVE", "NEUTRAL", "NEGATIVE"],
                },
                severity: {
                  type: Type.STRING,
                  enum: ["LOW", "MEDIUM", "HIGH"],
                },
                summary: { type: Type.STRING },
                quotes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                "theme",
                "category",
                "count",
                "sentiment",
                "severity",
                "summary",
                "quotes",
              ],
            },
          },
        },
        required: ["overallSummary", "themes"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty Gemini response");
  }

  const parsed = JSON.parse(text) as {
    overallSummary: string;
    themes: ThemeCluster[];
  };

  return {
    overallSummary: parsed.overallSummary,
    themes: parsed.themes.sort((a, b) => b.count - a.count),
    source: "GEMINI",
  };
}

interface RuleDef {
  theme: string;
  category: "LECTURES" | "PRACTICE" | "MATERIALS" | "ORGANIZATION";
  keywords: RegExp;
  negativeHints: RegExp;
  positiveHints: RegExp;
  negSummary: string;
  posSummary: string;
}

const THEME_RULES: RuleDef[] = [
  {
    theme: "Practice Pacing & Hands-on Time",
    category: "PRACTICE",
    keywords: /\b(practice|lab|exercise|exercises|coding|workshop|hands-on|task|tasks|homework|debugging|mentor)\b/i,
    negativeHints: /\b(rush|rushed|too fast|not enough|hard|difficult|stuck|little time|confused|need more|overwhelm|skip|missing)\b/i,
    positiveHints: /\b(great|love|loved|helpful|awesome|good|clear|engaging|enjoy|better|improved|solid)\b/i,
    negSummary: "Students report that practice sessions feel rushed or need more guided walkthrough time and mentor feedback.",
    posSummary: "Students appreciate the hands-on practice tasks and find the coding exercises engaging and practical.",
  },
  {
    theme: "Course Materials & Documentation",
    category: "MATERIALS",
    keywords: /\b(slide|slides|material|materials|doc|docs|pdf|recording|recordings|video|notes|repo|github|resource|resources|cheatsheet)\b/i,
    negativeHints: /\b(outdated|late|broken|missing|hard to find|confusing|old|typo|unorganized|delay|delayed|upload)\b/i,
    positiveHints: /\b(great|well-structured|clear|helpful|updated|clean|nice|useful|timely|good)\b/i,
    negSummary: "Materials, slides, or recordings are reported as outdated, uploaded late, or hard to navigate.",
    posSummary: "Students find the slides, recordings, and reference materials well-organized and helpful for review.",
  },
  {
    theme: "Lecture Clarity & Delivery",
    category: "LECTURES",
    keywords: /\b(lecture|lectures|lecturer|explain|explains|explanation|theory|pace|pacing|concept|concepts|class|classes|topic)\b/i,
    negativeHints: /\b(fast|rushed|boring|unclear|confusing|dry|too much|skip|hard to follow|monotone|lost)\b/i,
    positiveHints: /\b(clear|engaging|great|excellent|awesome|structured|easy to follow|love|insightful|patient|good)\b/i,
    negSummary: "Some students struggle with lecture pacing or want clearer step-by-step explanations of complex concepts.",
    posSummary: "Lectures are praised for clear explanations, strong structure, and engaging real-world examples.",
  },
  {
    theme: "Schedule, Communication & Logistics",
    category: "ORGANIZATION",
    keywords: /\b(schedule|room|zoom|link|slack|calendar|admin|communication|deadline|deadlines|reschedule|late|wifi|audio|mic|organization)\b/i,
    negativeHints: /\b(last minute|confusing|broken|late|noisy|bad|issue|problem|unclear|chaos|changed|delay|missing)\b/i,
    positiveHints: /\b(smooth|clear|timely|organized|great|responsive|good|reliable)\b/i,
    negSummary: "Students flagged friction around scheduling updates, communication timing, or room/call logistics.",
    posSummary: "Course scheduling, communication channels, and logistics are running smoothly.",
  },
];

function runFallbackAnalysis(
  params: {
    surveyTitle: string;
    groupName: string;
    averages: ScoreAverages;
    drops: DropFlag[];
  },
  commentsWithText: CommentInput[]
): AnalysisResult {
  const buckets = new Map<
    string,
    {
      rule: RuleDef;
      matches: CommentInput[];
      negCount: number;
      posCount: number;
    }
  >();

  const unmatched: CommentInput[] = [];

  for (const item of commentsWithText) {
    let matchedAny = false;
    for (const rule of THEME_RULES) {
      if (rule.keywords.test(item.comment)) {
        matchedAny = true;
        const existing = buckets.get(rule.theme) ?? {
          rule,
          matches: [],
          negCount: 0,
          posCount: 0,
        };
        existing.matches.push(item);

        const dimScore =
          rule.category === "LECTURES"
            ? item.lecturesScore
            : rule.category === "PRACTICE"
              ? item.practiceScore
              : rule.category === "MATERIALS"
                ? item.materialsScore
                : item.organizationScore;

        if (rule.negativeHints.test(item.comment) || dimScore <= 3) {
          existing.negCount++;
        } else if (rule.positiveHints.test(item.comment) || dimScore >= 4) {
          existing.posCount++;
        }
        buckets.set(rule.theme, existing);
      }
    }
    if (!matchedAny) {
      unmatched.push(item);
    }
  }

  const themes: ThemeCluster[] = [];

  for (const [, bucket] of buckets) {
    const total = bucket.matches.length;
    const isNeg = bucket.negCount >= bucket.posCount && bucket.negCount > 0;
    const sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = isNeg
      ? "NEGATIVE"
      : bucket.posCount > 0
        ? "POSITIVE"
        : "NEUTRAL";

    const severity: "LOW" | "MEDIUM" | "HIGH" =
      sentiment !== "NEGATIVE"
        ? "LOW"
        : total >= 4 || bucket.negCount >= 3
          ? "HIGH"
          : "MEDIUM";

    themes.push({
      theme: bucket.rule.theme,
      category: bucket.rule.category,
      count: total,
      sentiment,
      severity,
      summary: isNeg ? bucket.rule.negSummary : bucket.rule.posSummary,
      quotes: bucket.matches.slice(0, 3).map((m) => m.comment.trim()),
    });
  }

  if (unmatched.length > 0) {
    const avgOverall =
      unmatched.reduce(
        (acc, r) =>
          acc +
          (r.lecturesScore + r.practiceScore + r.materialsScore + r.organizationScore) /
            4,
        0
      ) / unmatched.length;
    themes.push({
      theme: "General Course Sentiment",
      category: "ORGANIZATION",
      count: unmatched.length,
      sentiment: avgOverall >= 3.8 ? "POSITIVE" : avgOverall <= 3.0 ? "NEGATIVE" : "NEUTRAL",
      severity: avgOverall <= 3.0 ? "MEDIUM" : "LOW",
      summary:
        avgOverall >= 3.8
          ? "General student feedback is upbeat and satisfied with overall course progression."
          : "Mixed general comments pointing to minor areas for improvement.",
      quotes: unmatched.slice(0, 2).map((m) => m.comment.trim()),
    });
  }

  themes.sort((a, b) => {
    const sevRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    if (sevRank[b.severity] !== sevRank[a.severity]) {
      return sevRank[b.severity] - sevRank[a.severity];
    }
    return b.count - a.count;
  });

  const negativeThemes = themes.filter((t) => t.sentiment === "NEGATIVE");
  const dropNote =
    params.drops.length > 0
      ? ` Attention needed: ${params.drops
          .map((d) => `${d.label} dropped by ${Math.abs(d.delta).toFixed(1)} pts`)
          .join(" and ")} compared to the previous wave.`
      : " Scores are stable or improving relative to the previous wave.";

  const themeNote =
    negativeThemes.length > 0
      ? ` Top concern${negativeThemes.length > 1 ? "s" : ""}: ${negativeThemes
          .slice(0, 2)
          .map((t) => `${t.theme} (${t.count} mentions)`)
          .join(", ")}.`
      : ` Feedback is broadly positive across ${themes.length} extracted themes.`;

  const overallSummary = `${params.groupName} scored ${params.averages.overall.toFixed(
    1
  )}/5 across ${params.averages.count} responses.${dropNote}${themeNote}`;

  return {
    overallSummary,
    themes,
    source: "FALLBACK",
  };
}
