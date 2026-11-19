export type Lang = "en" | "hy";

export const LANG_COOKIE_NAME = "pulse_lang";

export interface CustomQuestion {
  id: string;
  label: string;
  type: "RATING" | "TEXT";
}

export const SURVEY_TEMPLATES: Array<{
  id: string;
  name: string;
  questions: CustomQuestion[];
}> = [
  {
    id: "standard",
    name: "Standard Monthly Pulse (4 Core Dimensions)",
    questions: [],
  },
  {
    id: "midterm",
    name: "Midterm Check-in (+ Pace & Mentor Support)",
    questions: [
      { id: "pace", label: "Is the course pace comfortable for you?", type: "RATING" },
      { id: "mentor", label: "How helpful are mentor code reviews?", type: "RATING" },
    ],
  },
  {
    id: "final",
    name: "Final Course Wrap-up (+ Career Readiness & Recommendation)",
    questions: [
      { id: "recommend", label: "How likely are you to recommend this course (1-5)?", type: "RATING" },
      { id: "best_part", label: "What was the most valuable topic or project?", type: "TEXT" },
    ],
  },
];

export const DICT = {
  en: {
    brandSub: "Picsart Academy",
    nav: {
      overview: "Overview",
      surveys: "Surveys & Reminders",
      issues: "Issue Tracker",
      compare: "Fair Comparison",
      groups: "Groups & Students",
      reports: "Meeting Brief",
      audit: "Audit Log",
    },
    aiStatus: "AI Analyzer Status",
    aiConnected: "Gemini API connected (live LLM clustering)",
    aiFallback: "Smart Fallback active. Add GEMINI_API_KEY in .env.",
    signOut: "Sign out",
    roles: {
      DIRECTOR: "Director",
      EDU_LEAD: "Edu Lead",
      ADMIN_LEAD: "Admin Lead",
      LECTURER: "Lecturer",
    },
    studentForm: {
      badge: "Picsart Academy Quality Check",
      anonNoticePrefix: "Hi",
      anonNoticeBody:
        "Your name is only used to stop reminder emails. Your ratings and comment are stored anonymously.",
      scaleHint: "1 = Poor · 5 = Great",
      lectures: "Lectures",
      lecturesHint: "Clarity, depth, pacing, and real-world examples",
      practice: "Practice Sessions",
      practiceHint: "Hands-on exercises, workshop time, and mentor guidance",
      materials: "Course Materials",
      materialsHint: "Slides, repos, recordings, and documentation quality",
      organization: "Organization",
      organizationHint: "Schedule clarity, communication, room/Zoom logistics",
      extraSection: "Additional Course Questions",
      commentLabel: "What's working well or needs improvement?",
      commentHint:
        "Optional, but super helpful — our AI groups comments into themes so the Academy can fix real issues fast.",
      commentPlaceholder:
        "e.g., Slides were great this week, but the practice session felt a bit rushed...",
      submit: "Submit Anonymous Feedback",
      submitting: "Submitting...",
      thankYou: "Thank you,",
      thankYouBody:
        "Your anonymous feedback has been recorded. You will no longer receive reminders for this survey wave.",
      closedTitle: "This survey is closed",
      closedBody:
        "Thanks for checking in — responses for this wave are no longer being collected.",
      rateAllError: "Please rate all 4 core dimensions before submitting.",
    },
  },
  hy: {
    brandSub: "Picsart Academy",
    nav: {
      overview: "Ընդհանուր տեսք",
      surveys: "Հարցումներ և Հիշեցումներ",
      issues: "Խնդիրների թրեքեր",
      compare: "Արդար համեմատություն",
      groups: "Խմբեր և Ուսանողներ",
      reports: "Ժողովի ամփոփագիր",
      audit: "Գործողությունների մատյան",
    },
    aiStatus: "AI Վերլուծիչի կարգավիճակ",
    aiConnected: "Gemini API-ն միացված է (իրական LLM)",
    aiFallback: "Աշխատում է Smart Fallback-ը։ Ավելացրեք GEMINI_API_KEY:",
    signOut: "Դուրս գալ",
    roles: {
      DIRECTOR: "Տնօրեն",
      EDU_LEAD: "Ուսումնական ղեկավար",
      ADMIN_LEAD: "Ադմինիստրատիվ ղեկավար",
      LECTURER: "Դասախոս",
    },
    studentForm: {
      badge: "Picsart Academy Որակի ստուգում",
      anonNoticePrefix: "Ողջույն,",
      anonNoticeBody:
        "Ձեր անունն օգտագործվում է միայն հիշեցումները դադարեցնելու համար։ Գնահատականներն ու մեկնաբանությունը պահվում են անանուն։",
      scaleHint: "1 = Վատ · 5 = Գերազանց",
      lectures: "Դասախոսություններ",
      lecturesHint: "Հստակություն, խորություն, տեմպ և իրական օրինակներ",
      practice: "Պրակտիկ պարապմունքներ",
      practiceHint: "Գործնական առաջադրանքներ, ժամանակի բաշխում և մենթորի աջակցություն",
      materials: "Ուսումնական նյութեր",
      materialsHint: "Սլայդեր, կոդի օրինակներ, ձայնագրություններ և փաստաթղթեր",
      organization: "Կազմակերպում",
      organizationHint: "Ժամանակացույց, հաղորդակցություն, լսարանային/Zoom պայմաններ",
      extraSection: "Լրացուցիչ հարցեր",
      commentLabel: "Ի՞նչն է լավ աշխատում և ի՞նչը պետք է բարելավել։",
      commentHint:
        "Պարտադիր չէ, բայց շատ օգտակար է — AI-ը խմբավորում է կարծիքները թեմաների, որպեսզի Ակադեմիան արագ լուծի խնդիրները։",
      commentPlaceholder:
        "Օր.՝ սլայդերը շատ հստակ էին, բայց պրակտիկայի ժամանակ քիչ ժամանակ ունեցանք...",
      submit: "Ուղարկել անանուն կարծիքը",
      submitting: "Ուղարկվում է...",
      thankYou: "Շնորհակալություն,",
      thankYouBody:
        "Ձեր անանուն պատասխանը գրանցված է։ Այս հարցման համար այլևս հիշեցումներ չեք ստանա։",
      closedTitle: "Հարցումը փակված է",
      closedBody: "Այս ալիքի պատասխանների ընդունումն արդեն ավարտվել է։",
      rateAllError: "Խնդրում ենք գնահատել բոլոր 4 հիմնական չափանիշները։",
    },
  },
} as const;

export function normalizeLang(val?: string | null): Lang {
  return val === "hy" ? "hy" : "en";
}
