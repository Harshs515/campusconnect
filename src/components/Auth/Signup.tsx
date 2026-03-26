import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  Eye, EyeOff, Building, Shield, Check, GraduationCap,
  Mail, Loader2, ArrowLeft, ShieldCheck
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

type Step = 'form' | 'verify';

const Signup: React.FC = () => {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'student' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [resendCooldown]);

  // Auto-focus first OTP box when step changes
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ── STEP 1: Submit signup form → triggers OTP email ───────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match'); return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          name: formData.name.trim(),
          role: formData.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send verification code'); return; }
      setStep('verify');
      setResendCooldown(60);
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── OTP input handling ────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError('');
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp]; next[index] = ''; setOtp(next);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => { if (i < 6) next[i] = d; });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  // ── STEP 2: Verify OTP → creates account + auto-login ─────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otpValue = otp.join('');
    if (otpValue.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          otp: otpValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid or expired code.'); return; }

      // Store token and log in the user
      localStorage.setItem('campusconnect_token', data.token);
      await login(formData.email.trim().toLowerCase(), formData.password);

      addNotification({ title: 'Account Created! 🎉', message: 'Welcome to CampusConnect!', type: 'success' });
      navigate('/dashboard');
    } catch {
      setError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setOtp(['', '', '', '', '', '']);
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          name: formData.name.trim(),
          role: formData.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to resend code.'); return; }
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const maskedEmail = formData.email
    ? formData.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
    : '';

  const roles = [
    { value: 'student',   label: 'Student',   icon: GraduationCap, desc: 'Find jobs & placements' },
    { value: 'recruiter', label: 'Recruiter',  icon: Building,      desc: 'Post jobs & hire talent' },
    { value: 'admin',     label: 'Admin',      icon: Shield,        desc: 'Manage platform' },
  ];

  // ════════════════════════════════════════════════════════════
  // STEP 1 — Signup form
  // ════════════════════════════════════════════════════════════
  if (step === 'form') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden">
        <div className="w-full max-w-[550px] bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl flex overflow-hidden border border-gray-200 min-h-[600px]">
          <div className="w-full p-6 sm:p-10 lg:p-14 flex flex-col justify-center bg-white overflow-y-auto hide-scrollbar max-h-[90vh] md:max-h-none">

            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#166534] text-[#166534]">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900">CampusConnect</span>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h2>
              <p className="text-gray-500 text-[15px] mt-2 font-medium">Join thousands of students and recruiters</p>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-2xl text-sm font-semibold bg-red-50 border border-red-100 text-red-600 flex items-center shadow-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role selector */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">I am a...</label>
                <div className="grid grid-cols-3 gap-3">
                  {roles.map(({ value, label, icon: Icon }) => (
                    <button type="button" key={value}
                      onClick={() => setFormData(p => ({ ...p, role: value as UserRole }))}
                      className={`relative rounded-2xl p-3 flex flex-col items-center gap-2 border-2 transition-all text-center ${formData.role === value ? 'border-[#166534] bg-[#166534]/5 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'}`}>
                      <Icon className={`h-5 w-5 ${formData.role === value ? 'text-[#166534]' : 'text-gray-400'}`} />
                      <span className={`block text-xs font-bold ${formData.role === value ? 'text-[#166534]' : 'text-gray-700'}`}>{label}</span>
                      {formData.role === value && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#166534] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-center text-[11px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
                  {roles.find(r => r.value === formData.role)?.desc}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full name</label>
                <input type="text" value={formData.name}
                  onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required
                  className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-full text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534] transition-all placeholder-gray-400"
                  placeholder="Enter your full name" />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email address</label>
                <input type="email" value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required
                  className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-full text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534] transition-all placeholder-gray-400"
                  placeholder="you@example.com" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={formData.password}
                      onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} required
                      className="w-full px-5 py-3.5 pr-12 bg-gray-50/50 border border-gray-200 rounded-full text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534] transition-all placeholder-gray-400"
                      placeholder="Min. 6 chars" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Confirm</label>
                  <input type="password" value={formData.confirmPassword}
                    onChange={e => setFormData(p => ({ ...p, confirmPassword: e.target.value }))} required
                    className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-full text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534] transition-all placeholder-gray-400"
                    placeholder="Repeat password" />
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-[#14532d] rounded-full text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(20,83,45,0.3)] hover:shadow-[0_8px_25px_rgba(20,83,45,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 mt-4">
                {isLoading
                  ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending Code...</>
                  : <><Mail className="h-4 w-4" /> Continue with Email Verification</>}
              </button>
            </form>

            <p className="text-center text-[15px] mt-8 text-gray-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#166534] hover:text-[#14532d] transition-colors">Sign in</Link>
            </p>
          </div>
        </div>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // STEP 2 — Email verification
  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#166534] text-[#166534]">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-gray-900">CampusConnect</span>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-8 py-8">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-50 border-2 border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-[#166534]" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Verify Your Email</h2>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                We sent a 6-digit code to<br />
                <span className="font-semibold text-gray-700">{maskedEmail}</span>
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-5">
              {/* OTP boxes */}
              <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-11 text-center text-xl font-extrabold border-2 rounded-xl focus:outline-none transition-all
                      ${digit ? 'border-[#166534] bg-green-50 text-[#166534]' : 'border-gray-200 text-gray-900'}
                      focus:border-[#166534] focus:ring-2 focus:ring-green-100`}
                    style={{ height: '52px' }}
                  />
                ))}
              </div>

              {/* Security note */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 font-medium flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
                <span>Check your inbox and spam folder. The code is valid for <strong>10 minutes</strong>.</span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                  {error}
                </div>
              )}

              <button type="submit"
                disabled={isLoading || otp.join('').length < 6}
                className="w-full py-3.5 bg-[#14532d] text-white rounded-xl font-bold text-sm hover:bg-[#166534] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm">
                {isLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                  : 'Verify & Create Account'}
              </button>

              <div className="flex items-center justify-between text-sm pt-1">
                <button type="button"
                  onClick={() => { setStep('form'); setOtp(['','','','','','']); setError(''); }}
                  className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 font-medium transition-colors">
                  <ArrowLeft className="h-3.5 w-3.5" /> Change details
                </button>
                <button type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || isLoading}
                  className="font-semibold text-[#166534] hover:text-[#14532d] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>

          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-[#166534] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;