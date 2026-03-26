-- ============================================================
--  CampusConnect - Seed Data
--  Run AFTER 01_schema.sql
--  Usage: psql -U postgres -d campusconnect -f 02_seed_data.sql
-- ============================================================

-- ============================================================
-- USERS / PROFILES
-- All passwords are SHA-256 hash of "password"
-- Password = "password"
-- ============================================================
INSERT INTO profiles (id, name, email, role, password_hash, bio, phone, location, profile_complete) VALUES
-- Students
('11111111-0000-0000-0000-000000000001', 'Alex Kumar',        'student@demo.com',    'student',   encode(digest('password','sha256'),'hex'), 'Final year CSE student | Full Stack Developer | Open Source Contributor',  '+91-9876543210', 'Bangalore, India',  true),
('11111111-0000-0000-0000-000000000002', 'Sneha Patel',       'sneha@student.edu',   'student',   encode(digest('password','sha256'),'hex'), 'Data Science enthusiast | ML researcher | Kaggle competitor',              '+91-9123456780', 'Mumbai, India',     true),
('11111111-0000-0000-0000-000000000003', 'Arjun Mehta',       'arjun@student.edu',   'student',   encode(digest('password','sha256'),'hex'), 'Mobile app developer | Flutter & React Native | Building the future',      '+91-9234567890', 'Hyderabad, India',  true),
('11111111-0000-0000-0000-000000000004', 'Ananya Singh',      'ananya@student.edu',  'student',   encode(digest('password','sha256'),'hex'), 'UI/UX Designer | Making interfaces that people love to use',               '+91-9345678901', 'Pune, India',       true),
('11111111-0000-0000-0000-000000000005', 'Rohan Gupta',       'rohan@student.edu',   'student',   encode(digest('password','sha256'),'hex'), 'Competitive programmer | ACM ICPC | LeetCode 2000+',                       '+91-9456789012', 'Delhi, India',      true),
('11111111-0000-0000-0000-000000000006', 'Kavya Reddy',       'kavya@student.edu',   'student',   encode(digest('password','sha256'),'hex'), 'Backend developer | Python/Django | PostgreSQL | DevOps enthusiast',       '+91-9567890123', 'Chennai, India',    true),
('11111111-0000-0000-0000-000000000007', 'Preet Sharma',      'preet@student.edu',   'student',   encode(digest('password','sha256'),'hex'), 'Cloud computing enthusiast | AWS certified | DevOps learner',              '+91-9678901234', 'Kolkata, India',    false),
('11111111-0000-0000-0000-000000000008', 'Divya Nair',        'divya@student.edu',   'student',   encode(digest('password','sha256'),'hex'), 'Cybersecurity researcher | CTF player | Bug bounty hunter',                '+91-9789012345', 'Kochi, India',      false),

-- Recruiters
('22222222-0000-0000-0000-000000000001', 'Priya Sharma',      'recruiter@demo.com',  'recruiter', encode(digest('password','sha256'),'hex'), 'HR Manager at TechCorp | Passionate about connecting talent with opportunities', '+91-8012345678', 'Bangalore, India',  true),
('22222222-0000-0000-0000-000000000002', 'Vikram Nair',       'vikram@startup.com',  'recruiter', encode(digest('password','sha256'),'hex'), 'CTO & Co-founder at StartupNest | Looking for passionate builders',        '+91-8123456789', 'Pune, India',       true),
('22222222-0000-0000-0000-000000000003', 'Meera Krishnan',    'meera@aiinnovations.com', 'recruiter', encode(digest('password','sha256'),'hex'), 'Talent Acquisition at AI Innovations | Looking for ML engineers',      '+91-8234567890', 'Bangalore, India',  true),
('22222222-0000-0000-0000-000000000004', 'Ravi Verma',        'ravi@dataflow.com',   'recruiter', encode(digest('password','sha256'),'hex'), 'Head of Hiring at DataFlow Analytics | Data-driven talent acquisition',    '+91-8345678901', 'Mumbai, India',     true),

-- Admin
('33333333-0000-0000-0000-000000000001', 'Rahul Verma',       'admin@demo.com',      'admin',     encode(digest('password','sha256'),'hex'), 'Placement Coordinator | Helping students build their careers',             '+91-7012345678', 'Bangalore, India',  true);

-- ── Student Profiles ──────────────────────────────────────────
INSERT INTO student_profiles (id, branch, passing_year, cgpa, github, linkedin, portfolio, skills) VALUES
('11111111-0000-0000-0000-000000000001', 'Computer Science',     '2025', 8.7, 'github.com/alexkumar',  'linkedin.com/in/alexkumar',  'alexkumar.dev',    ARRAY['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker']),
('11111111-0000-0000-0000-000000000002', 'Information Technology','2025', 9.1, 'github.com/snehapatel', 'linkedin.com/in/snehapatel', 'snehapatel.io',    ARRAY['Python', 'TensorFlow', 'SQL', 'Tableau', 'Machine Learning']),
('11111111-0000-0000-0000-000000000003', 'Computer Science',     '2025', 8.2, 'github.com/arjunmehta', 'linkedin.com/in/arjunmehta', 'arjunmehta.com',   ARRAY['Flutter', 'React Native', 'Dart', 'Firebase', 'iOS']),
('11111111-0000-0000-0000-000000000004', 'Computer Science',     '2026', 7.9, 'github.com/ananyasingh','linkedin.com/in/ananyasingh','ananyasingh.design',ARRAY['Figma', 'Adobe XD', 'CSS', 'UI/UX', 'Prototyping']),
('11111111-0000-0000-0000-000000000005', 'Computer Science',     '2025', 9.4, 'github.com/rohangupta', 'linkedin.com/in/rohangupta', NULL,               ARRAY['C++', 'Algorithms', 'Data Structures', 'Competitive Programming']),
('11111111-0000-0000-0000-000000000006', 'Information Technology','2025', 8.5, 'github.com/kavyareddy', 'linkedin.com/in/kavyareddy', NULL,               ARRAY['Python', 'Django', 'PostgreSQL', 'Docker', 'Linux']),
('11111111-0000-0000-0000-000000000007', 'Electronics',          '2026', 7.2, NULL,                    NULL,                          NULL,               ARRAY['AWS', 'Cloud Computing', 'Linux', 'Python']),
('11111111-0000-0000-0000-000000000008', 'Computer Science',     '2025', 8.0, 'github.com/divyanair',  'linkedin.com/in/divyanair',  NULL,               ARRAY['Python', 'Cybersecurity', 'Kali Linux', 'Networking']);

-- ── Recruiter Profiles ────────────────────────────────────────
INSERT INTO recruiter_profiles (id, company, position, website, company_size) VALUES
('22222222-0000-0000-0000-000000000001', 'TechCorp Solutions',   'HR Manager',              'techcorp.com',        '1000-5000'),
('22222222-0000-0000-0000-000000000002', 'StartupNest',          'CTO & Co-founder',        'startupnest.in',      '11-50'),
('22222222-0000-0000-0000-000000000003', 'AI Innovations Ltd',   'Talent Acquisition Lead', 'aiinnovations.com',   '51-200'),
('22222222-0000-0000-0000-000000000004', 'DataFlow Analytics',   'Head of Hiring',          'dataflow.io',         '201-500');

-- ============================================================
-- JOBS
-- ============================================================
INSERT INTO jobs (id, recruiter_id, title, company, description, requirements, location, salary, job_type, department, min_cgpa, eligible_branches, deadline, status, skills, applicants_count) VALUES
('aaaaaaaa-0000-0000-0000-000000000001',
 '22222222-0000-0000-0000-000000000001',
 'Software Engineer',
 'TechCorp Solutions',
 'We are looking for a passionate Software Engineer to join our growing team. You will work on cutting-edge projects using modern technologies including React, Node.js, and PostgreSQL. You will collaborate with a talented team to build scalable web applications.',
 ARRAY['Bachelor''s degree in CS or related field', '1+ years of experience with React/Node.js', 'Strong problem-solving skills', 'Experience with REST APIs and databases'],
 'Bangalore, India', '₹8-12 LPA', 'Full-time', 'Engineering',
 7.0, ARRAY['CSE', 'IT', 'ECE'],
 '2025-06-30', 'active', ARRAY['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'], 45),

('aaaaaaaa-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000004',
 'Data Analyst',
 'DataFlow Analytics',
 'Join our data team to analyze complex datasets and provide actionable insights to drive business decisions. You will work with large-scale data pipelines and build dashboards for stakeholders.',
 ARRAY['Strong analytical and quantitative skills', 'Proficiency in SQL and Python', 'Experience with BI tools (Tableau/Power BI)', 'Understanding of statistical methods'],
 'Mumbai, India', '₹6-10 LPA', 'Full-time', 'Data Science',
 7.5, ARRAY['CSE', 'IT', 'Mathematics', 'Statistics'],
 '2025-05-31', 'active', ARRAY['Python', 'SQL', 'Tableau', 'Excel', 'Power BI'], 32),

('aaaaaaaa-0000-0000-0000-000000000003',
 '22222222-0000-0000-0000-000000000001',
 'UI/UX Designer',
 'TechCorp Solutions',
 'Design intuitive and beautiful user interfaces for web and mobile applications. Collaborate closely with product and engineering teams to deliver pixel-perfect, user-centric experiences.',
 ARRAY['Portfolio showcasing UI/UX design work', 'Proficiency in Figma and Adobe XD', 'Understanding of design systems', 'Experience with user research and testing'],
 'Hyderabad, India', '₹5-8 LPA', 'Full-time', 'Design',
 6.5, ARRAY['CSE', 'IT', 'Design', 'Architecture'],
 '2025-06-15', 'active', ARRAY['Figma', 'Adobe XD', 'Sketch', 'CSS', 'Prototyping'], 28),

('aaaaaaaa-0000-0000-0000-000000000004',
 '22222222-0000-0000-0000-000000000002',
 'Backend Developer Intern',
 'StartupNest',
 '6-month paid internship working on real production systems. You will build scalable microservices, integrate payment gateways, and write code that millions of users will interact with. Great learning opportunity in a fast-paced environment.',
 ARRAY['Knowledge of Python or Node.js', 'Understanding of REST APIs', 'Basic knowledge of databases (SQL/NoSQL)', 'Eagerness to learn and grow'],
 'Pune, India', '₹20,000-25,000/month', 'Internship', 'Engineering',
 6.0, ARRAY['CSE', 'IT', 'ECE', 'EEE'],
 '2025-04-30', 'active', ARRAY['Python', 'Django', 'PostgreSQL', 'Docker', 'Redis'], 67),

('aaaaaaaa-0000-0000-0000-000000000005',
 '22222222-0000-0000-0000-000000000003',
 'Machine Learning Engineer',
 'AI Innovations Ltd',
 'Work on cutting-edge ML models and deploy them to production at scale. You will join a world-class AI research team working on NLP, computer vision, and recommendation systems.',
 ARRAY['Strong Python skills', 'Deep knowledge of ML/DL frameworks', 'Mathematics background (linear algebra, probability)', 'Experience with model deployment'],
 'Bangalore, India', '₹12-18 LPA', 'Full-time', 'AI/ML',
 8.0, ARRAY['CSE', 'IT', 'Mathematics'],
 '2025-07-01', 'active', ARRAY['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'MLflow'], 19),

('aaaaaaaa-0000-0000-0000-000000000006',
 '22222222-0000-0000-0000-000000000002',
 'Flutter Developer',
 'StartupNest',
 'Build cross-platform mobile applications using Flutter. You will work on our flagship product used by 100K+ users. Great opportunity to own features end-to-end.',
 ARRAY['Experience with Flutter and Dart', 'Published apps on Play Store/App Store is a plus', 'Understanding of mobile UI/UX principles', 'Knowledge of REST APIs'],
 'Remote', '₹7-10 LPA', 'Full-time', 'Mobile',
 7.0, ARRAY['CSE', 'IT'],
 '2025-05-15', 'active', ARRAY['Flutter', 'Dart', 'Firebase', 'REST APIs', 'Git'], 23),

('aaaaaaaa-0000-0000-0000-000000000007',
 '22222222-0000-0000-0000-000000000004',
 'Data Science Intern',
 'DataFlow Analytics',
 '3-month internship where you will work with real business data, build predictive models, and present findings to leadership. Perfect launchpad for a data science career.',
 ARRAY['Knowledge of Python and pandas/numpy', 'Basic understanding of ML algorithms', 'Good communication skills', 'Available for 3 months full-time'],
 'Mumbai, India', '₹15,000-18,000/month', 'Internship', 'Data Science',
 7.0, ARRAY['CSE', 'IT', 'Mathematics', 'Statistics'],
 '2025-04-15', 'active', ARRAY['Python', 'Pandas', 'NumPy', 'Matplotlib', 'Scikit-learn'], 41);

-- ============================================================
-- APPLICATIONS
-- ============================================================
INSERT INTO applications (id, job_id, student_id, resume_url, cover_letter, status, created_at) VALUES
-- Alex applied for Software Engineer (shortlisted)
('bbbbbbbb-0000-0000-0000-000000000001',
 'aaaaaaaa-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000001',
 'resumes/alex_kumar_resume.pdf',
 'I am passionate about software development and have built several full-stack projects. I believe my experience with React and Node.js makes me a great fit for this role.',
 'shortlisted', now() - interval '10 days'),

-- Alex applied for UI/UX (applied)
('bbbbbbbb-0000-0000-0000-000000000002',
 'aaaaaaaa-0000-0000-0000-000000000003',
 '11111111-0000-0000-0000-000000000001',
 'resumes/alex_kumar_resume.pdf',
 'Though my primary focus is backend, I have strong frontend skills and love creating great user experiences.',
 'applied', now() - interval '5 days'),

-- Sneha applied for ML Engineer (hired)
('bbbbbbbb-0000-0000-0000-000000000003',
 'aaaaaaaa-0000-0000-0000-000000000005',
 '11111111-0000-0000-0000-000000000002',
 'resumes/sneha_patel_resume.pdf',
 'I have been working on ML projects for 2 years, published 2 research papers, and I am extremely passionate about AI.',
 'hired', now() - interval '30 days'),

-- Sneha applied for Data Analyst (shortlisted)
('bbbbbbbb-0000-0000-0000-000000000004',
 'aaaaaaaa-0000-0000-0000-000000000002',
 '11111111-0000-0000-0000-000000000002',
 'resumes/sneha_patel_resume.pdf',
 'Data analysis is my forte. I have worked on several Kaggle competitions and have strong SQL and Python skills.',
 'shortlisted', now() - interval '15 days'),

-- Arjun applied for Flutter Developer (applied)
('bbbbbbbb-0000-0000-0000-000000000005',
 'aaaaaaaa-0000-0000-0000-000000000006',
 '11111111-0000-0000-0000-000000000003',
 'resumes/arjun_mehta_resume.pdf',
 'Flutter is my primary framework. I have published 3 apps on the Play Store with 10K+ downloads combined.',
 'applied', now() - interval '3 days'),

-- Ananya applied for UI/UX (shortlisted)
('bbbbbbbb-0000-0000-0000-000000000006',
 'aaaaaaaa-0000-0000-0000-000000000003',
 '11111111-0000-0000-0000-000000000004',
 'resumes/ananya_singh_resume.pdf',
 'UI/UX is my passion. I have redesigned several apps and my portfolio showcases diverse design work.',
 'shortlisted', now() - interval '8 days'),

-- Rohan applied for Software Engineer (rejected)
('bbbbbbbb-0000-0000-0000-000000000007',
 'aaaaaaaa-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000005',
 'resumes/rohan_gupta_resume.pdf',
 'I am a competitive programmer with strong DSA skills looking to transition into product development.',
 'rejected', now() - interval '20 days'),

-- Kavya applied for Backend Intern (applied)
('bbbbbbbb-0000-0000-0000-000000000008',
 'aaaaaaaa-0000-0000-0000-000000000004',
 '11111111-0000-0000-0000-000000000006',
 'resumes/kavya_reddy_resume.pdf',
 'I have been working with Django and PostgreSQL for 1 year and built a complete e-commerce backend as a project.',
 'applied', now() - interval '2 days'),

-- Kavya applied for Data Science Intern (applied)
('bbbbbbbb-0000-0000-0000-000000000009',
 'aaaaaaaa-0000-0000-0000-000000000007',
 '11111111-0000-0000-0000-000000000006',
 'resumes/kavya_reddy_resume.pdf',
 'I am interested in expanding my skills from backend to data science.',
 'applied', now() - interval '1 day');

-- ============================================================
-- EVENTS
-- ============================================================
INSERT INTO events (id, title, description, event_date, event_time, location, event_type, organizer_id, max_attendees) VALUES
('cccccccc-0000-0000-0000-000000000001',
 'Google Campus Placement Drive 2025',
 'Google is visiting our campus for the annual placement drive. Open to final year students from CSE, IT branches. Multiple roles: SWE, SRE, Data Engineer. Prepare for coding rounds and system design interviews.',
 CURRENT_DATE + 15, '10:00 AM', 'Main Auditorium, Block A',
 'Placement Drive', '33333333-0000-0000-0000-000000000001', 200),

('cccccccc-0000-0000-0000-000000000002',
 'Resume Building & LinkedIn Optimization Workshop',
 'Learn how to craft a compelling resume and optimize your LinkedIn profile. Industry experts from top tech companies will share tips, do live reviews, and answer questions.',
 CURRENT_DATE + 8, '2:00 PM', 'Seminar Hall B, Block C',
 'Workshop', '33333333-0000-0000-0000-000000000001', 100),

('cccccccc-0000-0000-0000-000000000003',
 'Microsoft Technical Interview Preparation',
 'Intensive mock interview sessions covering DSA, system design, and behavioral questions. Conducted by Microsoft engineers and alumni. Limited seats.',
 CURRENT_DATE + 22, '11:00 AM', 'Computer Lab 2, Block B',
 'Interview', '22222222-0000-0000-0000-000000000001', 50),

('cccccccc-0000-0000-0000-000000000004',
 'AI & Machine Learning Industry Seminar',
 'Industry leaders from Google, Microsoft, and AI startups discuss the future of AI, current research trends, and career opportunities. Followed by networking session.',
 CURRENT_DATE + 35, '3:00 PM', 'Conference Hall, Admin Block',
 'Seminar', '22222222-0000-0000-0000-000000000003', 300),

('cccccccc-0000-0000-0000-000000000005',
 'AWS Cloud Computing Hands-On Workshop',
 'Hands-on workshop covering EC2, S3, Lambda, RDS, and deployment pipelines. Participants will build and deploy a complete application on AWS. AWS Free Tier accounts required.',
 CURRENT_DATE + 18, '9:00 AM', 'Computer Lab 1, Block B',
 'Workshop', '33333333-0000-0000-0000-000000000001', 60),

('cccccccc-0000-0000-0000-000000000006',
 'StartupNest Campus Hiring Drive',
 'StartupNest is hiring Backend Developers and Flutter Developers. Work on real products used by 100K+ users. Great culture, competitive pay, fast growth.',
 CURRENT_DATE + 12, '1:00 PM', 'Placement Cell Conference Room',
 'Placement Drive', '22222222-0000-0000-0000-000000000002', 80);

-- ── RSVPs ─────────────────────────────────────────────────────
INSERT INTO event_rsvps (event_id, user_id) VALUES
('cccccccc-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001'),
('cccccccc-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002'),
('cccccccc-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005'),
('cccccccc-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001'),
('cccccccc-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003'),
('cccccccc-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004'),
('cccccccc-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001'),
('cccccccc-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002'),
('cccccccc-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002'),
('cccccccc-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000006'),
('cccccccc-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000007'),
('cccccccc-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003'),
('cccccccc-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006');

-- ============================================================
-- POSTS (Social Feed)
-- ============================================================
INSERT INTO posts (id, author_id, content, post_type, tags, likes, created_at) VALUES
('dddddddd-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000001',
 E'🚀 Just completed my full-stack placement portal project!\n\nBuilt with React, Node.js, TypeScript, and PostgreSQL. The project handles job postings, applications, and real-time messaging.\n\nKey features:\n• Role-based authentication (Student, Recruiter, Admin)\n• Real-time messaging with WebSockets\n• Resume upload and parsing\n• Analytics dashboard\n\nCheck it out on GitHub and let me know your thoughts!\n\n#React #NodeJS #FullStack #WebDevelopment #OpenToWork',
 'project', ARRAY['react', 'nodejs', 'fullstack', 'webdevelopment'],
 ARRAY['22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003'],
 now() - interval '2 days'),

('dddddddd-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000001',
 E'📢 TechCorp Solutions is HIRING! Software Engineers for our Bangalore office.\n\n✅ Role: Software Engineer\n💰 CTC: ₹8-12 LPA\n📍 Location: Bangalore\n🎓 Eligibility: CSE/IT 2025 batch, 7.0+ CGPA\n\nSkills needed: React, Node.js, TypeScript\n\nApply through CampusConnect or DM me directly. We have 10 openings!\n\n#Hiring #SoftwareEngineer #TechCorp #CampusPlacement',
 'job', ARRAY['hiring', 'softwareengineer', 'campusplacement'],
 ARRAY['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000006'],
 now() - interval '3 days'),

('dddddddd-0000-0000-0000-000000000003',
 '11111111-0000-0000-0000-000000000002',
 E'🎉 PLACED! Thrilled to announce I cleared the ML Engineer interview at AI Innovations Ltd!\n\n4 rounds, 2 months of preparation, countless LeetCode problems... but it was all worth it!\n\nRound breakdown:\n1. DSA (2 hours, 3 problems)\n2. ML concepts + case study\n3. System design\n4. HR + culture fit\n\nTip: Focus on fundamentals, not just syntax. They want to see HOW you think.\n\nThank you to everyone who supported me! 🙏\n\n#Achievement #Placed #MLEngineer #AIInnovations #NeverGiveUp',
 'achievement', ARRAY['achievement', 'placed', 'mlengineer'],
 ARRAY['11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003'],
 now() - interval '5 days'),

('dddddddd-0000-0000-0000-000000000004',
 '11111111-0000-0000-0000-000000000003',
 E'Real talk: How I went from 0 to landing a Flutter developer role in 8 months 🧵\n\n1/ Started with Dart basics (2 weeks of YouTube + docs)\n2/ Built 5 increasingly complex projects\n3/ Contributed to 2 open-source Flutter packages\n4/ Networked on LinkedIn every single day\n5/ Applied to 30+ companies, got 8 interviews\n6/ Cracked 2 offers\n\nThe key? Consistency over intensity.\n\nYou don''t need to code 12 hours/day. Code every day, even if it''s just 1 hour.\n\n#Flutter #MobileDev #CareerAdvice #PlacementTips #BuildInPublic',
 'text', ARRAY['flutter', 'mobiledev', 'careeradvice', 'placementtips'],
 ARRAY['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000006'],
 now() - interval '7 days'),

('dddddddd-0000-0000-0000-000000000005',
 '22222222-0000-0000-0000-000000000002',
 E'🔥 StartupNest is looking for Backend Developer Interns!\n\n6-month PAID internship | ₹20,000/month | Pune (Hybrid)\n\nWhat you''ll actually work on:\n• Scalable microservices on AWS\n• Real payment integrations (Razorpay, Stripe)\n• Production code serving 100K+ users\n\nWe don''t care about your GPA. We care about what you''ve built.\n\nDM me your GitHub profile!\n\n#Internship #BackendDev #StartupLife #Python #Django',
 'job', ARRAY['internship', 'backenddev', 'startuplife', 'python'],
 ARRAY['11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003'],
 now() - interval '4 days');

-- ── Comments ──────────────────────────────────────────────────
INSERT INTO post_comments (post_id, author_id, content, created_at) VALUES
('dddddddd-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
 'Impressive work Alex! This is exactly the kind of project we look for at TechCorp. Have you applied yet? 🎉',
 now() - interval '1 day 20 hours'),
('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002',
 'Amazing! Can you share the GitHub link? Would love to contribute!',
 now() - interval '1 day 18 hours'),
('dddddddd-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003',
 'Bro this is 🔥🔥 The messaging system looks clean! How did you handle real-time updates?',
 now() - interval '1 day 16 hours'),
('dddddddd-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
 'Congratulations Sneha!! So well deserved! You are going to crush it there! 🎊',
 now() - interval '4 days 22 hours'),
('dddddddd-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000003',
 'Welcome to the AI Innovations family, Sneha! We are so excited to have you! 🤗',
 now() - interval '4 days 20 hours'),
('dddddddd-0000-0000-0000-000000000003', '33333333-0000-0000-0000-000000000001',
 'Congratulations! This makes the entire placement cell proud. 🏆',
 now() - interval '4 days 18 hours');

-- ── Post Likes (normalized) ────────────────────────────────────
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

-- ============================================================
-- CONNECTIONS
-- ============================================================
INSERT INTO connections (user_id, connected_user_id, status, created_at) VALUES
('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'accepted',  now() - interval '30 days'),
('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'accepted',  now() - interval '25 days'),
('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'accepted',  now() - interval '20 days'),
('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', 'accepted',  now() - interval '15 days'),
('11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'accepted',  now() - interval '10 days'),
('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006', 'pending',   now() - interval '2 days'),
('11111111-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'pending',   now() - interval '1 day');

-- ============================================================
-- MESSAGES
-- ============================================================
INSERT INTO messages (sender_id, receiver_id, content, read, created_at) VALUES
-- Recruiter → Alex
('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Hi Alex! We reviewed your application for the Software Engineer position.',
 true,  now() - interval '2 days'),
('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Your profile looks impressive! We would like to schedule a technical interview. Are you available this week?',
 true,  now() - interval '2 days' + interval '5 minutes'),
-- Alex → Recruiter
('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001',
 'Hi Priya! Thank you for reaching out. Yes I am available. Thursday or Friday afternoon works best for me.',
 true,  now() - interval '1 day'),
-- Recruiter → Alex
('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Great! Let us schedule for Friday at 3 PM IST. I will send a Google Meet link shortly.',
 false, now() - interval '20 hours'),

-- Admin → Alex
('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
 'Hi Alex, please complete your student profile to get better job recommendations. Also check the upcoming placement drives!',
 true,  now() - interval '3 days'),

-- AI recruiter → Sneha
('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002',
 'Congratulations Sneha on joining AI Innovations! Your onboarding is scheduled for Monday. Please carry your original documents.',
 false, now() - interval '1 day');

-- ============================================================
-- ALUMNI
-- ============================================================
INSERT INTO alumni (id, student_id, job_id, application_id, placement_date, salary, package_currency, company, designation, location, placement_type, status, notes, created_by) VALUES
('eeeeeeee-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000002',   -- Sneha
 'aaaaaaaa-0000-0000-0000-000000000005',   -- ML Engineer job
 'bbbbbbbb-0000-0000-0000-000000000003',   -- her application
 CURRENT_DATE - 30, 1500000, 'INR',
 'AI Innovations Ltd', 'ML Engineer', 'Bangalore, India',
 'Full-time', 'active',
 'Sneha cleared all 4 rounds with exceptional ML knowledge. One of our best placements this year!',
 '33333333-0000-0000-0000-000000000001'),

('eeeeeeee-0000-0000-0000-000000000002',
 '11111111-0000-0000-0000-000000000003',   -- Arjun
 NULL, NULL,
 CURRENT_DATE - 60, 900000, 'INR',
 'StartupNest', 'Flutter Developer', 'Pune, India',
 'Full-time', 'active',
 'Arjun had 3 published apps. Hired for his strong portfolio and hands-on experience.',
 '33333333-0000-0000-0000-000000000001'),

('eeeeeeee-0000-0000-0000-000000000003',
 '11111111-0000-0000-0000-000000000005',   -- Rohan
 NULL, NULL,
 CURRENT_DATE - 90, 1800000, 'INR',
 'Google', 'Software Engineer', 'Hyderabad, India',
 'Full-time', 'active',
 'Rohan''s competitive programming background helped him ace the Google technical rounds.',
 '33333333-0000-0000-0000-000000000001'),

('eeeeeeee-0000-0000-0000-000000000004',
 '11111111-0000-0000-0000-000000000004',   -- Ananya
 'aaaaaaaa-0000-0000-0000-000000000003',   -- UI/UX job
 NULL,
 CURRENT_DATE - 45, 750000, 'INR',
 'TechCorp Solutions', 'UI/UX Designer', 'Mumbai, India',
 'Full-time', 'active',
 'Ananya''s portfolio was outstanding. Placed through campus drive.',
 '33333333-0000-0000-0000-000000000001'),

('eeeeeeee-0000-0000-0000-000000000005',
 '11111111-0000-0000-0000-000000000006',   -- Kavya
 NULL, NULL,
 CURRENT_DATE - 120, 500000, 'INR',
 'DataFlow Analytics', 'Backend Developer Intern', 'Mumbai, India',
 'Internship', 'active',
 'Kavya''s strong Django skills and database knowledge impressed the DataFlow team.',
 '33333333-0000-0000-0000-000000000001');

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
SELECT '============================================' AS "";
SELECT 'CampusConnect Database Setup Complete!' AS status;
SELECT '============================================' AS "";
SELECT 'Table'           AS table_name, COUNT(*) AS rows FROM profiles      UNION ALL
SELECT 'student_profiles',                                  COUNT(*) FROM student_profiles  UNION ALL
SELECT 'recruiter_profiles',                                COUNT(*) FROM recruiter_profiles UNION ALL
SELECT 'jobs',                                              COUNT(*) FROM jobs              UNION ALL
SELECT 'applications',                                      COUNT(*) FROM applications      UNION ALL
SELECT 'events',                                            COUNT(*) FROM events            UNION ALL
SELECT 'event_rsvps',                                       COUNT(*) FROM event_rsvps       UNION ALL
SELECT 'posts',                                             COUNT(*) FROM posts             UNION ALL
SELECT 'post_likes',                                        COUNT(*) FROM post_likes        UNION ALL
SELECT 'post_comments',                                     COUNT(*) FROM post_comments     UNION ALL
SELECT 'connections',                                       COUNT(*) FROM connections       UNION ALL
SELECT 'messages',                                          COUNT(*) FROM messages          UNION ALL
SELECT 'alumni',                                            COUNT(*) FROM alumni;
