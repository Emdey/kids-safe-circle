# Kids Safe Circle

A closed, parent-managed social space for children ages 3–12. There is no
public feed, no search, no stranger contact, and no way for a child to post
anything that another family sees without a parent approving it first.

## The safety model, in one paragraph

Parents are the only accounts that ever authenticate. Children exist only
as profiles nested inside a parent's session. Two families can only see
each other's children's posts after their *parents* have connected — and a
parent can only start that connection by already knowing the other
parent's exact email; there is no directory or search anywhere in the app.
Every post a child creates is automatically screened, then still requires
an explicit "yes" from its own parent before anyone outside that family
can see it. This logic is enforced in the database queries themselves
(see `backend/src/db/schema.sql` and `backend/src/routes/posts.js`), not
just hidden in the UI.

## Project layout

```
kids-safe-circle/
├── backend/    Express API - auth, children, connections, posts, moderation
├── frontend/   React app (Vite) - parent dashboard + kid-facing view
└── netlify.toml
```

## Running it locally

You'll need Node 18+ and a Postgres database (a free one from Render or
Supabase works fine for local dev too).

```bash
# Backend
cd backend
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate             # applies schema.sql
npm run dev                 # http://localhost:4000

# Frontend, in a second terminal
cd frontend
cp .env.example .env        # point VITE_API_BASE_URL at the backend above
npm install
npm run dev                 # http://localhost:5173
```

## Deploying

**Backend → Render**
1. Push this repo to GitHub.
2. In Render, "New +" → "Blueprint", point it at the repo. It will read
   `backend/render.yaml` and provision the web service and a free Postgres
   database together.
3. Set `CORS_ORIGIN` and `APP_PUBLIC_URL` to your real Netlify URL once you
   have it (step below).
4. Run the migration once against the new database: from your machine,
   `DATABASE_URL=<render-connection-string> npm run migrate` inside `backend/`.

**Frontend → Netlify**
1. In Netlify, "Add new site" → "Import an existing project", point it at
   the same repo. It will read the root `netlify.toml` (base directory
   `frontend`, build command, publish directory) automatically.
2. Add an environment variable `VITE_API_BASE_URL` set to your Render
   service's URL.
3. Deploy. Then go back to Render and set `CORS_ORIGIN` to this Netlify URL.

## Setting up photo/video uploads

Photos and videos upload straight from the browser to Cloudinary (a free
media hosting service) rather than through the API - keeps things fast
and keeps Render's free tier from choking on large files.

1. Sign up free at [cloudinary.com](https://cloudinary.com)
2. On your dashboard, copy your **Cloud name** (shown near the top)
3. Go to **Settings** (gear icon) → **Upload** tab → **Upload presets** → **Add upload preset**
4. Set:
   - **Signing Mode**: `Unsigned`
   - **Folder**: `kids-safe-circle` (keeps uploads organized)
   - Under restrictions: cap **Max file size** and limit allowed formats
     to images/short video - this is your first line of defense against
     someone abusing the upload endpoint, before content even reaches
     moderation
5. Save, and copy the preset's name
6. Set these in your frontend environment (both locally in `.env` and in
   Netlify's/Render's environment variables for the deployed site):
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=your-preset-name
   ```

If these two variables aren't set, the "add a photo or video" option
just doesn't appear in the kid composer - text-only keeps working either way.

**Important gap:** images are held for manual parent review by default
(the moderation stub fails closed). **Video has no automated screening
at all yet** - every clip depends entirely on a parent watching the
whole thing before approving it. Read `backend/src/services/moderation.js`
before treating either as production-ready.

## Before real children use this

This scaffold is a solid, working starting point — not a finished,
production-hardened product. Specifically still to do:

- [ ] **Moderation**: `backend/src/services/moderation.js` ships with a
      local keyword-based stub for text, and fails closed (holds for
      review) for images. Wire a real provider (Google Cloud Vision
      SafeSearch for images, Google Video Intelligence or AWS Rekognition
      Video for video, OpenAI's moderation endpoint or Perspective API
      for text) before any content from real children goes live -
      video especially, since there's no automated check at all yet.
- [ ] **Verifiable parental consent**: signup currently logs a
      verification token to the console instead of emailing it. Wire a
      real email provider and a route that sets `consent_verified_at`,
      and decide whether your jurisdiction requires a stronger consent
      method (e.g. a small card charge) for a COPPA-style "verifiable"
      standard.
- [ ] **Report handling**: reports are stored but nothing alerts a human
      yet. Wire an email/Slack notification in `backend/src/routes/reports.js`.
- [ ] **Legal review**: have someone review your privacy policy, consent
      flow, and data retention against COPPA (US) and NDPR (Nigeria)
      specifically — this README is engineering guidance, not legal advice.
- [ ] **Terms of service & takedown process**: decide how a parent
      permanently deletes their child's data, and how fast a report gets
      a human response.
