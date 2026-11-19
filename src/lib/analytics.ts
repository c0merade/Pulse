export type DimensionKey = "lectures" | "practice" | "materials" | "organization";

export interface ScoreAverages {
  lectures: number;
  practice: number;
  materials: number;
  organization: number;
  overall: number;
  count: number;
}

export interface DropFlag {
  dimension: DimensionKey;
  label: string;
  previousScore: number;
  currentScore: number;
  delta: number;
  severity: "MEDIUM" | "HIGH";
}

export interface ThemeCluster {
  theme: string;
  category: "LECTURES" | "PRACTICE" | "MATERIALS" | "ORGANIZATION";
  count: number;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  severity: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  quotes: string[];
}

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  lectures: "Lectures",
  practice: "Practice Sessions",
  materials: "Materials",
  organization: "Organization",
};

export const DROP_THRESHOLD = -0.4;

export function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function computeAverages(
  responses: Array<{
    lecturesScore: number;
    practiceScore: number;
    materialsScore: number;
    organizationScore: number;
  }>
): ScoreAverages {
  const count = responses.length;
  if (count === 0) {
    return {
      lectures: 0,
      practice: 0,
      materials: 0,
      organization: 0,
      overall: 0,
      count: 0,
    };
  }

  let l = 0;
  let p = 0;
  let m = 0;
  let o = 0;
  for (const r of responses) {
    l += r.lecturesScore;
    p += r.practiceScore;
    m += r.materialsScore;
    o += r.organizationScore;
  }

  const lectures = round2(l / count);
  const practice = round2(p / count);
  const materials = round2(m / count);
  const organization = round2(o / count);
  const overall = round2((lectures + practice + materials + organization) / 4);

  return { lectures, practice, materials, organization, overall, count };
}

export function computeDeltas(
  current: ScoreAverages,
  previous: ScoreAverages | null
): Record<DimensionKey | "overall", number | null> {
  if (!previous || previous.count === 0 || current.count === 0) {
    return {
      lectures: null,
      practice: null,
      materials: null,
      organization: null,
      overall: null,
    };
  }

  return {
    lectures: round2(current.lectures - previous.lectures),
    practice: round2(current.practice - previous.practice),
    materials: round2(current.materials - previous.materials),
    organization: round2(current.organization - previous.organization),
    overall: round2(current.overall - previous.overall),
  };
}

export function detectDrops(
  current: ScoreAverages,
  previous: ScoreAverages | null
): DropFlag[] {
  if (!previous || previous.count === 0 || current.count === 0) {
    return [];
  }

  const dims: DimensionKey[] = ["lectures", "practice", "materials", "organization"];
  const flags: DropFlag[] = [];

  for (const dim of dims) {
    const delta = round2(current[dim] - previous[dim]);
    if (delta <= DROP_THRESHOLD) {
      flags.push({
        dimension: dim,
        label: DIMENSION_LABELS[dim],
        previousScore: previous[dim],
        currentScore: current[dim],
        delta,
        severity: delta <= -0.7 ? "HIGH" : "MEDIUM",
      });
    }
  }

  return flags;
}

export function getFairnessStatus(sampleSize: number, responseRate: number): {
  reliable: boolean;
  label: string;
  reason?: string;
} {
  if (sampleSize < 5) {
    return {
      reliable: false,
      label: "Low sample",
      reason: `Only ${sampleSize} responses (min 5 recommended for fair comparison)`,
    };
  }
  if (responseRate < 50) {
    return {
      reliable: false,
      label: "Low turnout",
      reason: `${responseRate}% response rate (min 50% recommended)`,
    };
  }
  return {
    reliable: true,
    label: "Reliable sample",
  };
}
