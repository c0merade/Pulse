import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getGroupScopeWhere,
  recordAuditLog,
  requireApiUser,
} from "@/lib/auth";
import { createGroupSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("includeArchived") === "true";

    const groups = await prisma.group.findMany({
      where: {
        ...(includeArchived ? {} : { isArchived: false }),
        ...getGroupScopeWhere(auth.user),
      },
      include: {
        students: { orderBy: { name: "asc" } },
        _count: {
          select: { students: true, surveys: true, issues: true },
        },
      },
      orderBy: [{ isArchived: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(["DIRECTOR", "EDU_LEAD", "ADMIN_LEAD"]);
    if (auth.error) return auth.error;

    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid group payload" },
        { status: 400 }
      );
    }

    const { name, courseName, lecturerName, lecturerEmail } = parsed.data;

    const existing = await prisma.group.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: `Group "${name}" already exists` },
        { status: 409 }
      );
    }

    const group = await prisma.group.create({
      data: {
        name,
        courseName,
        lecturerName,
        lecturerEmail: lecturerEmail ? lecturerEmail.toLowerCase() : null,
      },
    });

    await recordAuditLog({
      actor: auth.user,
      action: "CREATE_GROUP",
      entityType: "Group",
      entityId: group.id,
      details: `Created group "${group.name}" (${group.courseName}, lecturer: ${group.lecturerName})`,
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
