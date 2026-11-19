import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAuditLog, requireApiUser } from "@/lib/auth";
import { updateGroupSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update payload" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.courseName !== undefined) data.courseName = parsed.data.courseName;
    if (parsed.data.lecturerName !== undefined) data.lecturerName = parsed.data.lecturerName;
    if (parsed.data.lecturerEmail !== undefined) {
      data.lecturerEmail = parsed.data.lecturerEmail
        ? parsed.data.lecturerEmail.toLowerCase()
        : null;
    }
    if (parsed.data.isArchived !== undefined) data.isArchived = parsed.data.isArchived;

    const updated = await prisma.group.update({
      where: { id },
      data,
    });

    await recordAuditLog({
      actor: auth.user,
      action:
        parsed.data.isArchived !== undefined
          ? parsed.data.isArchived
            ? "ARCHIVE_GROUP"
            : "RESTORE_GROUP"
          : "UPDATE_GROUP",
      entityType: "Group",
      entityId: updated.id,
      details: `Updated group "${updated.name}"`,
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error("PATCH /api/groups/[id] error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}
