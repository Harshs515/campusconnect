-- ============================================================
--  CampusConnect - Utility Queries
--  Helpful queries for development and maintenance
-- ============================================================

-- ── Quick Stats ───────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM profiles)      AS total_users,
  (SELECT COUNT(*) FROM profiles WHERE role='student')   AS students,
  (SELECT COUNT(*) FROM profiles WHERE role='recruiter') AS recruiters,
  (SELECT COUNT(*) FROM profiles WHERE role='admin')     AS admins,
  (SELECT COUNT(*) FROM jobs WHERE status='active')      AS active_jobs,
  (SELECT COUNT(*) FROM applications)  AS total_applications,
  (SELECT COUNT(*) FROM applications WHERE status='hired') AS placed_students,
  (SELECT COUNT(*) FROM events)        AS total_events,
  (SELECT COUNT(*) FROM alumni)        AS alumni_records,
  (SELECT COUNT(*) FROM messages)      AS total_messages,
  (SELECT COUNT(*) FROM posts)         AS total_posts;

-- ── Reset a user's password to "password" ─────────────────────
-- UPDATE profiles
-- SET password_hash = encode(digest('password','sha256'),'hex')
-- WHERE email = 'user@example.com';

-- ── Make a user an admin ──────────────────────────────────────
-- UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';

-- ── See all applications with details ─────────────────────────
SELECT
  a.id,
  p.name   AS student,
  j.title  AS job,
  j.company,
  a.status,
  a.created_at::date AS applied_on
FROM applications a
JOIN profiles p ON p.id = a.student_id
JOIN jobs j     ON j.id = a.job_id
ORDER BY a.created_at DESC;

-- ── Top hiring companies ──────────────────────────────────────
SELECT company, COUNT(*) AS application_count
FROM jobs j
JOIN applications a ON a.job_id = j.id
GROUP BY company
ORDER BY application_count DESC
LIMIT 10;

-- ── Placement statistics ──────────────────────────────────────
SELECT
  COUNT(*)                                    AS total_alumni,
  COUNT(*) FILTER (WHERE status='active')     AS currently_employed,
  ROUND(AVG(salary)/100000, 2)               AS avg_package_lpa,
  MAX(salary)/100000                          AS highest_package_lpa,
  MIN(salary)/100000                          AS lowest_package_lpa
FROM alumni
WHERE salary IS NOT NULL;

-- ── Students not yet placed ────────────────────────────────────
SELECT p.name, p.email, sp.branch, sp.cgpa
FROM profiles p
JOIN student_profiles sp ON sp.id = p.id
WHERE p.role = 'student'
  AND p.id NOT IN (SELECT student_id FROM alumni)
ORDER BY sp.cgpa DESC;

-- ── Events with attendance ────────────────────────────────────
SELECT
  e.title,
  e.event_date,
  e.event_type,
  COUNT(er.id)  AS attendees,
  e.max_attendees,
  p.name        AS organizer
FROM events e
LEFT JOIN event_rsvps er ON er.event_id = e.id
JOIN profiles p ON p.id = e.organizer_id
GROUP BY e.id, p.name
ORDER BY e.event_date;

-- ── Messages between two users ────────────────────────────────
-- SELECT m.content, m.read, m.created_at,
--        s.name AS sender, r.name AS receiver
-- FROM messages m
-- JOIN profiles s ON s.id = m.sender_id
-- JOIN profiles r ON r.id = m.receiver_id
-- WHERE (m.sender_id='<user1-id>' AND m.receiver_id='<user2-id>')
--    OR (m.sender_id='<user2-id>' AND m.receiver_id='<user1-id>')
-- ORDER BY m.created_at;

-- ── Full database reset (DANGEROUS - deletes all data!) ───────
-- DELETE FROM messages;
-- DELETE FROM alumni;
-- DELETE FROM post_comments;
-- DELETE FROM post_likes;
-- DELETE FROM posts;
-- DELETE FROM event_rsvps;
-- DELETE FROM connections;
-- DELETE FROM applications;
-- DELETE FROM events;
-- DELETE FROM jobs;
-- DELETE FROM student_profiles;
-- DELETE FROM recruiter_profiles;
-- DELETE FROM profiles;
