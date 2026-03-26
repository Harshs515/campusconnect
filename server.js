// ============================================================
//  CampusConnect - Express API Server
//  Full PostgreSQL integration for all features
//  Run: node server.js
//
//  ⚠️  DB MIGRATIONS — run these once before starting:
//
//    ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE;
//    ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
//    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
//
// ============================================================

import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const { Pool } = pg;

// ── Database Pool ──────────────────────────────────────────────
const pool = new Pool({
  host: process.env.VITE_DB_HOST || 'localhost',
  port: parseInt(process.env.VITE_DB_PORT || '5432'),
  database: process.env.VITE_DB_NAME || 'campusconnect',
  user: process.env.VITE_DB_USER || 'postgres',
  password: process.env.VITE_DB_PASSWORD || 'postgres',
  ssl: process.env.VITE_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => console.log('✅ PostgreSQL connected'));
pool.on('error', (err) => console.error('❌ Pool error:', err.message));

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// ── Uploads folder setup ───────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
const resumesDir = path.join(uploadsDir, 'resumes');
[uploadsDir, avatarsDir, resumesDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
app.use('/uploads', express.static(uploadsDir));

// ── Multer config ──────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resumesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `resume_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});
const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Request logger (development)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  }
  next();
});

// ── Helpers ────────────────────────────────────────────────────
const hashPassword = (password) =>
  crypto.createHash('sha256').update(password).digest('hex');

const generateToken = (userId) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.JWT_SECRET || 'campusconnect-secret-key')
    .update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
};

const verifyToken = (token) => {
  try {
    const [header, payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'campusconnect-secret-key')
      .update(`${header}.${payload}`).digest('base64url');
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
};

// Auth middleware
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' });
  try {
    const { rows } = await pool.query('SELECT id, name, email, role FROM profiles WHERE id = $1', [decoded.sub]);
    if (!rows.length) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Nodemailer transporter ─────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Email: Password Reset OTP ──────────────────────────────────
const buildOtpEmail = (otp, userName) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#166534;padding:32px 40px;text-align:center;">
            <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">🎓 CampusConnect</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 24px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;letter-spacing:-0.5px;">Password Reset Request</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
              Hi ${userName ? userName + ',' : 'there,'}<br>
              We received a request to reset your CampusConnect password. Use the code below — it expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:#f0fdf4;border:2px dashed #166534;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:2px;">Your Verification Code</p>
              <p style="margin:0;font-size:48px;font-weight:900;color:#166534;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</p>
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              If you didn't request a password reset, you can safely ignore this email.
            </p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;">
              <p style="margin:0;font-size:13px;color:#92400e;">⚠️ <strong>Never share this code</strong> with anyone.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 CampusConnect. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ── Email: Signup Verification OTP ────────────────────────────
const buildSignupVerifyEmail = (otp, userName) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#166534;padding:32px 40px;text-align:center;">
            <span style="color:white;font-size:20px;font-weight:800;letter-spacing:-0.5px;">🎓 CampusConnect</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 24px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Welcome, ${userName}! 🎉</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
              You're almost there! Use the code below to verify your email and activate your CampusConnect account. It expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:#f0fdf4;border:2px dashed #166534;border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:2px;">Email Verification Code</p>
              <p style="margin:0;font-size:48px;font-weight:900;color:#166534;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</p>
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              If you didn't create this account, simply ignore this email.
            </p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;">
              <p style="margin:0;font-size:13px;color:#92400e;">⚠️ <strong>Never share this code</strong> with anyone.</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© 2025 CampusConnect. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ── In-memory OTP stores ───────────────────────────────────────
const otpStore = new Map();
const signupOtpStore = new Map();

// ══════════════════════════════════════════════════════════════
// FILE UPLOAD ROUTES
// ══════════════════════════════════════════════════════════════

app.post('/api/upload/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const avatarUrl = `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE profiles SET avatar=$1, updated_at=now() WHERE id=$2', [avatarUrl, req.user.id]);
    res.json({ success: true, url: avatarUrl, filename: req.file.filename });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/upload/resume', authenticate, uploadResume.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const resumeUrl = `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`}/uploads/resumes/${req.file.filename}`;
    await pool.query(
      `INSERT INTO student_profiles (id, resume_url, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (id) DO UPDATE SET resume_url=$2, updated_at=now()`,
      [req.user.id, resumeUrl]
    );
    res.json({ success: true, url: resumeUrl, filename: req.file.filename, originalName: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/upload/my-files', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.avatar, sp.resume_url FROM profiles p
       LEFT JOIN student_profiles sp ON sp.id=p.id WHERE p.id=$1`,
      [req.user.id]
    );
    res.json(rows[0] || { avatar: null, resume_url: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/upload/avatar', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT avatar FROM profiles WHERE id=$1', [req.user.id]);
    const avatar = rows[0]?.avatar;
    if (avatar && avatar.includes('/uploads/avatars/')) {
      const filename = avatar.split('/uploads/avatars/')[1];
      const filePath = path.join(avatarsDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('UPDATE profiles SET avatar=NULL, updated_at=now() WHERE id=$1', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health Check ───────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS time, version() AS version');
    res.json({ status: 'ok', db: 'connected', time: rows[0].time, version: rows[0].version });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════

app.post('/api/auth/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name || !role)
    return res.status(400).json({ error: 'Missing required fields' });
  if (!['student', 'recruiter', 'admin'].includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const exists = await pool.query(
      'SELECT id, email_verified FROM profiles WHERE email = $1',
      [normalizedEmail]
    );
    if (exists.rows.length && exists.rows[0].email_verified)
      return res.status(409).json({ error: 'Email already in use' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    signupOtpStore.set(normalizedEmail, { otp, expiresAt, name, password_hash: hashPassword(password), role });

    await transporter.sendMail({
      from: `"CampusConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${otp} — Verify your CampusConnect account`,
      html: buildSignupVerifyEmail(otp, name),
      text: `Hi ${name},\n\nYour CampusConnect verification code is: ${otp}\n\nExpires in 10 minutes.`,
    });

    console.log(`📧 Signup OTP sent to ${email}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
  }
});

app.post('/api/auth/verify-signup', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: 'Email and OTP are required' });

  const normalizedEmail = email.toLowerCase().trim();
  const record = signupOtpStore.get(normalizedEmail);

  if (!record)
    return res.status(400).json({ error: 'No signup request found. Please sign up again.' });
  if (Date.now() > record.expiresAt) {
    signupOtpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'Code expired. Please sign up again.' });
  }
  if (record.otp !== otp.trim())
    return res.status(400).json({ error: 'Incorrect code. Please check and try again.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM profiles WHERE email = $1 AND email_verified = false', [normalizedEmail]);

    const { rows } = await client.query(
      `INSERT INTO profiles (name, email, role, password_hash, email_verified)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, email, role, profile_complete, avatar, created_at`,
      [record.name, normalizedEmail, record.role, record.password_hash]
    );
    const user = rows[0];

    if (record.role === 'student') {
      await client.query('INSERT INTO student_profiles (id) VALUES ($1)', [user.id]);
    } else if (record.role === 'recruiter') {
      await client.query('INSERT INTO recruiter_profiles (id) VALUES ($1)', [user.id]);
    }

    await client.query('COMMIT');
    signupOtpStore.delete(normalizedEmail);

    const token = generateToken(user.id);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('verify-signup error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, role, profile_complete, avatar, created_at, password_hash, email_verified
       FROM profiles WHERE email = $1`,
      [email]
    );
    if (!rows.length || rows[0].password_hash !== hashPassword(password))
      return res.status(401).json({ error: 'Invalid email or password' });

    if (!rows[0].email_verified)
      return res.status(403).json({ error: 'Please verify your email before logging in.' });

    const { password_hash: _, email_verified: __, ...user } = rows[0];
    const token = generateToken(user.id);
    res.json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => res.json({ success: true }));

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const { rows } = await pool.query('SELECT id, name FROM profiles WHERE email = $1', [normalizedEmail]);
    if (!rows.length) return res.json({ success: true });

    const userName = rows[0].name;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(normalizedEmail, { otp, expiresAt, verified: false, userName });

    await transporter.sendMail({
      from: `"CampusConnect" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${otp} is your CampusConnect verification code`,
      html: buildOtpEmail(otp, userName),
      text: `Your CampusConnect password reset code is: ${otp}\n\nExpires in 10 minutes.`,
    });

    console.log(`📧 Password reset OTP sent to ${email}`);
    res.json({ success: true });
  } catch (err) {
    console.error('forgot-password error:', err);
    res.status(500).json({ error: 'Failed to send email. Please try again.' });
  }
});

app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

  const normalizedEmail = email.toLowerCase().trim();
  const record = otpStore.get(normalizedEmail);

  if (!record)
    return res.status(400).json({ error: 'No reset request found. Please request a new code.' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
  }
  if (record.otp !== otp.trim())
    return res.status(400).json({ error: 'Incorrect code. Please check and try again.' });

  record.verified = true;
  res.json({ success: true });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const normalizedEmail = email.toLowerCase().trim();
  const record = otpStore.get(normalizedEmail);

  if (!record || !record.verified || record.otp !== otp.trim())
    return res.status(400).json({ error: 'Invalid or expired session. Please start over.' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'Session expired. Please request a new code.' });
  }

  try {
    const { rowCount } = await pool.query(
      'UPDATE profiles SET password_hash = $1, updated_at = now() WHERE email = $2',
      [hashPassword(newPassword), normalizedEmail]
    );
    if (!rowCount) return res.status(404).json({ error: 'User not found' });

    otpStore.delete(normalizedEmail);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.email, p.role, p.profile_complete, p.avatar, p.bio, p.phone, p.location,
              sp.branch, sp.passing_year, sp.cgpa, sp.github, sp.linkedin, sp.portfolio, sp.skills, sp.resume_url,
              rp.company, rp.position, rp.website
       FROM profiles p
       LEFT JOIN student_profiles   sp ON sp.id = p.id
       LEFT JOIN recruiter_profiles rp ON rp.id = p.id
       WHERE p.id = $1`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/auth/profile', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, bio, phone, location, avatar, profileComplete,
      branch, passingYear, cgpa, github, linkedin, portfolio, skills,
      company, position, website } = req.body;

    await client.query(
      `UPDATE profiles
       SET name=$1, bio=$2, phone=$3, location=$4, avatar=$5, profile_complete=$6, updated_at=now()
       WHERE id=$7`,
      [name, bio, phone, location, avatar, profileComplete, req.user.id]
    );

    if (req.user.role === 'student') {
      await client.query(
        `INSERT INTO student_profiles (id, branch, passing_year, cgpa, github, linkedin, portfolio, skills, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
         ON CONFLICT (id) DO UPDATE SET
           branch=$2, passing_year=$3, cgpa=$4, github=$5, linkedin=$6,
           portfolio=$7, skills=$8, updated_at=now()`,
        [req.user.id, branch, passingYear, cgpa || null, github, linkedin, portfolio, skills || []]
      );
    } else if (req.user.role === 'recruiter') {
      await client.query(
        `INSERT INTO recruiter_profiles (id, company, position, website, updated_at)
         VALUES ($1,$2,$3,$4,now())
         ON CONFLICT (id) DO UPDATE SET company=$2, position=$3, website=$4, updated_at=now()`,
        [req.user.id, company, position, website]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════
// JOBS ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/jobs', authenticate, async (req, res) => {
  const { status, type, search } = req.query;
  let query = `SELECT j.*, p.name AS recruiter_name FROM jobs j
               JOIN profiles p ON p.id = j.recruiter_id WHERE 1=1`;
  const params = [];

  if (status) { params.push(status); query += ` AND j.status = $${params.length}`; }
  else query += ` AND (j.status = 'active' OR j.recruiter_id = '${req.user.id}')`;

  if (type) { params.push(type); query += ` AND j.job_type = $${params.length}`; }
  if (search) { params.push(`%${search}%`); query += ` AND (j.title ILIKE $${params.length} OR j.company ILIKE $${params.length} OR j.description ILIKE $${params.length})`; }

  query += ' ORDER BY j.created_at DESC';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/jobs/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT j.*, p.name AS recruiter_name, p.email AS recruiter_email
       FROM jobs j JOIN profiles p ON p.id = j.recruiter_id WHERE j.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs', authenticate, async (req, res) => {
  if (req.user.role !== 'recruiter' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only recruiters can post jobs' });

  const { title, company, description, requirements, location, salary, job_type,
    department, min_cgpa, eligible_branches, deadline, skills } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO jobs (recruiter_id, title, company, description, requirements, location,
        salary, job_type, department, min_cgpa, eligible_branches, deadline, status, skills)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active',$13)
       RETURNING *`,
      [req.user.id, title, company, description, requirements || [], location,
        salary, job_type, department, min_cgpa || 0, eligible_branches || [], deadline, skills || []]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/jobs/:id', authenticate, async (req, res) => {
  try {
    const { rows: check } = await pool.query('SELECT recruiter_id FROM jobs WHERE id=$1', [req.params.id]);
    if (!check.length) return res.status(404).json({ error: 'Job not found' });
    if (check[0].recruiter_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });

    const fields = ['title', 'company', 'description', 'requirements', 'location', 'salary',
      'job_type', 'department', 'min_cgpa', 'eligible_branches', 'deadline', 'status', 'skills'];
    const updates = []; const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        params.push(req.body[f]);
        updates.push(`${f} = $${params.length}`);
      }
    });
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE jobs SET ${updates.join(', ')}, updated_at=now() WHERE id=$${params.length} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/jobs/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT recruiter_id FROM jobs WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Job not found' });
    if (rows[0].recruiter_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    await pool.query('DELETE FROM jobs WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// APPLICATIONS ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/applications', authenticate, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'student') {
      query = `SELECT a.*, j.title AS job_title, j.company, j.location, j.salary, j.job_type
               FROM applications a JOIN jobs j ON j.id = a.job_id
               WHERE a.student_id = $1 ORDER BY a.created_at DESC`;
      params = [req.user.id];
    } else if (req.user.role === 'recruiter') {
      query = `SELECT a.*, p.name AS student_name, p.email AS student_email,
                      sp.branch, sp.cgpa, j.title AS job_title
               FROM applications a
               JOIN profiles p ON p.id = a.student_id
               LEFT JOIN student_profiles sp ON sp.id = a.student_id
               JOIN jobs j ON j.id = a.job_id
               WHERE j.recruiter_id = $1 ORDER BY a.created_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT a.*, p.name AS student_name, p.email AS student_email,
                      j.title AS job_title, j.company
               FROM applications a
               JOIN profiles p ON p.id = a.student_id
               JOIN jobs j ON j.id = a.job_id
               ORDER BY a.created_at DESC`;
      params = [];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/applications/job/:jobId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, p.name AS student_name, p.email AS student_email,
              sp.branch, sp.cgpa, sp.skills
       FROM applications a
       JOIN profiles p ON p.id = a.student_id
       LEFT JOIN student_profiles sp ON sp.id = a.student_id
       WHERE a.job_id = $1 ORDER BY a.created_at DESC`,
      [req.params.jobId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', authenticate, async (req, res) => {
  if (req.user.role !== 'student')
    return res.status(403).json({ error: 'Only students can apply for jobs' });

  const { job_id, cover_letter, resume_url } = req.body;
  if (!job_id) return res.status(400).json({ error: 'job_id is required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO applications (job_id, student_id, resume_url, cover_letter)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [job_id, req.user.id, resume_url || 'resume.pdf', cover_letter || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Already applied for this job' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/applications/:id/status', authenticate, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['applied', 'shortlisted', 'rejected', 'hired'];
  if (!validStatuses.includes(status))
    return res.status(400).json({ error: 'Invalid status' });

  try {
    const { rows: appRows } = await pool.query(
      'SELECT a.*, j.recruiter_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1',
      [req.params.id]
    );
    if (!appRows.length) return res.status(404).json({ error: 'Application not found' });
    if (appRows[0].recruiter_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });

    const { rows } = await pool.query(
      'UPDATE applications SET status=$1, updated_at=now() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// EVENTS ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/events', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.*, p.name AS organizer_name,
              COUNT(er.id) AS rsvp_count,
              EXISTS(SELECT 1 FROM event_rsvps WHERE event_id=e.id AND user_id=$1) AS is_rsvped
       FROM events e
       JOIN profiles p ON p.id = e.organizer_id
       LEFT JOIN event_rsvps er ON er.event_id = e.id
       GROUP BY e.id, p.name ORDER BY e.event_date ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', authenticate, async (req, res) => {
  if (!['admin', 'recruiter'].includes(req.user.role))
    return res.status(403).json({ error: 'Only admins and recruiters can create events' });

  const { title, description, event_date, event_time, location, event_type, max_attendees } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO events (title, description, event_date, event_time, location, event_type, organizer_id, max_attendees)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description, event_date, event_time, location, event_type, req.user.id, max_attendees || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/rsvp', authenticate, async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT id FROM event_rsvps WHERE event_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM event_rsvps WHERE event_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      res.json({ rsvped: false });
    } else {
      await pool.query('INSERT INTO event_rsvps (event_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
      res.json({ rsvped: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// MESSAGES ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/messages/chats', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (partner_id)
         partner_id, partner_name, partner_email, partner_avatar,
         last_content, last_time, unread_count
       FROM (
         SELECT
           CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
           CASE WHEN m.sender_id = $1 THEN rp.name ELSE sp.name END AS partner_name,
           CASE WHEN m.sender_id = $1 THEN rp.email ELSE sp.email END AS partner_email,
           CASE WHEN m.sender_id = $1 THEN rp.avatar ELSE sp.avatar END AS partner_avatar,
           m.content AS last_content,
           m.created_at AS last_time,
           SUM(CASE WHEN m.receiver_id=$1 AND m.read=false THEN 1 ELSE 0 END)
             OVER (PARTITION BY CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END) AS unread_count
         FROM messages m
         JOIN profiles sp ON sp.id = m.sender_id
         JOIN profiles rp ON rp.id = m.receiver_id
         WHERE m.sender_id=$1 OR m.receiver_id=$1
       ) sub
       ORDER BY partner_id, last_time DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages/:partnerId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, p.name AS sender_name
       FROM messages m JOIN profiles p ON p.id = m.sender_id
       WHERE (m.sender_id=$1 AND m.receiver_id=$2)
          OR (m.sender_id=$2 AND m.receiver_id=$1)
       ORDER BY m.created_at ASC`,
      [req.user.id, req.params.partnerId]
    );
    await pool.query(
      'UPDATE messages SET read=true WHERE sender_id=$1 AND receiver_id=$2 AND read=false',
      [req.params.partnerId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', authenticate, async (req, res) => {
  const { receiver_id, content, type, voice_duration } = req.body;
  if (!receiver_id || !content)
    return res.status(400).json({ error: 'receiver_id and content required' });
  if (receiver_id === req.user.id)
    return res.status(400).json({ error: 'Cannot message yourself' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, type, voice_duration)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, receiver_id, content, type || 'text', voice_duration || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/messages/:id', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim())
    return res.status(400).json({ error: 'Content is required' });

  try {
    const { rows: check } = await pool.query('SELECT sender_id FROM messages WHERE id = $1', [req.params.id]);
    if (!check.length) return res.status(404).json({ error: 'Message not found' });
    if (check[0].sender_id !== req.user.id)
      return res.status(403).json({ error: 'You can only edit your own messages' });

    const { rows } = await pool.query(
      `UPDATE messages SET content = $1, edited = true, updated_at = now() WHERE id = $2 RETURNING *`,
      [content.trim(), req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/messages/:id', authenticate, async (req, res) => {
  try {
    const { rows: check } = await pool.query('SELECT sender_id FROM messages WHERE id = $1', [req.params.id]);
    if (!check.length) return res.status(404).json({ error: 'Message not found' });
    if (check[0].sender_id !== req.user.id)
      return res.status(403).json({ error: 'You can only delete your own messages' });

    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// ALUMNI ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/alumni', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT al.*,
              COALESCE(p.name, 'Unknown Student') AS student_name,
              COALESCE(p.email, '') AS student_email,
              sp.branch, sp.passing_year, sp.cgpa
       FROM alumni al
       LEFT JOIN profiles p ON p.id = al.student_id
       LEFT JOIN student_profiles sp ON sp.id = al.student_id
       ORDER BY al.placement_date DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alumni', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can manage alumni records' });

  const { student_id, job_id, application_id, placement_date, salary,
    package_currency, company, designation, location, placement_type, status, notes } = req.body;

  try {
    const { rows } = await pool.query(
      `INSERT INTO alumni (student_id, job_id, application_id, placement_date, salary,
         package_currency, company, designation, location, placement_type, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [student_id, job_id || null, application_id || null, placement_date, salary || null,
        package_currency || 'INR', company, designation || null, location || null,
        placement_type, status || 'active', notes || null, req.user.id]
    );
    const { rows: full } = await pool.query(
      `SELECT al.*,
              COALESCE(p.name, 'Unknown Student') AS student_name,
              COALESCE(p.email, '') AS student_email,
              sp.branch, sp.passing_year, sp.cgpa
       FROM alumni al
       LEFT JOIN profiles p ON p.id = al.student_id
       LEFT JOIN student_profiles sp ON sp.id = al.student_id
       WHERE al.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Alumni record already exists for this student and company' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/alumni/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can update alumni records' });
  try {
    const fields = ['placement_date', 'salary', 'package_currency', 'company', 'designation',
      'location', 'placement_type', 'status', 'notes'];
    const updates = []; const params = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) { params.push(req.body[f]); updates.push(`${f}=$${params.length}`); }
    });
    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
    params.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE alumni SET ${updates.join(',')} ,updated_at=now() WHERE id=$${params.length} RETURNING *`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/alumni/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Only admins can delete alumni records' });
  try {
    await pool.query('DELETE FROM alumni WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// SOCIAL / POSTS ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/posts', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT po.*, p.name AS author_name, p.role AS author_role, p.avatar AS author_avatar,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id=po.id) AS like_count,
              (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id=po.id) AS comment_count,
              EXISTS(SELECT 1 FROM post_likes WHERE post_id=po.id AND user_id=$1) AS is_liked,
              false AS is_bookmarked
       FROM posts po JOIN profiles p ON p.id=po.author_id
       WHERE po.visibility='public'
       ORDER BY po.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', authenticate, async (req, res) => {
  const { content, post_type, tags, images, visibility } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO posts (author_id, content, post_type, tags, images, visibility)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, content, post_type || 'text', tags || [], images || [], visibility || 'public']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT author_id FROM posts WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });

    const isAuthor = rows[0].author_id === req.user.id;
    const isAdmin  = req.user.role === 'admin';
    if (!isAuthor && !isAdmin)
      return res.status(403).json({ error: 'You are not allowed to delete this post' });

    await pool.query('DELETE FROM post_likes    WHERE post_id = $1', [req.params.id]);
    await pool.query('DELETE FROM post_comments WHERE post_id = $1', [req.params.id]);
    await pool.query('DELETE FROM posts         WHERE id      = $1', [req.params.id]);
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/like', authenticate, async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT id FROM post_likes WHERE post_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (existing.rows.length) {
      await pool.query('DELETE FROM post_likes WHERE post_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      res.json({ liked: false });
    } else {
      await pool.query('INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
      res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/comment', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO post_comments (post_id, author_id, content) VALUES ($1,$2,$3)
       RETURNING *, (SELECT name FROM profiles WHERE id=$2) AS author_name`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/:id/comments', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pc.*, p.name AS author_name, p.avatar AS author_avatar
       FROM post_comments pc JOIN profiles p ON p.id=pc.author_id
       WHERE pc.post_id=$1 ORDER BY pc.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/user/:userId', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT po.*,
              p.name AS author_name, p.role AS author_role, p.avatar AS author_avatar,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id=po.id) AS like_count,
              (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id=po.id) AS comment_count,
              EXISTS(SELECT 1 FROM post_likes WHERE post_id=po.id AND user_id=$2) AS is_liked,
              false AS is_bookmarked
       FROM posts po
       JOIN profiles p ON p.id = po.author_id
       WHERE po.author_id = $1 AND po.visibility = 'public'
       ORDER BY po.created_at DESC`,
      [req.params.userId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// CONNECTIONS ROUTES
// ══════════════════════════════════════════════════════════════

app.get('/api/connections', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, p.name, p.email, p.role, p.bio, p.avatar
       FROM connections c
       JOIN profiles p ON p.id = CASE WHEN c.user_id=$1 THEN c.connected_user_id ELSE c.user_id END
       WHERE (c.user_id=$1 OR c.connected_user_id=$1) AND c.status='accepted'`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/connections/request', authenticate, async (req, res) => {
  const { connected_user_id } = req.body;
  if (!connected_user_id) return res.status(400).json({ error: 'connected_user_id required' });
  if (connected_user_id === req.user.id) return res.status(400).json({ error: 'Cannot connect with yourself' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO connections (user_id, connected_user_id) VALUES ($1,$2) RETURNING *`,
      [req.user.id, connected_user_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Request already sent' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/connections/:id/accept', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE connections SET status='accepted', updated_at=now()
       WHERE id=$1 AND connected_user_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Request not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/connections/:id', authenticate, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM connections WHERE id=$1 AND (user_id=$2 OR connected_user_id=$2)',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/connections/pending', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.user_id, c.connected_user_id, c.status,
              p.name, p.email, p.role, p.bio, p.avatar
       FROM connections c
       JOIN profiles p ON p.id = c.user_id
       WHERE c.connected_user_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/connections/sent', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.user_id, c.connected_user_id, c.status,
              p.name, p.email, p.role, p.avatar
       FROM connections c
       JOIN profiles p ON p.id = c.connected_user_id
       WHERE c.user_id = $1 AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// USERS / PROFILES
// ══════════════════════════════════════════════════════════════

app.get('/api/users', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.email, p.role, p.profile_complete, p.bio, p.avatar, p.location, p.created_at,
              p.is_blocked,
              sp.branch, sp.passing_year, sp.cgpa, sp.skills, sp.github, sp.linkedin, sp.portfolio, sp.resume_url,
              rp.company, rp.position, rp.website
       FROM profiles p
       LEFT JOIN student_profiles   sp ON sp.id=p.id
       LEFT JOIN recruiter_profiles rp ON rp.id=p.id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.email, p.role, p.profile_complete, p.bio, p.avatar, p.phone, p.location, p.created_at,
              p.is_blocked,
              sp.branch, sp.passing_year, sp.cgpa, sp.skills, sp.github, sp.linkedin, sp.portfolio, sp.resume_url,
              rp.company, rp.position, rp.website
       FROM profiles p
       LEFT JOIN student_profiles   sp ON sp.id=p.id
       LEFT JOIN recruiter_profiles rp ON rp.id=p.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });

  const { role } = req.body;
  const validRoles = ['student', 'recruiter', 'admin'];
  if (!role || !validRoles.includes(role))
    return res.status(400).json({ error: 'Invalid role. Must be student, recruiter, or admin' });

  try {
    const { rows } = await pool.query(
      'UPDATE profiles SET role=$1, updated_at=now() WHERE id=$2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'You cannot delete your own account' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: check } = await client.query('SELECT id FROM profiles WHERE id=$1', [req.params.id]);
    if (!check.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    await client.query('DELETE FROM post_likes         WHERE user_id=$1',                         [req.params.id]);
    await client.query('DELETE FROM post_comments      WHERE author_id=$1',                        [req.params.id]);
    await client.query('DELETE FROM posts              WHERE author_id=$1',                        [req.params.id]);
    await client.query('DELETE FROM event_rsvps        WHERE user_id=$1',                          [req.params.id]);
    await client.query('DELETE FROM messages           WHERE sender_id=$1 OR receiver_id=$1',      [req.params.id]);
    await client.query('DELETE FROM connections        WHERE user_id=$1 OR connected_user_id=$1',  [req.params.id]);
    await client.query('DELETE FROM applications       WHERE student_id=$1',                       [req.params.id]);
    await client.query('DELETE FROM student_profiles   WHERE id=$1',                               [req.params.id]);
    await client.query('DELETE FROM recruiter_profiles WHERE id=$1',                               [req.params.id]);
    await client.query('DELETE FROM profiles           WHERE id=$1',                               [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Delete user error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post('/api/users/:id/block', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'You cannot block your own account' });

  try {
    const { rows } = await pool.query(
      'UPDATE profiles SET is_blocked=true, updated_at=now() WHERE id=$1 RETURNING id, name, is_blocked',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, ...rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id/block', authenticate, async (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin only' });

  try {
    const { rows } = await pool.query(
      'UPDATE profiles SET is_blocked=false, updated_at=now() WHERE id=$1 RETURNING id, name, is_blocked',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, ...rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// ANALYTICS (admin)
// ══════════════════════════════════════════════════════════════

app.get('/api/analytics/overview', authenticate, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const [users, jobs, apps, events, alumni] = await Promise.all([
      pool.query('SELECT role, COUNT(*) FROM profiles GROUP BY role'),
      pool.query('SELECT status, COUNT(*) FROM jobs GROUP BY status'),
      pool.query('SELECT status, COUNT(*) FROM applications GROUP BY status'),
      pool.query('SELECT COUNT(*) FROM events'),
      pool.query('SELECT COUNT(*), AVG(salary) FROM alumni'),
    ]);
    res.json({
      users: users.rows,
      jobs: jobs.rows,
      applications: apps.rows,
      eventCount: parseInt(events.rows[0].count),
      alumniCount: parseInt(alumni.rows[0].count),
      avgSalary: parseFloat(alumni.rows[0].avg) || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// SOCKET.IO + HTTP SERVER
// ══════════════════════════════════════════════════════════════

import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Map userId → socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Socket connected:', socket.id);

  // User registers their userId on connect
  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`👤 User ${userId} joined (socket ${socket.id})`);
    // Broadcast online status to all others
    socket.broadcast.emit('user-online', { userId });
  });

  // ── Video call signaling ────────────────────────────────────

  // Step 1: Caller notifies callee of incoming call
  socket.on('initiate-call', ({ to, fromName }) => {
    const targetSocket = onlineUsers.get(to);
    const fromUserId = getUserIdBySocket(socket.id, onlineUsers);
    console.log(`📞 Call initiated from ${fromUserId} to ${to}`);
    if (targetSocket) {
      io.to(targetSocket).emit('incoming-call', {
        from: fromUserId,
        fromName,
      });
    } else {
      // Target is offline — notify caller
      socket.emit('call-failed', { reason: 'User is offline' });
    }
  });

  // Step 2: Caller sends WebRTC offer
  socket.on('call-offer', ({ to, offer }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call-offer', { offer });
    }
  });

  // Step 3: Callee sends WebRTC answer
  socket.on('call-answer', ({ to, answer }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call-answer', { answer });
    }
  });

  // Step 4: ICE candidates (both sides)
  socket.on('ice-candidate', ({ to, candidate }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('ice-candidate', { candidate });
    }
  });

  // Step 5: Either side ends the call
  socket.on('end-call', ({ to }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call-ended');
    }
  });

  // Handle call rejection
  socket.on('reject-call', ({ to }) => {
    const targetSocket = onlineUsers.get(to);
    if (targetSocket) {
      io.to(targetSocket).emit('call-rejected');
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    const userId = getUserIdBySocket(socket.id, onlineUsers);
    if (userId) {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user-offline', { userId });
      console.log(`👤 User ${userId} disconnected`);
    }
  });
});

// Helper: get userId by socketId
function getUserIdBySocket(socketId, map) {
  for (const [userId, sid] of map.entries()) {
    if (sid === socketId) return userId;
  }
  return null;
}

// ── Start Server ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════╗');
  console.log('║   CampusConnect API Server       ║');
  console.log('╚══════════════════════════════════╝\n');
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready for video calls`);
  console.log(`🗄️  Database: ${process.env.VITE_DB_NAME}@${process.env.VITE_DB_HOST}\n`);
});

