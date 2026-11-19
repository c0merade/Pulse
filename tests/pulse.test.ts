import { describe, it, expect } from "vitest";
import {
  computeAverages,
  computeDeltas,
  detectDrops,
  getFairnessStatus,
} from "@/lib/analytics";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  getGroupScopeWhere,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  submitResponseSchema,
  createSurveySchema,
  syncGroupsSchema,
  bulkStudentsSchema,
} from "@/lib/validation";
import { analyzeSurveyComments } from "@/lib/ai-analyzer";

describe("Pulse Analytics & Fairness Guardrails", () => {
  it("computes accurate dimension and overall averages", () => {
    const avg = computeAverages([
      { lecturesScore: 5, practiceScore: 3, materialsScore: 4, organizationScore: 4 },
      { lecturesScore: 4, practiceScore: 4, materialsScore: 5, organizationScore: 3 },
    ]);
    expect(avg.count).toBe(2);
    expect(avg.lectures).toBe(4.5);
    expect(avg.practice).toBe(3.5);
    expect(avg.materials).toBe(4.5);
    expect(avg.organization).toBe(3.5);
    expect(avg.overall).toBe(4);
  });

  it("flags drops >= 0.4 pts and classifies severity accurately", () => {
    const prev = {
      lectures: 4.5,
      practice: 4.4,
      materials: 4.0,
      organization: 4.2,
      overall: 4.28,
      count: 10,
    };
    const curr = {
      lectures: 4.4,
      practice: 3.5, // -0.9 -> HIGH
      materials: 3.55, // -0.45 -> MEDIUM
      organization: 4.5,
      overall: 3.99,
      count: 10,
    };
    const deltas = computeDeltas(curr, prev);
    expect(deltas.practice).toBe(-0.9);
    const drops = detectDrops(curr, prev);
    expect(drops).toHaveLength(2);
    expect(drops.find((d) => d.dimension === "practice")?.severity).toBe("HIGH");
    expect(drops.find((d) => d.dimension === "materials")?.severity).toBe("MEDIUM");
  });

  it("enforces fairness guardrails for small samples or low turnout", () => {
    expect(getFairnessStatus(3, 75).reliable).toBe(false);
    expect(getFairnessStatus(8, 40).reliable).toBe(false);
    expect(getFairnessStatus(8, 80).reliable).toBe(true);
  });
});

describe("Pulse Auth, RBAC & Rate Limiting", () => {
  it("hashes and verifies passwords with scrypt", () => {
    const hash = hashPassword("pulse123");
    expect(verifyPassword("pulse123", hash)).toBe(true);
    expect(verifyPassword("wrong-pass", hash)).toBe(false);
  });

  it("signs and verifies session tokens and rejects tampered payloads", () => {
    const user = {
      id: "u1",
      name: "Armine Petrosyan",
      email: "edu@picsart.academy",
      role: "EDU_LEAD" as const,
    };
    const token = signSessionToken(user);
    expect(verifySessionToken(token)).toEqual(user);
    expect(verifySessionToken(`${token}tampered`)).toBeNull();
  });

  it("scopes lecturer queries to their own email while leadership sees all", () => {
    expect(
      getGroupScopeWhere({
        id: "1",
        name: "Ani",
        email: "ani.h@picsart.academy",
        role: "LECTURER",
      })
    ).toEqual({ lecturerEmail: "ani.h@picsart.academy" });

    expect(
      getGroupScopeWhere({
        id: "2",
        name: "Tigran",
        email: "director@picsart.academy",
        role: "DIRECTOR",
      })
    ).toEqual({});
  });

  it("blocks requests exceeding the rate limit window", () => {
    const key = `test:${Date.now()}`;
    expect(checkRateLimit({ key, limit: 2, windowMs: 10000 }).allowed).toBe(true);
    expect(checkRateLimit({ key, limit: 2, windowMs: 10000 }).allowed).toBe(true);
    expect(checkRateLimit({ key, limit: 2, windowMs: 10000 }).allowed).toBe(false);
  });
});

describe("Pulse Zod Validation & Fallback AI Clustering", () => {
  it("validates student responses and rejects out-of-range scores", () => {
    expect(
      submitResponseSchema.safeParse({
        lecturesScore: 5,
        practiceScore: 4,
        materialsScore: 4,
        organizationScore: 5,
        comment: "Great course!",
      }).success
    ).toBe(true);

    expect(
      submitResponseSchema.safeParse({
        lecturesScore: 6,
        practiceScore: 4,
        materialsScore: 4,
        organizationScore: 5,
      }).success
    ).toBe(false);
  });

  it("validates survey creation, bulk student import, and sync payloads", () => {
    expect(
      createSurveySchema.safeParse({
        title: "Wave 4",
        groupId: "g1",
        targetResponseRate: 80,
      }).success
    ).toBe(true);

    expect(
      bulkStudentsSchema.safeParse({
        students: [{ name: "Anna S.", email: "anna@academy.edu" }],
      }).success
    ).toBe(true);

    expect(
      syncGroupsSchema.safeParse({
        groups: [
          {
            name: "iOS-25",
            courseName: "SwiftUI",
            lecturerName: "Lilit",
            lecturerEmail: "lilit@picsart.academy",
          },
        ],
      }).success
    ).toBe(true);
  });

  it("clusters student comments into themes accurately in fallback mode", async () => {
    const responses = [
      {
        lecturesScore: 5,
        practiceScore: 2,
        materialsScore: 5,
        organizationScore: 4,
        comment: "Practice lab was too fast and rushed, ran out of time.",
      },
      {
        lecturesScore: 4,
        practiceScore: 3,
        materialsScore: 5,
        organizationScore: 4,
        comment: "Slides are super clear, but practice exercises felt rushed.",
      },
    ];
    const averages = computeAverages(responses);
    const result = await analyzeSurveyComments({
      surveyTitle: "Wave 3",
      groupName: "Frontend-24",
      courseName: "React",
      averages,
      drops: [],
      responses,
      useFallbackOnly: true,
    });

    expect(result.source).toBe("FALLBACK");
    const practiceTheme = result.themes.find((t) => t.category === "PRACTICE");
    expect(practiceTheme).toBeDefined();
    expect(practiceTheme?.count).toBe(2);
    expect(practiceTheme?.sentiment).toBe("NEGATIVE");
  });
});
