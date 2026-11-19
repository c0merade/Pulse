import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(4, "Password is required"),
});

export const customQuestionSchema = z.object({
  id: z.string().trim().min(1).max(40),
  label: z.string().trim().min(3).max(200),
  type: z.enum(["RATING", "TEXT"]),
});

export const createSurveySchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  groupId: z.string().trim().min(1, "Group is required"),
  scheduledAt: z.string().optional(),
  closesAt: z.string().optional(),
  targetResponseRate: z.coerce.number().int().min(10).max(100).default(75),
  reminderIntervalHours: z.coerce.number().int().min(1).max(168).default(24),
  customQuestions: z.array(customQuestionSchema).max(10).optional().default([]),
});

export const updateSurveySchema = z.object({
  status: z.enum(["SCHEDULED", "ACTIVE", "CLOSED"]),
});

export const submitResponseSchema = z.object({
  lecturesScore: z.coerce.number().int().min(1).max(5),
  practiceScore: z.coerce.number().int().min(1).max(5),
  materialsScore: z.coerce.number().int().min(1).max(5),
  organizationScore: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().default(""),
  customAnswers: z.record(z.string(), z.union([z.string(), z.number()])).optional().default({}),
});

export const createIssueSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(180),
  description: z.string().max(2000).optional().default(""),
  category: z.enum(["LECTURES", "PRACTICE", "MATERIALS", "ORGANIZATION"]).default("ORGANIZATION"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
  ownerRole: z.enum(["EDU_LEAD", "ADMIN_LEAD", "DIRECTOR"]).default("EDU_LEAD"),
  ownerName: z.string().trim().max(120).optional(),
  dueDate: z.string().min(1, "Due date is required"),
  groupId: z.string().trim().min(1, "Group is required"),
  sourceSurveyId: z.string().optional().nullable(),
  themeName: z.string().optional().nullable(),
});

export const updateIssueSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "VERIFIED"]).optional(),
  ownerRole: z.enum(["EDU_LEAD", "ADMIN_LEAD", "DIRECTOR"]).optional(),
  ownerName: z.string().trim().min(1).max(120).optional(),
  dueDate: z.string().optional(),
  verifiedBySurveyId: z.string().nullable().optional(),
});

export const runRemindersSchema = z.object({
  surveyId: z.string().optional(),
  force: z.boolean().optional().default(false),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Group name is required").max(80),
  courseName: z.string().trim().min(2, "Course name is required").max(140),
  lecturerName: z.string().trim().min(2, "Lecturer name is required").max(120),
  lecturerEmail: z
    .string()
    .trim()
    .email("Valid lecturer email required")
    .optional()
    .or(z.literal("")),
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  courseName: z.string().trim().min(2).max(140).optional(),
  lecturerName: z.string().trim().min(2).max(120).optional(),
  lecturerEmail: z
    .string()
    .trim()
    .email("Valid lecturer email required")
    .optional()
    .or(z.literal("")),
  isArchived: z.boolean().optional(),
});

export const studentInputSchema = z.object({
  name: z.string().trim().min(2, "Student name is required").max(120),
  email: z.string().trim().email("Valid student email is required").toLowerCase(),
});

export const bulkStudentsSchema = z.object({
  students: z.array(studentInputSchema).min(1, "At least one student is required").max(500),
});

export const syncGroupsSchema = z.object({
  groups: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        courseName: z.string().trim().min(2).max(140),
        lecturerName: z.string().trim().min(2).max(120),
        lecturerEmail: z.string().trim().email().optional(),
        isArchived: z.boolean().optional(),
      })
    )
    .min(1)
    .max(200),
});

export const syncStudentsSchema = z.object({
  groupName: z.string().trim().min(2).max(80),
  students: z.array(studentInputSchema).min(1).max(500),
});
