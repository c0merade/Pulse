import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog, requireApiUser } from "@/lib/auth";
import { bulkStudentsSchema, studentInputSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const { id: groupId } = await context.params;
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const body = await request.json();

    // Support both single student { name, email } and bulk { students: [...] }
    let items: Array<{ name: string; email: string }> = [];
    if (Array.isArray(body?.students)) {
      const parsed = bulkStudentsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid students list" },
          { status: 400 }
        );
      }
      items = parsed.data.students;
    } else {
      const parsed = studentInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Invalid student data" },
          { status: 400 }
        );
      }
      items = [parsed.data];
    }

    let created = 0;
    let updated = 0;

    for (const st of items) {
      const existing = await prisma.student.findUnique({
        where: { email: st.email },
      });
      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: { name: st.name, groupId },
        });
        updated++;
      } else {
        await prisma.student.create({
          data: { name: st.name, email: st.email, groupId },
        });
        created++;
      }
    }

    await recordAuditLog({
      actor: auth.user,
      action: items.length > 1 ? "BULK_IMPORT_STUDENTS" : "ADD_STUDENT",
      entityType: "Group",
      entityId: group.id,
      details: `${group.name}: added ${created}, updated ${updated} student(s)`,
    });

    return NextResponse.json(
      { ok: true, created, updated, totalProcessed: items.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/groups/[id]/students error:", error);
    return NextResponse.json(
      { error: "Failed to add students" },
      { status: 500 }
    );
  }
}
