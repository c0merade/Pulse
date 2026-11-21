import { PrismaClient } from "@prisma/client";
import { analyzeSurveyComments } from "../src/lib/ai-analyzer";
import { computeAverages, detectDrops } from "../src/lib/analytics";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("Seeding Pulse database...");

  // Clean existing data for idempotent re-seeding
  await prisma.auditLog.deleteMany();
  await prisma.reminderLog.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.surveyAnalysis.deleteMany();
  await prisma.response.deleteMany();
  await prisma.surveyInvite.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.student.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // 0. Users (Picsart Academy roles — demo password: "pulse123")
  const demoPasswordHash = hashPassword("pulse123");
  await prisma.user.createMany({
    data: [
      {
        name: "Tigran Hovsepyan",
        email: "director@picsart.academy",
        passwordHash: demoPasswordHash,
        role: "DIRECTOR",
      },
      {
        name: "Armine Petrosyan",
        email: "edu@picsart.academy",
        passwordHash: demoPasswordHash,
        role: "EDU_LEAD",
      },
      {
        name: "Hayk Vardanyan",
        email: "admin@picsart.academy",
        passwordHash: demoPasswordHash,
        role: "ADMIN_LEAD",
      },
      {
        name: "Ani Hakobyan",
        email: "ani.h@picsart.academy",
        passwordHash: demoPasswordHash,
        role: "LECTURER",
      },
      {
        name: "Davit Petrosyan",
        email: "davit.p@picsart.academy",
        passwordHash: demoPasswordHash,
        role: "LECTURER",
      },
      {
        name: "Sona Grigoryan",
        email: "sona.g@picsart.academy",
        passwordHash: demoPasswordHash,
        role: "LECTURER",
      },
    ],
  });

  // 1. Groups & Students
  const frontend = await prisma.group.create({
    data: {
      name: "Frontend-24",
      courseName: "Modern React & TypeScript",
      lecturerName: "Ani Hakobyan",
      lecturerEmail: "ani.h@picsart.academy",
      students: {
        create: [
          { name: "Armen Sargsyan", email: "armen.s@academy.edu" },
          { name: "Lilit Hovhannisyan", email: "lilit.h@academy.edu" },
          { name: "Tigran Vardanyan", email: "tigran.v@academy.edu" },
          { name: "Mariam Karapetyan", email: "mariam.k@academy.edu" },
          { name: "Narek Harutyunyan", email: "narek.h@academy.edu" },
          { name: "Elen Gevorgyan", email: "elen.g@academy.edu" },
          { name: "Gor Stepanyan", email: "gor.s@academy.edu" },
          { name: "Mane Grigoryan", email: "mane.g@academy.edu" },
          { name: "Hayk Melkonyan", email: "hayk.m@academy.edu" },
          { name: "Tatev Avetisyan", email: "tatev.a@academy.edu" },
        ],
      },
    },
    include: { students: true },
  });

  const backend = await prisma.group.create({
    data: {
      name: "Backend-24",
      courseName: "Node.js & Distributed APIs",
      lecturerName: "Davit Petrosyan",
      lecturerEmail: "davit.p@picsart.academy",
      students: {
        create: [
          { name: "Vahan Khachatryan", email: "vahan.k@academy.edu" },
          { name: "Anahit Mkrtchyan", email: "anahit.m@academy.edu" },
          { name: "Sargis Poghosyan", email: "sargis.p@academy.edu" },
          { name: "Milena Davtyan", email: "milena.d@academy.edu" },
          { name: "Artur Galstyan", email: "artur.g@academy.edu" },
          { name: "Syuzanna Baghdasaryan", email: "syuzanna.b@academy.edu" },
          { name: "Karen Ghazaryan", email: "karen.g@academy.edu" },
          { name: "Narine Martirosyan", email: "narine.m@academy.edu" },
          { name: "Edgar Tovmasyan", email: "edgar.t@academy.edu" },
          { name: "Lusine Sahakyan", email: "lusine.s@academy.edu" },
        ],
      },
    },
    include: { students: true },
  });

  const dataGroup = await prisma.group.create({
    data: {
      name: "Data-24",
      courseName: "Applied ML & Python",
      lecturerName: "Sona Grigoryan",
      lecturerEmail: "sona.g@picsart.academy",
      students: {
        create: [
          { name: "Ruben Abrahamyan", email: "ruben.a@academy.edu" },
          { name: "Ina Simonyan", email: "ina.s@academy.edu" },
          { name: "Gevorg Babayan", email: "gevorg.b@academy.edu" },
          { name: "Liana Hakobyan", email: "liana.h@academy.edu" },
          { name: "Mher Asatryan", email: "mher.a@academy.edu" },
          { name: "Seda Danielyan", email: "seda.d@academy.edu" },
          { name: "Aram Minasyan", email: "aram.m@academy.edu" },
          { name: "Nona Yeghiazaryan", email: "nona.y@academy.edu" },
        ],
      },
    },
    include: { students: true },
  });

  type ResponseSeed = {
    l: number;
    p: number;
    m: number;
    o: number;
    comment: string;
  };

  async function createWaveSurvey(params: {
    group: typeof frontend;
    title: string;
    waveNumber: number;
    scheduledAt: Date;
    closesAt: Date;
    status: "SCHEDULED" | "ACTIVE" | "CLOSED";
    targetResponseRate: number;
    responses: ResponseSeed[];
    previousAverages: ReturnType<typeof computeAverages> | null;
    tokenPrefix: string;
  }) {
    const survey = await prisma.survey.create({
      data: {
        title: params.title,
        waveNumber: params.waveNumber,
        groupId: params.group.id,
        scheduledAt: params.scheduledAt,
        closesAt: params.closesAt,
        status: params.status,
        targetResponseRate: params.targetResponseRate,
        reminderIntervalHours: 24,
      },
    });

    // Create invites for all students in the group
    for (let i = 0; i < params.group.students.length; i++) {
      const student = params.group.students[i];
      // Keep fe-w3-5 pending as the primary shareable demo survey link (7/10 responded)
      const hasResponded =
        params.tokenPrefix === "fe-w3"
          ? i !== 4 && i < params.responses.length + 1
          : i < params.responses.length;
      await prisma.surveyInvite.create({
        data: {
          surveyId: survey.id,
          studentId: student.id,
          token: `${params.tokenPrefix}-${i + 1}`,
          respondedAt: hasResponded ? daysAgo(Math.max(1, 3 - (i % 3))) : null,
          remindersSent: hasResponded ? 1 : params.status === "ACTIVE" ? 1 : 2,
          lastRemindedAt: params.status === "ACTIVE" ? daysAgo(2) : daysAgo(20),
        },
      });
    }

    // Create anonymous responses
    for (const r of params.responses) {
      await prisma.response.create({
        data: {
          surveyId: survey.id,
          lecturesScore: r.l,
          practiceScore: r.p,
          materialsScore: r.m,
          organizationScore: r.o,
          comment: r.comment,
          submittedAt: params.status === "ACTIVE" ? daysAgo(1) : params.closesAt,
        },
      });
    }

    const avg = computeAverages(
      params.responses.map((r) => ({
        lecturesScore: r.l,
        practiceScore: r.p,
        materialsScore: r.m,
        organizationScore: r.o,
      }))
    );
    const drops = detectDrops(avg, params.previousAverages);

    if (params.responses.length > 0) {
      const analysis = await analyzeSurveyComments({
        surveyTitle: survey.title,
        groupName: params.group.name,
        courseName: params.group.courseName,
        averages: avg,
        drops,
        useFallbackOnly: true,
        responses: params.responses.map((r) => ({
          comment: r.comment,
          lecturesScore: r.l,
          practiceScore: r.p,
          materialsScore: r.m,
          organizationScore: r.o,
        })),
      });

      await prisma.surveyAnalysis.create({
        data: {
          surveyId: survey.id,
          overallSummary: analysis.overallSummary,
          themesJson: JSON.stringify(analysis.themes),
          dropsFlaggedJson: JSON.stringify(drops),
          source: analysis.source,
        },
      });
    }

    return { survey, avg };
  }

  // --- FRONTEND-24 WAVES ---
  const feW1 = await createWaveSurvey({
    group: frontend,
    title: "Monthly Pulse — Wave 1 (Sep)",
    waveNumber: 1,
    scheduledAt: daysAgo(65),
    closesAt: daysAgo(58),
    status: "CLOSED",
    targetResponseRate: 80,
    tokenPrefix: "fe-w1",
    previousAverages: null,
    responses: [
      { l: 4, p: 4, m: 3, o: 4, comment: "Lectures are very clear and engaging, though slides were uploaded late after class." },
      { l: 5, p: 4, m: 3, o: 4, comment: "Great React intro! Would love the slides and repo links before the lecture starts." },
      { l: 4, p: 5, m: 4, o: 4, comment: "Hands-on practice tasks are super solid and fun." },
      { l: 4, p: 4, m: 3, o: 5, comment: "Organization is smooth. Please share slides earlier so we can take notes." },
      { l: 5, p: 4, m: 4, o: 4, comment: "Ani explains concepts patiently with clear examples." },
      { l: 4, p: 4, m: 3, o: 4, comment: "Materials are good once posted, just delayed by 2 days sometimes." },
      { l: 4, p: 5, m: 4, o: 4, comment: "Loved the component workshop exercise." },
      { l: 4, p: 4, m: 3, o: 4, comment: "Good start overall, minor delay on recordings." },
    ],
  });

  const feW2 = await createWaveSurvey({
    group: frontend,
    title: "Monthly Pulse — Wave 2 (Oct)",
    waveNumber: 2,
    scheduledAt: daysAgo(35),
    closesAt: daysAgo(28),
    status: "CLOSED",
    targetResponseRate: 80,
    tokenPrefix: "fe-w2",
    previousAverages: feW1.avg,
    responses: [
      { l: 5, p: 4, m: 3, o: 4, comment: "Lectures keep getting better, still waiting on updated slides for hooks." },
      { l: 4, p: 5, m: 3, o: 4, comment: "Practice exercises are well-paced and practical." },
      { l: 5, p: 4, m: 2, o: 4, comment: "Slides and GitHub docs had outdated snippets from an older React version." },
      { l: 4, p: 4, m: 3, o: 5, comment: "Schedule and Slack communication are clear." },
      { l: 5, p: 5, m: 4, o: 4, comment: "Really enjoying the live coding walkthroughs during practice." },
      { l: 4, p: 4, m: 3, o: 4, comment: "Recordings were uploaded late again this week." },
      { l: 4, p: 4, m: 3, o: 4, comment: "Great explanations on state management, materials need cleanup." },
      { l: 5, p: 4, m: 4, o: 5, comment: "Everything runs smoothly, nice mentor support." },
    ],
  });

  // Wave 3 (Active): Materials improved (3.1 -> 4.4!), Practice DROPPED (4.25 -> 3.29!)
  const feW3 = await createWaveSurvey({
    group: frontend,
    title: "Monthly Pulse — Wave 3 (Nov)",
    waveNumber: 3,
    scheduledAt: daysAgo(4),
    closesAt: daysFromNow(5),
    status: "ACTIVE",
    targetResponseRate: 80,
    tokenPrefix: "fe-w3",
    previousAverages: feW2.avg,
    responses: [
      { l: 5, p: 3, m: 5, o: 4, comment: "Slides and docs are now super clean and uploaded on time! However, the TypeScript practice lab felt rushed and we ran out of time." },
      { l: 4, p: 3, m: 4, o: 4, comment: "Much better materials this month. Practice exercises were too fast and I got stuck debugging generics." },
      { l: 5, p: 4, m: 5, o: 5, comment: "Updated GitHub resources are awesome. Need slightly more time on hands-on coding tasks." },
      { l: 4, p: 3, m: 4, o: 4, comment: "Lecture theory is clear, but practice session pacing is too fast for complex tasks." },
      { l: 5, p: 3, m: 4, o: 4, comment: "Appreciate the timely slides! In practice we skipped the last exercise because there was not enough time." },
      { l: 4, p: 4, m: 5, o: 4, comment: "Materials are night-and-day better now. Practice was challenging but helpful." },
      { l: 4, p: 3, m: 4, o: 5, comment: "Great organization. Please slow down the practice workshop so everyone finishes." },
    ],
  });

  // --- BACKEND-24 WAVES ---
  const beW1 = await createWaveSurvey({
    group: backend,
    title: "Monthly Pulse — Wave 1 (Sep)",
    waveNumber: 1,
    scheduledAt: daysAgo(65),
    closesAt: daysAgo(58),
    status: "CLOSED",
    targetResponseRate: 75,
    tokenPrefix: "be-w1",
    previousAverages: null,
    responses: [
      { l: 4, p: 4, m: 4, o: 3, comment: "Great API design lectures, but Lab B projector audio was noisy and hard to hear." },
      { l: 4, p: 4, m: 4, o: 3, comment: "Room audio issue in Lab B distracted from the session." },
      { l: 5, p: 4, m: 4, o: 3, comment: "Davit explains architecture well. Please fix the mic and room setup." },
      { l: 4, p: 5, m: 4, o: 4, comment: "Solid practice tasks with Express and PostgreSQL." },
      { l: 4, p: 4, m: 5, o: 3, comment: "Docs and starter repos are super clean; room audio needs fixing." },
      { l: 5, p: 4, m: 4, o: 4, comment: "Strong pace and very practical backend exercises." },
      { l: 4, p: 4, m: 4, o: 3, comment: "Good course so far, just noisy room equipment." },
      { l: 4, p: 4, m: 4, o: 4, comment: "Clear materials and helpful homework reviews." },
    ],
  });

  const beW2 = await createWaveSurvey({
    group: backend,
    title: "Monthly Pulse — Wave 2 (Oct)",
    waveNumber: 2,
    scheduledAt: daysAgo(35),
    closesAt: daysAgo(28),
    status: "CLOSED",
    targetResponseRate: 75,
    tokenPrefix: "be-w2",
    previousAverages: beW1.avg,
    responses: [
      { l: 5, p: 4, m: 4, o: 5, comment: "Lab B audio is completely fixed now, sessions are smooth!" },
      { l: 4, p: 3, m: 4, o: 4, comment: "Docker practice lab was quite fast and hard to follow for beginners." },
      { l: 5, p: 4, m: 5, o: 5, comment: "Much better room logistics. Great lecture clarity." },
      { l: 4, p: 3, m: 4, o: 4, comment: "Need more guided debugging time during Docker practice exercises." },
      { l: 5, p: 4, m: 4, o: 5, comment: "Organization is top notch now." },
      { l: 4, p: 4, m: 5, o: 4, comment: "Slides and GitHub examples are very helpful." },
      { l: 5, p: 4, m: 4, o: 5, comment: "Great explanations on auth and queues." },
      { l: 4, p: 4, m: 4, o: 4, comment: "Solid overall, Docker homework took longer than expected." },
    ],
  });

  const beW3 = await createWaveSurvey({
    group: backend,
    title: "Monthly Pulse — Wave 3 (Nov)",
    waveNumber: 3,
    scheduledAt: daysAgo(4),
    closesAt: daysFromNow(5),
    status: "ACTIVE",
    targetResponseRate: 75,
    tokenPrefix: "be-w3",
    previousAverages: beW2.avg,
    responses: [
      { l: 5, p: 5, m: 5, o: 5, comment: "Best month yet! Lectures and practice labs are perfectly aligned." },
      { l: 5, p: 4, m: 4, o: 5, comment: "Really appreciated the extra time on microservices practice tasks." },
      { l: 4, p: 5, m: 5, o: 4, comment: "Documentation and cheatsheets are super useful." },
      { l: 5, p: 4, m: 4, o: 5, comment: "Smooth schedule and responsive mentors." },
      { l: 5, p: 5, m: 5, o: 5, comment: "Davit's system design walkthrough was awesome." },
      { l: 4, p: 4, m: 4, o: 5, comment: "Everything is well-organized and clear." },
      { l: 5, p: 4, m: 5, o: 4, comment: "Great balance of theory and coding exercises." },
      { l: 5, p: 5, m: 4, o: 5, comment: "Love the real-world caching lab." },
    ],
  });

  // --- DATA-24 WAVES ---
  const daW2 = await createWaveSurvey({
    group: dataGroup,
    title: "Monthly Pulse — Wave 2 (Oct)",
    waveNumber: 2,
    scheduledAt: daysAgo(35),
    closesAt: daysAgo(28),
    status: "CLOSED",
    targetResponseRate: 75,
    tokenPrefix: "da-w2",
    previousAverages: null,
    responses: [
      { l: 5, p: 4, m: 4, o: 3, comment: "Sona's ML lectures are super clear, but workshop reschedules were announced last minute on Slack." },
      { l: 4, p: 4, m: 4, o: 3, comment: "Great notebooks and datasets. Schedule changes came too late." },
      { l: 5, p: 5, m: 4, o: 3, comment: "Loved the scikit-learn practice lab, though calendar invites were outdated." },
      { l: 4, p: 4, m: 5, o: 4, comment: "Clear materials and good pace." },
      { l: 5, p: 4, m: 4, o: 3, comment: "Please give 48h notice before changing workshop times." },
      { l: 4, p: 4, m: 4, o: 4, comment: "Very engaging class overall." },
    ],
  });

  // Wave 3 (Active, low sample size: 3/8 = 38% to demonstrate Fair Comparison guardrail + Reminder chasing!)
  const daW3 = await createWaveSurvey({
    group: dataGroup,
    title: "Monthly Pulse — Wave 3 (Nov)",
    waveNumber: 3,
    scheduledAt: daysAgo(3),
    closesAt: daysFromNow(6),
    status: "ACTIVE",
    targetResponseRate: 75,
    tokenPrefix: "da-w3",
    previousAverages: daW2.avg,
    responses: [
      { l: 5, p: 4, m: 4, o: 3, comment: "Neural net lectures are awesome! Still had one last-minute Zoom link change." },
      { l: 4, p: 5, m: 5, o: 4, comment: "PyTorch notebooks and practice tasks are really well-structured." },
      { l: 5, p: 4, m: 4, o: 3, comment: "Great content, would love cleaner calendar reminders." },
    ],
  });

  // 2. Tracked Issues (connecting past surveys -> actions -> verification)
  await prisma.issue.createMany({
    data: [
      {
        title: "Upload updated lecture slides & recordings within 12h",
        description:
          "Multiple Frontend-24 students reported outdated React snippets and delayed slide uploads in Wave 1 & 2.",
        category: "MATERIALS",
        severity: "HIGH",
        status: "RESOLVED",
        ownerRole: "EDU_LEAD",
        ownerName: "Armine Petrosyan (Edu Lead)",
        themeName: "Course Materials & Documentation",
        dueDate: daysAgo(7),
        resolvedAt: daysAgo(10),
        groupId: frontend.id,
        sourceSurveyId: feW2.survey.id,
      },
      {
        title: "Replace faulty microphone & projector audio in Lab B",
        description:
          "5 students in Backend-24 Wave 1 flagged noisy room audio disrupting lectures.",
        category: "ORGANIZATION",
        severity: "HIGH",
        status: "VERIFIED",
        ownerRole: "ADMIN_LEAD",
        ownerName: "Hayk Vardanyan (Admin Lead)",
        themeName: "Schedule, Communication & Logistics",
        dueDate: daysAgo(45),
        resolvedAt: daysAgo(48),
        groupId: backend.id,
        sourceSurveyId: beW1.survey.id,
        verifiedBySurveyId: beW2.survey.id,
      },
      {
        title: "Add 30-min guided walkthrough for Docker & CI/CD labs",
        description:
          "Students found the Docker practice lab rushed; Edu Lead adjusting syllabus buffer.",
        category: "PRACTICE",
        severity: "MEDIUM",
        status: "IN_PROGRESS",
        ownerRole: "EDU_LEAD",
        ownerName: "Armine Petrosyan (Edu Lead)",
        themeName: "Practice Pacing & Hands-on Time",
        dueDate: daysFromNow(4),
        groupId: backend.id,
        sourceSurveyId: beW2.survey.id,
      },
      {
        title: "Enforce 48h advance notice for workshop schedule changes",
        description:
          "Data-24 Wave 2 flagged last-minute Slack announcements and outdated calendar invites.",
        category: "ORGANIZATION",
        severity: "MEDIUM",
        status: "OPEN",
        ownerRole: "ADMIN_LEAD",
        ownerName: "Hayk Vardanyan (Admin Lead)",
        themeName: "Schedule, Communication & Logistics",
        dueDate: daysAgo(2), // Overdue!
        groupId: dataGroup.id,
        sourceSurveyId: daW2.survey.id,
      },
    ],
  });

  // 3. Initial Reminder Logs for active surveys
  await prisma.reminderLog.createMany({
    data: [
      {
        surveyId: feW3.survey.id,
        studentName: "Mane Grigoryan",
        studentEmail: "mane.g@academy.edu",
        message: `Hi Mane Grigoryan, please take 60 seconds to complete "${feW3.survey.title}" for Frontend-24. Link: /s/fe-w3-8`,
        sentAt: daysAgo(2),
      },
      {
        surveyId: feW3.survey.id,
        studentName: "Hayk Melkonyan",
        studentEmail: "hayk.m@academy.edu",
        message: `Hi Hayk Melkonyan, please take 60 seconds to complete "${feW3.survey.title}" for Frontend-24. Link: /s/fe-w3-9`,
        sentAt: daysAgo(2),
      },
      {
        surveyId: daW3.survey.id,
        studentName: "Liana Hakobyan",
        studentEmail: "liana.h@academy.edu",
        message: `Hi Liana Hakobyan, please take 60 seconds to complete "${daW3.survey.title}" for Data-24. Link: /s/da-w3-4`,
        sentAt: daysAgo(2),
      },
    ],
  });

  console.log("Pulse seed complete!");
  console.log(`- Active surveys: Frontend-24 (${feW3.survey.id}), Backend-24 (${beW3.survey.id}), Data-24 (${daW3.survey.id})`);
  console.log(`- Try filling out a student survey at: /s/fe-w3-8 or /s/da-w3-4`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
