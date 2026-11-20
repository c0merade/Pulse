/**
 * Pulse × Picsart Academy — Pure Domain Invariants (DDD Core)
 *
 * These rules are infrastructure-free and must hold across every API route,
 * background cron job, and UI workflow.
 */

export const DOMAIN_RULES = {
  DROP_MEDIUM_THRESHOLD: -0.4,
  DROP_HIGH_THRESHOLD: -0.7,
  MIN_RELIABLE_RESPONSES: 5,
  MIN_RELIABLE_TURNOUT_PCT: 50,
} as const;

export type WaveStatus = "SCHEDULED" | "ACTIVE" | "CLOSED";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED";

/**
 * Invariant 3: Smart Reminder Stop
 * Reminders are sent ONLY when the wave is ACTIVE, overall turnout is still
 * below the target response rate, and the specific student has not yet responded.
 */
export function canSendReminder(params: {
  waveStatus: WaveStatus;
  turnoutPct: number;
  targetResponseRate: number;
  studentRespondedAt: Date | null;
}): { allowed: boolean; reason?: string } {
  if (params.waveStatus !== "ACTIVE") {
    return { allowed: false, reason: "Wave is not active" };
  }
  if (params.turnoutPct >= params.targetResponseRate) {
    return {
      allowed: false,
      reason: `Target response rate (${params.targetResponseRate}%) already met`,
    };
  }
  if (params.studentRespondedAt !== null) {
    return { allowed: false, reason: "Student already responded" };
  }
  return { allowed: true };
}

/**
 * Invariant 5: Fair Comparison
 * A group/lecturer score is considered reliable ONLY when at least 5 students
 * responded AND turnout is at least 50%.
 */
export function evaluateFairness(
  responseCount: number,
  turnoutPct: number
): { reliable: boolean; reason?: string } {
  if (responseCount < DOMAIN_RULES.MIN_RELIABLE_RESPONSES) {
    return {
      reliable: false,
      reason: `Only ${responseCount} responses (min ${DOMAIN_RULES.MIN_RELIABLE_RESPONSES} required)`,
    };
  }
  if (turnoutPct < DOMAIN_RULES.MIN_RELIABLE_TURNOUT_PCT) {
    return {
      reliable: false,
      reason: `${turnoutPct}% turnout (min ${DOMAIN_RULES.MIN_RELIABLE_TURNOUT_PCT}% required)`,
    };
  }
  return { reliable: true };
}

/**
 * Invariant 6: Closed-Loop Verification
 * An issue can only be marked VERIFIED by a follow-up survey wave, never by the
 * same wave that originated the complaint.
 */
export function canVerifyIssue(params: {
  sourceSurveyId: string | null;
  verifyingSurveyId: string | null;
}): { allowed: boolean; reason?: string } {
  if (
    params.sourceSurveyId &&
    params.verifyingSurveyId &&
    params.sourceSurveyId === params.verifyingSurveyId
  ) {
    return {
      allowed: false,
      reason:
        "An issue cannot be verified by the same survey wave that created it; wait for the next wave.",
    };
  }
  return { allowed: true };
}
