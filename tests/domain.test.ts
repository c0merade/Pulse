import { describe, it, expect } from "vitest";
import {
  canSendReminder,
  canVerifyIssue,
  evaluateFairness,
} from "@/domain/invariants";

describe("Pulse DDD Domain Invariants", () => {
  it("enforces Smart Reminder Stop invariant", () => {
    expect(
      canSendReminder({
        waveStatus: "ACTIVE",
        turnoutPct: 60,
        targetResponseRate: 75,
        studentRespondedAt: null,
      }).allowed
    ).toBe(true);

    // Stops automatically when target response rate is met
    expect(
      canSendReminder({
        waveStatus: "ACTIVE",
        turnoutPct: 80,
        targetResponseRate: 75,
        studentRespondedAt: null,
      }).allowed
    ).toBe(false);

    // Never reminds a student who already responded
    expect(
      canSendReminder({
        waveStatus: "ACTIVE",
        turnoutPct: 40,
        targetResponseRate: 75,
        studentRespondedAt: new Date(),
      }).allowed
    ).toBe(false);

    // Never reminds on a closed wave
    expect(
      canSendReminder({
        waveStatus: "CLOSED",
        turnoutPct: 40,
        targetResponseRate: 75,
        studentRespondedAt: null,
      }).allowed
    ).toBe(false);
  });

  it("enforces Fair Comparison invariant (min 5 responses & 50% turnout)", () => {
    expect(evaluateFairness(4, 80).reliable).toBe(false);
    expect(evaluateFairness(6, 45).reliable).toBe(false);
    expect(evaluateFairness(5, 50).reliable).toBe(true);
  });

  it("enforces Closed-Loop Verification invariant (cannot verify with same wave)", () => {
    expect(
      canVerifyIssue({
        sourceSurveyId: "wave-2",
        verifyingSurveyId: "wave-2",
      }).allowed
    ).toBe(false);

    expect(
      canVerifyIssue({
        sourceSurveyId: "wave-2",
        verifyingSurveyId: "wave-3",
      }).allowed
    ).toBe(true);
  });
});
