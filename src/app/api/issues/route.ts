import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getGroupScopeWhere,
  recordAuditLog,
  requireApiUser,
} from "@/lib/auth";
import { createIssueSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const ownerRole = searchParams.get("ownerRole");
    const groupId = searchParams.get("groupId");

    const issues = await prisma.issue.findMany({
      where: {
        group: getGroupScopeWhere(auth.user),
        ...(status && status !== "ALL" ? { status } : {}),
        ...(ownerRole && ownerRole !== "ALL" ? { ownerRole } : {}),
        ...(groupId && groupId !== "ALL" ? { groupId } : {}),
      },
      include: {
        group: { select: { id: true, name: true, lecturerName: true } },
        sourceSurvey: { select: { id: true, title: true, waveNumber: true } },
        verifiedBySurvey: { select: { id: true, title: true, waveNumber: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error("GET /api/issues error:", error);
    return NextResponse.json({ error: "Failed to load issues" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = createIssueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid issue payload" },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      category,
      severity,
      ownerRole,
      ownerName,
      dueDate,
      groupId,
      sourceSurveyId,
      themeName,
    } = parsed.data;

    const defaultOwners: Record<string, string> = {
      EDU_LEAD: "Armine Petrosyan (Edu Lead)",
      ADMIN_LEAD: "Hayk Vardanyan (Admin Lead)",
      DIRECTOR: "Tigran Hovsepyan (Director)",
    };

    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        category,
        severity,
        ownerRole,
        ownerName: ownerName || defaultOwners[ownerRole] || "Edu Lead",
        dueDate: new Date(dueDate),
        groupId,
        sourceSurveyId: sourceSurveyId || null,
        themeName: themeName || null,
      },
      include: {
        group: { select: { id: true, name: true } },
        sourceSurvey: { select: { id: true, title: true } },
      },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "CREATE_ISSUE",
      entityType: "Issue",
      entityId: issue.id,
      details: `Created "${issue.title}" (${issue.category}) assigned to ${issue.ownerName}`,
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (error) {
    console.error("POST /api/issues error:", error);
    return NextResponse.json({ error: "Failed to create issue" }, { status: 500 });
  }
}
