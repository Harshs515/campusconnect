-- ============================================================
--  CampusConnect - Complete PostgreSQL Database Setup
--  Run this file in psql or pgAdmin to set up everything
--  Usage: psql -U postgres -d campusconnect -f 01_schema.sql
-- ============================================================

-- ============================================================
-- STEP 1: CREATE DATABASE (run this separately as superuser)
-- ============================================================
-- CREATE DATABASE campusconnect;
-- \c campusconnect

-- ============================================================
-- STEP 2: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- STEP 3: DROP EXISTING TABLES (for clean reinstall)
-- ============================================================
DROP TABLE IF EXISTS messages        CASCADE;
DROP TABLE IF EXISTS event_rsvps     CASCADE;
DROP TABLE IF EXISTS post_comments   CASCADE;
DROP TABLE IF EXISTS post_likes      CASCADE;
DROP TABLE IF EXISTS posts           CASCADE;
DROP TABLE IF EXISTS connections     CASCADE;
DROP TABLE IF EXISTS alumni          CASCADE;
DROP TABLE IF EXISTS applications    CASCADE;
DROP TABLE IF EXISTS events          CASCADE;
DROP TABLE IF EXISTS jobs            CASCADE;
DROP TABLE IF EXISTS student_profiles CASCADE;
DROP TABLE IF EXISTS recruiter_profiles CASCADE;
DROP TABLE IF EXISTS profiles        CASCADE;

-- ============================================================
-- STEP 4: CORE TABLES
-- ============================================================

-- ── profiles (main users table) ──────────────────────────────
CREATE TABLE profiles (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            text        NOT NULL,
  email           text        NOT NULL UNIQUE,
  role            text        NOT NULL CHECK (role IN ('student', 'recruiter', 'admin')),
  password_hash   text        NOT NULL,
  avatar          text,
  bio             text,
  phone           text,
  location        text,
  profile_complete boolean   DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ── student_profiles ──────────────────────────────────────────
CREATE TABLE student_profiles (
  id           uuid    PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  branch       text,
  passing_year text,
  cgpa         numeric CHECK (cgpa >= 0 AND cgpa <= 10),
  github       text,
  linkedin     text,
  portfolio    text,
  resume_url   text,
  skills       text[]  DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ── recruiter_profiles ────────────────────────────────────────
CREATE TABLE recruiter_profiles (
  id           uuid  PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company      text,
  position     text,
  website      text,
  company_size text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ── jobs ─────────────────────────────────────────────────────
CREATE TABLE jobs (
  id               uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id     uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            text    NOT NULL,
  company          text    NOT NULL,
  description      text    NOT NULL,
  requirements     text[]  DEFAULT '{}',
  location         text    NOT NULL,
  salary           text    NOT NULL,
  job_type         text    NOT NULL CHECK (job_type IN ('Full-time', 'Part-time', 'Internship')),
  department       text    NOT NULL,
  min_cgpa         numeric DEFAULT 0 CHECK (min_cgpa >= 0),
  eligible_branches text[] DEFAULT '{}',
  deadline         date    NOT NULL,
  status           text    DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending')),
  skills           text[]  DEFAULT '{}',
  applicants_count integer DEFAULT 0,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── applications ─────────────────────────────────────────────
CREATE TABLE applications (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resume_url   text NOT NULL DEFAULT 'resume.pdf',
  cover_letter text,
  status       text DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'rejected', 'hired')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(job_id, student_id)
);

-- ── events ───────────────────────────────────────────────────
CREATE TABLE events (
  id            uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         text    NOT NULL,
  description   text    NOT NULL,
  event_date    date    NOT NULL,
  event_time    text    NOT NULL,
  location      text    NOT NULL,
  event_type    text    NOT NULL CHECK (event_type IN ('Placement Drive', 'Workshop', 'Seminar', 'Interview')),
  organizer_id  uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_attendees integer,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- ── event_rsvps ──────────────────────────────────────────────
CREATE TABLE event_rsvps (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- ── posts ─────────────────────────────────────────────────────
CREATE TABLE posts (
  id         uuid   PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id  uuid   NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text   NOT NULL,
  post_type  text   DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'job', 'project', 'achievement', 'meme')),
  tags       text[] DEFAULT '{}',
  images     text[] DEFAULT '{}',
  visibility text   DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'branch')),
  likes      text[] DEFAULT '{}',   -- array of user IDs who liked
  shares     text[] DEFAULT '{}',   -- array of user IDs who shared
  bookmarks  text[] DEFAULT '{}',   -- array of user IDs who bookmarked
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── post_likes (normalized version) ──────────────────────────
CREATE TABLE post_likes (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ── post_comments ─────────────────────────────────────────────
CREATE TABLE post_comments (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  likes      text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── connections ───────────────────────────────────────────────
CREATE TABLE connections (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connected_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status            text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, connected_user_id),
  CHECK (user_id <> connected_user_id)
);

-- ── messages ──────────────────────────────────────────────────
CREATE TABLE messages (
  id          uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     text    NOT NULL,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  CHECK (sender_id <> receiver_id)
);

-- ── alumni ────────────────────────────────────────────────────
CREATE TABLE alumni (
  id               uuid    PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id       uuid    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id           uuid    REFERENCES jobs(id) ON DELETE SET NULL,
  application_id   uuid    REFERENCES applications(id) ON DELETE SET NULL,
  placement_date   date    NOT NULL,
  salary           numeric CHECK (salary >= 0),
  package_currency text    DEFAULT 'INR',
  company          text    NOT NULL,
  designation      text,
  location         text,
  placement_type   text    NOT NULL CHECK (placement_type IN ('Full-time', 'Internship', 'Placement')),
  status           text    DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned')),
  notes            text,
  created_by       uuid    NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE(student_id, company)
);

-- ============================================================
-- STEP 5: INDEXES (for performance)
-- ============================================================
CREATE INDEX idx_profiles_email      ON profiles(email);
CREATE INDEX idx_profiles_role       ON profiles(role);

CREATE INDEX idx_jobs_recruiter      ON jobs(recruiter_id);
CREATE INDEX idx_jobs_status         ON jobs(status);
CREATE INDEX idx_jobs_deadline       ON jobs(deadline);
CREATE INDEX idx_jobs_type           ON jobs(job_type);

CREATE INDEX idx_applications_job    ON applications(job_id);
CREATE INDEX idx_applications_student ON applications(student_id);
CREATE INDEX idx_applications_status ON applications(status);

CREATE INDEX idx_events_date         ON events(event_date);
CREATE INDEX idx_events_organizer    ON events(organizer_id);
CREATE INDEX idx_event_rsvps_event   ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user    ON event_rsvps(user_id);

CREATE INDEX idx_posts_author        ON posts(author_id);
CREATE INDEX idx_posts_created       ON posts(created_at DESC);
CREATE INDEX idx_posts_type          ON posts(post_type);

CREATE INDEX idx_post_likes_post     ON post_likes(post_id);
CREATE INDEX idx_post_likes_user     ON post_likes(user_id);
CREATE INDEX idx_post_comments_post  ON post_comments(post_id);
CREATE INDEX idx_post_comments_author ON post_comments(author_id);

CREATE INDEX idx_connections_user    ON connections(user_id);
CREATE INDEX idx_connections_connected ON connections(connected_user_id);
CREATE INDEX idx_connections_status  ON connections(status);

CREATE INDEX idx_messages_sender     ON messages(sender_id);
CREATE INDEX idx_messages_receiver   ON messages(receiver_id);
CREATE INDEX idx_messages_created    ON messages(created_at);

CREATE INDEX idx_alumni_student      ON alumni(student_id);
CREATE INDEX idx_alumni_company      ON alumni(company);
CREATE INDEX idx_alumni_date         ON alumni(placement_date DESC);
CREATE INDEX idx_alumni_status       ON alumni(status);
CREATE INDEX idx_alumni_created_by   ON alumni(created_by);

-- ============================================================
-- STEP 6: TRIGGERS (auto-update updated_at)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at          BEFORE UPDATE ON profiles          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_student_profiles_updated_at  BEFORE UPDATE ON student_profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_recruiter_profiles_updated_at BEFORE UPDATE ON recruiter_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated_at              BEFORE UPDATE ON jobs              FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated_at      BEFORE UPDATE ON applications      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_events_updated_at            BEFORE UPDATE ON events            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_updated_at             BEFORE UPDATE ON posts             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_post_comments_updated_at     BEFORE UPDATE ON post_comments     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_connections_updated_at       BEFORE UPDATE ON connections       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_alumni_updated_at            BEFORE UPDATE ON alumni            FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- STEP 7: TRIGGER - auto-increment applicants_count on jobs
-- ============================================================
CREATE OR REPLACE FUNCTION update_job_applicant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE jobs SET applicants_count = applicants_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE jobs SET applicants_count = GREATEST(applicants_count - 1, 0) WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_application_count
  AFTER INSERT OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_job_applicant_count();

-- ============================================================
-- STEP 8: VIEWS (useful for the app)
-- ============================================================

-- Full job listing with recruiter name
CREATE OR REPLACE VIEW v_jobs AS
SELECT
  j.*,
  p.name  AS recruiter_name,
  p.email AS recruiter_email
FROM jobs j
JOIN profiles p ON p.id = j.recruiter_id;

-- Applications with student + job info
CREATE OR REPLACE VIEW v_applications AS
SELECT
  a.*,
  p.name    AS student_name,
  p.email   AS student_email,
  sp.branch AS student_branch,
  sp.cgpa   AS student_cgpa,
  j.title   AS job_title,
  j.company AS job_company
FROM applications a
JOIN profiles    p  ON p.id  = a.student_id
LEFT JOIN student_profiles sp ON sp.id = a.student_id
JOIN jobs        j  ON j.id  = a.job_id;

-- Alumni with student profile
CREATE OR REPLACE VIEW v_alumni AS
SELECT
  al.*,
  p.name  AS student_name,
  p.email AS student_email,
  sp.branch,
  sp.passing_year,
  sp.cgpa
FROM alumni al
JOIN profiles       p  ON p.id  = al.student_id
LEFT JOIN student_profiles sp ON sp.id = al.student_id;

-- Events with RSVP count
CREATE OR REPLACE VIEW v_events AS
SELECT
  e.*,
  p.name       AS organizer_name,
  COUNT(er.id) AS rsvp_count
FROM events e
JOIN profiles   p  ON p.id = e.organizer_id
LEFT JOIN event_rsvps er ON er.event_id = e.id
GROUP BY e.id, p.name;

-- Posts with author info and counts
CREATE OR REPLACE VIEW v_posts AS
SELECT
  po.*,
  p.name    AS author_name,
  p.role    AS author_role,
  p.avatar  AS author_avatar,
  (SELECT COUNT(*) FROM post_likes    pl WHERE pl.post_id = po.id) AS like_count,
  (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = po.id) AS comment_count
FROM posts po
JOIN profiles p ON p.id = po.author_id;

-- ============================================================
-- SETUP COMPLETE
-- ============================================================
SELECT 'Schema created successfully! Run 02_seed_data.sql next.' AS status;
