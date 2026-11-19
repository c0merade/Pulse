import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPlatformApiKey } from "@/lib/platform-auth";
import { syncGroupsSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const keyCheck = verifyPlatformApiKey(request);
    if (!keyCheck.ok) return keyCheck.response;

    const body = await request.json();
    const parsed = syncGroupsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid sync payload" },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;

    for (const g of parsed.data.groups) {
      const existing = await prisma.group.findUnique({ where: { name: g.name } });
      if (existing) {
        await prisma.group.update({
          where: { id: existing.id },
          data: {
            courseName: g.courseName,
            lecturerName: g.lecturerName,
            lecturerEmail: g.lecturerEmail?.toLowerCase() ?? existing.lecturerEmail,
            ...(g.isArchived !== undefined ? { isArchived: g.isArchived } : {}),
          },
        });
        updated++;
      } else {
        await prisma.group.create({
          data: {
            name: g.name,
            courseName: g.courseName,
            lecturerName: g.lecturerName,
            lecturerEmail: g.lecturerEmail?.toLowerCase() ?? null,
            isArchived: g.isArchived ?? false,
          },
        });
        created++;
      }
    }

    await prisma.auditLog.create({
      data: {
        actorEmail: "sync@picsart.academy",
        actorName: "Picsart Academy Platform",
        actorRole: "PLATFORM_SYNC",
        action: "SYNC_GROUPS",
        entityType: "Group",
        details: `Synced ${parsed.data.groups.length} group(s): ${created} created, ${updated} updated`,
      },
    });

    return NextResponse.json({ ok: true, created, updated });
  } catch (error) {
    console.error("POST /api/v1/sync/groups error:", error);
    return NextResponse.json({ error: "Group sync failed" }, { status: 500 });
  }
}
