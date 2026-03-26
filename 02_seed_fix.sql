-- Fix missing posts and post_likes
-- Run this after 02_seed_data.sql

INSERT INTO posts (id, author_id, content, post_type, tags, likes, created_at) VALUES
('dddddddd-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000001',
 'Just completed my full-stack placement portal project! Built with React, Node.js, TypeScript, and PostgreSQL. The project handles job postings, applications, and real-time messaging. Check it out on GitHub and let me know your thoughts! #React #NodeJS #FullStack #WebDevelopment #OpenToWork',
 'project', ARRAY['react', 'nodejs', 'fullstack', 'webdevelopment'],
 ARRAY['22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003'],
 now() - interval '2 days'),

('dddddddd-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000001',
 'TechCorp Solutions is HIRING! Software Engineers for our Bangalore office. Role: Software Engineer, CTC: 8-12 LPA, Location: Bangalore. Eligibility: CSE/IT 2025 batch, 7.0+ CGPA. Apply through CampusConnect or DM me directly. We have 10 openings! #Hiring #SoftwareEngineer #CampusPlacement',
 'job', ARRAY['hiring', 'softwareengineer', 'campusplacement'],
 ARRAY['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000006'],
 now() - interval '3 days'),

('dddddddd-0000-0000-0000-000000000003',
 '11111111-0000-0000-0000-000000000002',
 'PLACED! Thrilled to announce I cleared the ML Engineer interview at AI Innovations Ltd! 4 rounds, 2 months of preparation, countless LeetCode problems... but it was all worth it! Thank you to everyone who supported me! #Achievement #Placed #MLEngineer #NeverGiveUp',
 'achievement', ARRAY['achievement', 'placed', 'mlengineer'],
 ARRAY['11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003'],
 now() - interval '5 days'),

('dddddddd-0000-0000-0000-000000000004',
 '11111111-0000-0000-0000-000000000003',
 'How I went from 0 to landing a Flutter developer role in 8 months: 1) Started with Dart basics (2 weeks), 2) Built 5 personal projects, 3) Contributed to open-source Flutter packages, 4) Networked on LinkedIn daily, 5) Applied to 30+ companies, got 8 interviews. The key? Consistency over intensity. Code every day! #Flutter #MobileDev #CareerAdvice #PlacementTips',
 'text', ARRAY['flutter', 'mobiledev', 'careeradvice', 'placementtips'],
 ARRAY['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000006'],
 now() - interval '7 days'),

('dddddddd-0000-0000-0000-000000000005',
 '22222222-0000-0000-0000-000000000002',
 'StartupNest is looking for Backend Developer Interns! 6-month PAID internship, Rs 20,000/month, Pune (Hybrid). You will work on scalable microservices on AWS, real payment integrations, production code serving 100K+ users. We care about what you have built, not your GPA. DM me your GitHub! #Internship #BackendDev #StartupLife #Python #Django',
 'job', ARRAY['internship', 'backenddev', 'startuplife', 'python'],
 ARRAY['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003'],
 now() - interval '4 days');

INSERT INTO post_comments (post_id, author_id, content, created_at) VALUES
('dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
 'Impressive work Alex! This is exactly the kind of project we look for at TechCorp. Have you applied yet?',
 now() - interval '1 day 20 hours'),
('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
 'Amazing! Can you share the GitHub link? Would love to contribute!',
 now() - interval '1 day 18 hours'),
('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003',
 'This looks great! How did you handle real-time updates in the messaging system?',
 now() - interval '1 day 16 hours'),
('dddddddd-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
 'Congratulations Sneha!! So well deserved! You are going to crush it there!',
 now() - interval '4 days 22 hours'),
('dddddddd-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003',
 'Welcome to the AI Innovations family, Sneha! We are so excited to have you!',
 now() - interval '4 days 20 hours'),
('dddddddd-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001',
 'Congratulations! This makes the entire placement cell proud.',
 now() - interval '4 days 18 hours');

INSERT INTO post_likes (post_id, user_id) VALUES
('dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002'),
('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003'),
('dddddddd-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002'),
('dddddddd-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003'),
('dddddddd-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006'),
('dddddddd-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003'),
('dddddddd-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001'),
('dddddddd-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003');

SELECT 'Posts inserted: ' || COUNT(*) FROM posts;
SELECT 'Post likes inserted: ' || COUNT(*) FROM post_likes;
SELECT 'Post comments inserted: ' || COUNT(*) FROM post_comments;
SELECT 'Setup complete! All tables loaded.' AS status;
