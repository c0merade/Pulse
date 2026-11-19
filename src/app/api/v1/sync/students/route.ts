import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlatformApiKey } from "@/lib/platform-auth";
import { syncStudentsSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const keyCheck = verifyPlatformApiKey(request);
    if (!keyCheck.ok) return keyCheck.response;

    const body = await request.json();
    const parsed = syncStudentsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid sync payload" },
        { status: 400 }
      );
    }

    const group = await prisma.group.findUnique({
      where: { name: parsed.data.groupName },
    });
    if (!group) {
      return NextResponse.json(
        { error: `Group "${parsed.data.groupName}" not found. Sync groups first.` },
        { status: 404 }
      );
    }

    let created = 0;
    let updated = 0;

    for (const st of parsed.data.students) {
      const existing = await prisma.student.findUnique({
        where: { email: st.email },
      });
      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: { name: st.name, groupId: group.id },
        });
        updated++;
      } else {
        await prisma.student.create({
          data: { name: st.name, email: st.email, groupId: group.id },
        });
        created++;
      }
    }

    await prisma.auditLog.create({
      data: {
        actorEmail: "sync@picsart.academy",
        actorName: "Picsart Academy Platform",
        actorRole: "PLATFORM_SYNC",
        action: "SYNC_STUDENTS",
        entityType: "Group",
        entityId: group.id,
        details: `Synced ${parsed.data.students.length} student(s) into ${group.name}: ${created} created, ${updated} updated`,
      },
    });

    return NextResponse.json({
      ok: true,
      group: group.name,
      created,
      updated,
    });
  } catch (error) {
    console.error("POST /api/v1/sync/students error:", error);
    return NextResponse.json({ error: "Student sync failed" }, { status: 500 });
  }
}
