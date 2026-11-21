# Pulse × Picsart Academy — Deploy ուղեցույց (Render PostgreSQL + Netlify)

Այս ուղեցույցով Pulse-ը կդնես օնլայն **5 րոպեում**՝
- **Database (PostgreSQL)** → **Render** (անվճար tier)
- **Web App (Next.js Frontend + API)** → **Netlify** (անվճար tier, ավտոմատ HTTPS)

---

## Քայլ 1․ Ստեղծիր PostgreSQL բազան Render-ում
1. Մտիր [dashboard.render.com](https://dashboard.render.com) → սեղմիր **New +** → **PostgreSQL**։
2. Անունը դիր `pulse-db`, ընտրիր **Free** պլանը և սեղմիր **Create Database**։
3. Երբ կարգավիճակը դառնա **Available**, բացիր **Connect** → պատճենիր **External Database URL**-ը (սկսվում է `postgresql://...`-ով)։
   - Վերջում ավելացրու `?sslmode=require` (եթե արդեն չկա)։

## Քայլ 2․ Ստեղծիր աղյուսակները և լցրու Demo տվյալները (մեկ անգամ քո տերմինալից)
Քո համակարգչի տերմինալում `/home/hakob/Downloads/pulse` պանակում աշխատեցրու (փոխարինելով Render-ի հղումը).

```bash
DATABASE_URL="postgresql://...քո_render_external_url...?sslmode=require" npx prisma db push
DATABASE_URL="postgresql://...քո_render_external_url...?sslmode=require" npm run db:seed
```

Այս երկու հրամանը Render-ի PostgreSQL բազայում կստեղծեն բոլոր 10 աղյուսակները և կլցնեն demo տվյալները (`director@picsart.academy`, `edu@picsart.academy` և այլն, գաղտնաբառ՝ `pulse123`)։

## Քայլ 3․ Բարձրացրու կոդը GitHub
1. GitHub-ում ստեղծիր նոր repository (օր. `pulse-picsart-academy`)։
2. Տերմինալում կապիր և ուղարկիր `main` branch-ը.

```bash
git remote add origin https://github.com/<քո-username>/pulse-picsart-academy.git
git push -u origin main
```

## Քայլ 4․ Deploy արա Netlify-ում
1. Մտիր [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → ընտրիր GitHub-ի քո `pulse-picsart-academy` repo-ն։
2. Build կարգավորումները `netlify.toml`-ից ավտոմատ կկարդացվեն (`npx prisma generate && npm run build`)։
3. Սեղմիր **Add environment variables** և ավելացրու այս փոփոխականները.
   - `DATABASE_URL` = քո Render **External Database URL**-ը (`?sslmode=require`-ով)
   - `SESSION_SECRET` = ցանկացած երկար գաղտնի տեքստ (օր. 32+ պատահական նիշ)
   - `GEMINI_API_KEY` = քո Google AI Studio API բանալին *(ըստ ցանկության)*
   - `CRON_SECRET` = պատահական գաղտնի բանալի *(ըստ ցանկության)*
   - `PLATFORM_API_KEY` = պատահական գաղտնի բանալի *(ըստ ցանկության)*
   - `NEXT_PUBLIC_APP_URL` = քո Netlify կայքի հասցեն (օր. `https://pulse-academy.netlify.app`)
4. Սեղմիր **Deploy site**։

## Քայլ 5․ Ստուգիր, որ ամեն ինչ աշխատում է
1. Բացիր `https://<քո-կայք>.netlify.app/api/health` — պետք է տեսնես `"status":"ok"` և `"connected":true`։
2. Բացիր `https://<քո-կայք>.netlify.app/login` — մուտք գործիր 1 սեղմումով և փորձարկիր ամբողջ Pulse-ը օնլայն։
