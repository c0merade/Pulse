import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog, requireApiUser } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const { id: groupId, studentId } = await context.params;
    const student = await prisma.student.findFirst({
      where: { id: studentId, groupId },
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    await prisma.student.delete({ where: { id: student.id } });

    await recordAuditLog({
      actor: auth.user,
      action: "REMOVE_STUDENT",
      entityType: "Student",
      entityId: student.id,
      details: `Removed ${student.name} (${student.email}) from group`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/groups/[id]/students/[studentId] error:", error);
    return NextResponse.json(
      { error: "Failed to remove student" },
      { status: 500 }
    );
  }
}
