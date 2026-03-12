# Online Deployment Guide (Tamil)

இந்த project-ஐ free-ஆ online deploy பண்ண best setup:
- Frontend: Vercel
- Backend: Render Web Service
- Database: Supabase PostgreSQL

## 1. முதலில் தேவைப்படுவது
- GitHub account
- Vercel account
- Render account
- Supabase account
- உங்கள் project code GitHub repository-ல் இருக்க வேண்டும்

## 2. Supabase database setup
1. [https://supabase.com](https://supabase.com) open பண்ணுங்கள்
2. புதிய project create பண்ணுங்கள்
3. Database password note பண்ணுங்கள்
4. Project open பண்ணி `SQL Editor` செல்லுங்கள்
5. `database/schema.sql` file முழுவதும் copy செய்து run பண்ணுங்கள்
6. பிறகு `database/seed.sql` run பண்ணுங்கள்
7. `Settings -> Database`-ல் connection string copy பண்ணுங்கள்

வடிவம் இதுபோல இருக்கும்:
`postgresql://postgres.xxxxx:PASSWORD@aws-0-xxx.pooler.supabase.com:6543/postgres`

## 3. Backend deploy on Render
1. [https://render.com](https://render.com) open பண்ணுங்கள்
2. `New +` -> `Web Service`
3. GitHub repo connect பண்ணுங்கள்
4. Backend folder source:
   - Root Directory: `backend`
5. Settings:
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Environment variables add பண்ணுங்கள்:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `DATABASE_URL=YOUR_SUPABASE_CONNECTION_STRING`
   - `DATABASE_SSL=true`
   - `JWT_SECRET=long_random_secret_value`
   - `JWT_EXPIRES_IN=8h`
   - `CORS_ORIGIN=https://YOUR-FRONTEND-DOMAIN.vercel.app`
7. Deploy பண்ணுங்கள்
8. Deploy ஆன பிறகு backend URL note பண்ணுங்கள்
   - Example: `https://vvc-sports-backend.onrender.com`

## 4. Frontend deploy on Vercel
1. [https://vercel.com](https://vercel.com) open பண்ணுங்கள்
2. `Add New -> Project`
3. Same GitHub repo import பண்ணுங்கள்
4. Root Directory: `frontend`
5. Environment variable add பண்ணுங்கள்:
   - `VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN.onrender.com/api`
6. Deploy பண்ணுங்கள்
7. Deployment complete ஆன பிறகு public URL கிடைக்கும்
   - Example: `https://vvc-sports.vercel.app`

## 5. முக்கிய deployment notes
- இந்த project login cookie use பண்ணுகிறது
- அதனால் production-ல் backend secure cookie use பண்ணும்படி code ready பண்ணப்பட்டுள்ளது
- `CORS_ORIGIN` exact frontend URL-ஆ இருக்க வேண்டும்
- Vercel SPA reload issue avoid பண்ண `frontend/vercel.json` add பண்ணப்பட்டுள்ளது
- Cloud Postgres SSL support காக `DATABASE_SSL=true` backend-ல் use பண்ண வேண்டும்

## 6. Login எப்படி வேலை செய்யும்?
- Browser frontend URL open பண்ணும்
- Login request backend-க்கு போகும்
- Backend secure cookie set பண்ணும்
- பிறகு protected pages open ஆகும்

## 7. Data migration
Local PostgreSQL-ல existing data இருந்தால்:
1. pgAdmin அல்லது SQL dump மூலம் data export பண்ணுங்கள்
2. Supabase SQL editor அல்லது restore மூலம் import பண்ணுங்கள்

## 8. Final public links
Deploy முடிந்த பிறகு share பண்ண வேண்டியவை:
- Frontend public link
- Optional: backend health link `/api/health`

## 9. Sir / Principal எப்படி பார்க்கலாம்?
- Mobile browser-ல் Vercel frontend link open பண்ணலாம்
- Laptop-லயும் same link open பண்ணலாம்
- Internet இருந்தால் எங்கிருந்தும் access செய்யலாம்

## 10. Free plan limitation
- Render free service sleep ஆகும்
- First open கொஞ்சம் slow ஆகும்
- Demo/college projectக்கு okay
- Daily heavy school usageக்கு later paid upgrade better
