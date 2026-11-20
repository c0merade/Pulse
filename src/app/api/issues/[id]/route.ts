import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog, requireApiUser } from "@/lib/auth";
import { updateIssueSchema } from "@/lib/validation";
import { canVerifyIssue } from "@/domain/invariants";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateIssueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const { status, ownerRole, ownerName, dueDate, verifiedBySurveyId } =
      parsed.data;

    if (status === "VERIFIED" && verifiedBySurveyId) {
      const existing = await prisma.issue.findUnique({
        where: { id },
        select: { sourceSurveyId: true },
      });
      if (existing) {
        const check = canVerifyIssue({
          sourceSurveyId: existing.sourceSurveyId,
          verifyingSurveyId: verifiedBySurveyId,
        });
        if (!check.allowed) {
          return NextResponse.json({ error: check.reason }, { status: 400 });
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (status) {
      data.status = status;
      if (status === "RESOLVED" || status === "VERIFIED") {
        data.resolvedAt = new Date();
      } else {
        data.resolvedAt = null;
      }
    }
    if (ownerRole) data.ownerRole = ownerRole;
    if (ownerName) data.ownerName = ownerName;
    if (dueDate) data.dueDate = new Date(dueDate);
    if (verifiedBySurveyId !== undefined) {
      data.verifiedBySurveyId = verifiedBySurveyId || null;
    }

    const updated = await prisma.issue.update({
      where: { id },
      data,
      include: {
        group: { select: { id: true, name: true } },
        sourceSurvey: { select: { id: true, title: true } },
        verifiedBySurvey: { select: { id: true, title: true } },
      },
    });

    await recordAuditLog({
      actor: auth.user,
      action: status === "VERIFIED" ? "VERIFY_ISSUE" : "UPDATE_ISSUE",
      entityType: "Issue",
      entityId: updated.id,
      details: `Updated "${updated.title}" -> status: ${updated.status}`,
    });

    return NextResponse.json({ issue: updated });
  } catch (error) {
    console.error("PATCH /api/issues/[id] error:", error);
    return NextResponse.json({ error: "Failed to update issue" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const deleted = await prisma.issue.delete({ where: { id } });

    await recordAuditLog({
      actor: auth.user,
      action: "DELETE_ISSUE",
      entityType: "Issue",
      entityId: deleted.id,
      details: `Deleted issue "${deleted.title}"`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/issues/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete issue" }, { status: 500 });
  }
}
