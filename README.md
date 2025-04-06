# Practice Tracker App

## Overview

A simple web application for musicians to log and track their instrument practice sessions. Built with Vanilla HTML, CSS, JavaScript, and Supabase for the backend database. Deployed using Vercel.

## Features

*   User Sign Up & Sign In (Supabase Auth, handled via Edge Function for robustness)
*   Instrument selection during sign-up.
*   Dashboard displaying user info, instruments, recent sessions per instrument, and a 7-day practice chart.
*   Log new practice sessions with date and instrument.
*   Log detailed subsessions with category, notes, and duration (using stopwatch or manual entry).
*   Data stored securely in Supabase.
*   Responsive design.

## Technology Stack

*   **Frontend:** HTML, CSS, Vanilla JavaScript
*   **Backend/Database:** Supabase (Auth, Database, Edge Functions)
*   **Deployment:** Vercel
*   **Libraries:**
    *   `@supabase/supabase-js`: For interacting with Supabase.
    *   `Chart.js`: For rendering the practice chart.

## Setup

### 1. Supabase Project Setup

1.  **Create a Supabase Project:** Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Get Credentials:**
    *   Navigate to Project Settings > API.
    *   Find your **Project URL** (this is `SUPABASE_URL`).
    *   Find your **Project API Keys** > `anon` `public` key (this is `SUPABASE_ANON_KEY`).
    *   Find your **Project API Keys** > `service_role` `secret` key (this is `SUPABASE_SERVICE_ROLE_KEY`). **Keep this secret!** It will be used by the Edge Function.
3.  **Run SQL Schema:**
    *   Go to the SQL Editor in your Supabase dashboard.
    *   Create a "New query".
    *   Copy and paste the entire SQL script from the [Supabase Schema SQL](#supabase-schema-sql) section below into the editor.
    *   Run the query to create the necessary tables, functions, triggers, and RLS policies.
4.  **(Important) Update RLS Policies for Public Tables:**
    *   The initial schema contains policies restricting reads on `Instruments` and `Categories` to authenticated users. This can cause issues during signup *before* the user session is fully active for RLS.
    *   Run the following SQL in your Supabase editor to allow public read access to these tables:
      ```sql
      -- Drop the old restricted read policies
      DROP POLICY IF EXISTS "Allow authenticated read access" ON public."Instruments";
      DROP POLICY IF EXISTS "Allow authenticated read access" ON public."Categories";

      -- Create new policies allowing public read access
      CREATE POLICY "Allow public read access" ON public."Instruments"
          FOR SELECT USING (true); -- Allows anyone to SELECT

      CREATE POLICY "Allow public read access" ON public."Categories"
          FOR SELECT USING (true); -- Allows anyone to SELECT

      -- Ensure RLS is still enabled (these commands won't hurt if already enabled)
      ALTER TABLE public."Instruments" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public."Categories" ENABLE ROW LEVEL SECURITY;
      ```
5.  **(Optional but Recommended) Review Other RLS Policies:**
    *   Carefully review the RLS policies created by the main schema script for `Users`, `UserInstruments`, `PracticeSessions`, and `PracticeSubsessions`.
    *   Ensure they correctly restrict access so users can only manage their *own* data.
    *   Refer to Supabase documentation for detailed RLS guidance.

### 2. Local Development Setup

1.  **Install Supabase CLI:** If you haven't already, install the Supabase CLI: `npm install supabase --save-dev` (or globally `npm install -g supabase`). You might need Docker running for the CLI.
2.  **Install Vercel CLI:** `npm install -g vercel`
3.  **Clone the Repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-repo-directory>
    ```
4.  **Link Supabase Project:** `supabase login`, then `supabase link --project-ref <your-project-id>` (Find Project ID in Supabase project settings URL).
5.  **Link Vercel Project:** `vercel link` (Follow prompts)
6.  **Set Environment Variables Locally:**
    *   **Vercel:**
        *   `vercel env add SUPABASE_URL` (Paste your Project URL)
        *   `vercel env add SUPABASE_ANON_KEY` (Paste your `anon` public key)
        *   Select "Development" environment for both.
    *   **Supabase (for Edge Function):**
        *   Create a file named `.env.local` in the `supabase/functions` directory (or project root if preferred by your setup).
        *   Add the following lines, replacing placeholders with your actual credentials:
          ```
          SUPABASE_URL=your-project-url
          SUPABASE_ANON_KEY=your-anon-public-key
          SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
          ```
        *   *Note:* The Supabase CLI uses these `.env.local` variables when running functions locally.
7.  **Pull Vercel Environment Variables:** `vercel env pull .env.development.local` (This creates a file Vercel uses for `vercel dev`).
8.  **Run Development Server:**
    *   Use the Supabase CLI to serve functions *and* `vercel dev` to serve the frontend and proxy functions:
    *   **Terminal 1:** `supabase start` (Starts Supabase services locally, including functions) - *May require Docker*. Wait for it to fully start.
    *   **Terminal 2:** `supabase functions serve --env-file ./supabase/.env.local` (Serves your edge functions, watching for changes).
    *   **Terminal 3:** `vercel dev` (Serves `index.html` and uses the Vercel env vars).
    *   Access the app via the `vercel dev` URL (usually `http://localhost:3000`).
    *   *Alternative:* If `supabase start` is too heavy, you might be able to skip it and just use `supabase functions serve` alongside `vercel dev`, relying on your *remote* Supabase instance. Ensure function environment variables are set correctly for this.

### 3. Deployment to Vercel & Supabase

1.  **Push to Git:** Ensure your code, including the `supabase` directory, is pushed to a Git repository (GitHub, GitLab, Bitbucket).
2.  **Deploy Supabase Function:**
    *   Link Supabase project if not done: `supabase login`, `supabase link --project-ref <your-project-id>`.
    *   Set secrets for the function: `supabase secrets set --env-file ./supabase/.env.local` (This securely uploads your SERVICE_ROLE_KEY etc. to Supabase for the functions).
    *   Deploy the function: `supabase functions deploy signup-with-instruments`.
3.  **Deploy Vercel Frontend:**
    *   Import project in Vercel dashboard from your Git repository.
    *   **Configure Vercel Environment Variables:**
        *   In the Vercel project settings, navigate to "Environment Variables".
        *   Add `SUPABASE_URL` with your Supabase Project URL.
        *   Add `SUPABASE_ANON_KEY` with your Supabase `anon` public key.
        *   Ensure these are available for **Production** (and Preview/Development).
        *   **DO NOT** add `SUPABASE_SERVICE_ROLE_KEY` here. It's only needed by the Supabase function itself, which reads it from the secrets you set via the Supabase CLI.
    *   **Deploy:** Vercel should automatically detect the setup and deploy the frontend. The frontend will call the deployed Supabase function (`/functions/v1/signup-with-instruments`) and the Vercel function (`/api/vercel-env`).

## Supabase Schema SQL

```sql
-- Users Table (Leveraging Supabase Auth)
-- Supabase automatically creates an auth.users table.
-- We'll create a public.Users table to store additional profile info
-- and link it via a foreign key.

CREATE TABLE public."Users" (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "firstName" TEXT,
    "lastName" TEXT,
    email TEXT UNIQUE -- Can store email here too for easier querying if needed, or rely on auth.users
);

-- Function to automatically create a user profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public."Users" (id, "firstName", "lastName", email)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.email
  );
  RETURN new;
END;
$$;

-- Trigger to call the function after a new user is inserted into auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Instruments Table
CREATE TABLE public."Instruments" (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Seed initial instruments (optional, can also be added via UI or signup)
-- The JS code uses an upsert during signup, so this seeding isn't strictly necessary
-- if users only use the predefined instruments during signup.
INSERT INTO public."Instruments" (name) VALUES
('Oboe'), ('Flute'), ('Clarinet'), ('Saxophone'), ('Trumpet'), ('Trombone'),
('French Horn'), ('Violin'), ('Viola'), ('Cello'), ('Bass'), ('Piano'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- UserInstruments Table (Many-to-Many relationship)
CREATE TABLE public."UserInstruments" (
    "userId" uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    "instrumentId" INT NOT NULL REFERENCES public."Instruments"(id) ON DELETE CASCADE,
    PRIMARY KEY ("userId", "instrumentId")
);

-- PracticeSessions Table
CREATE TABLE public."PracticeSessions" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" uuid NOT NULL REFERENCES public."Users"(id) ON DELETE CASCADE,
    "instrumentId" INT NOT NULL REFERENCES public."Instruments"(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    "totalMinutes" INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Categories Table
-- Note: Quoted identifiers used to match JavaScript access if needed, but standard SQL prefers snake_case
CREATE TABLE public."Categories" (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Seed initial categories (optional)
-- The JS code uses a predefined list, so this isn't strictly needed unless you want
-- categories managed purely via DB.
INSERT INTO public."Categories" (name) VALUES
('Warm-ups'), ('Technique'), ('Scales'), ('Etudes'), ('Repertoire'),
('Sight-reading'), ('Band Music'), ('Orchestra Music'), ('Theory'), ('Other')
ON CONFLICT (name) DO NOTHING;


-- PracticeSubsessions Table
-- Note: Quoted identifiers like 'notes' might be less standard; consider using snake_case 'notes_text'
CREATE TABLE public."PracticeSubsessions" (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId" uuid NOT NULL REFERENCES public."PracticeSessions"(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Consider FK to Categories.name if enforcing list
    minutes INT NOT NULL CHECK (minutes > 0),
    notes TEXT, -- Renamed from 'notes' for clarity, avoid potential keyword clash
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add Indexes for common lookups
CREATE INDEX idx_userinstruments_userid ON public."UserInstruments"("userId");
CREATE INDEX idx_practicesessions_userid_date ON public."PracticeSessions"("userId", date DESC);
CREATE INDEX idx_practicesessions_userid_instrumentid ON public."PracticeSessions"("userId", "instrumentId");
CREATE INDEX idx_practicesubsessions_sessionid ON public."PracticeSubsessions"("sessionId");

-- Enable Row Level Security (Example policies - Adapt as needed!)
-- IMPORTANT: Review and adapt these policies carefully based on your security needs.

ALTER TABLE public."Users" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Instruments" ENABLE ROW LEVEL SECURITY; -- RLS enabled later with public read
ALTER TABLE public."UserInstruments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PracticeSessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PracticeSubsessions" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Categories" ENABLE ROW LEVEL SECURITY; -- RLS enabled later with public read

-- Users: Can see their own profile
CREATE POLICY "Allow individual user read access" ON public."Users"
    FOR SELECT USING (auth.uid() = id);

-- Instruments: Policy changed - see Setup step 4
-- CREATE POLICY "Allow authenticated read access" ON public."Instruments"
--    FOR SELECT TO authenticated USING (true);

-- Categories: Policy changed - see Setup step 4
-- CREATE POLICY "Allow authenticated read access" ON public."Categories"
--    FOR SELECT TO authenticated USING (true);

-- UserInstruments: Users can see their own linked instruments
CREATE POLICY "Allow individual user read access" ON public."UserInstruments"
    FOR SELECT USING (auth.uid() = "userId");
-- Users can insert their own instrument links (Handled by Edge Function now, but policy is good practice)
CREATE POLICY "Allow individual user insert" ON public."UserInstruments"
    FOR INSERT WITH CHECK (auth.uid() = "userId");
-- Users can delete their own instrument links (optional - add if needed)
-- CREATE POLICY "Allow individual user delete" ON public."UserInstruments"
--     FOR DELETE USING (auth.uid() = "userId");

-- PracticeSessions: Users can see their own sessions
CREATE POLICY "Allow individual user read access" ON public."PracticeSessions"
    FOR SELECT USING (auth.uid() = "userId");
-- Users can insert their own sessions
CREATE POLICY "Allow individual user insert" ON public."PracticeSessions"
    FOR INSERT WITH CHECK (auth.uid() = "userId");
-- Users can update their own sessions (e.g., if totalMinutes calculation changes)
-- CREATE POLICY "Allow individual user update" ON public."PracticeSessions"
--    FOR UPDATE USING (auth.uid() = "userId");
-- Users can delete their own sessions (optional - add if needed)
-- CREATE POLICY "Allow individual user delete" ON public."PracticeSessions"
--     FOR DELETE USING (auth.uid() = "userId");

-- PracticeSubsessions: Users can see subsessions belonging to their sessions
-- This requires checking the userId on the parent PracticeSession
CREATE POLICY "Allow individual user read access" ON public."PracticeSubsessions"
    FOR SELECT USING (
      auth.uid() = (
        SELECT ps."userId"
        FROM public."PracticeSessions" ps
        WHERE ps.id = "sessionId"
      )
    );
-- Users can insert subsessions for their own sessions
CREATE POLICY "Allow individual user insert" ON public."PracticeSubsessions"
    FOR INSERT WITH CHECK (
      auth.uid() = (
        SELECT ps."userId"
        FROM public."PracticeSessions" ps
        WHERE ps.id = "sessionId"
      )
    );
-- Users can update their own subsessions (optional)
-- CREATE POLICY "Allow individual user update" ON public."PracticeSubsessions"
--    FOR UPDATE USING (auth.uid() = (SELECT ps."userId" FROM public."PracticeSessions" ps WHERE ps.id = "sessionId"));
-- Users can delete their own subsessions (optional)
-- CREATE POLICY "Allow individual user delete" ON public."PracticeSubsessions"
--     FOR DELETE USING (auth.uid() = (SELECT ps."userId" FROM public."PracticeSessions" ps WHERE ps.id = "sessionId"));
```

## Potential Improvements

*   **More Robust Error Handling:** Add more specific error messages and user feedback (client and server-side).
*   **Edge Function Error Handling:** Improve error handling within the edge function (e.g., attempt cleanup if linking fails after user creation).
*   **Edit/Delete Functionality:** Allow users to edit or delete existing practice sessions and subsessions.
*   **Instrument Management:** Add a dedicated section for users to add/remove instruments after sign-up.
*   **Category Management:** Allow users to define custom categories.
*   **Advanced Reporting:** More detailed charts and reports (e.g., progress over time per category).
*   **UI/UX Enhancements:** Improve styling, add loading indicators, potentially use a simple framework or component library.
*   **Input Validation:** Add more thorough client-side and potentially server-side (via RLS or edge functions) validation.
*   **Transaction:** Wrap the user creation and instrument linking in the Edge Function within a database transaction for atomicity (though Supabase Auth operations might complicate standard transactions).
