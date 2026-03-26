import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Mail, KeyRound, Eye, EyeOff, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

type Step = 'email' | 'otp' | 'newPassword' | 'success';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (step === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ── Step 1: Request OTP ───────────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return; }
      setStep('otp');
      setResendCooldown(60);
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
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
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otpValue = otp.join('');
    if (otpValue.length < 6) { setError('Please enter the complete 6-digit code.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid or expired OTP.'); return; }
      setStep('newPassword');
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to resend OTP.'); return; }
      setResendCooldown(60);
      otpRefs.current[0]?.focus();
    } catch {
      setError('Unable to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Set new password ──────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.join(''),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to reset password.'); return; }
      setStep('success');
    } catch {
      setError('Unable to connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 5)) + c)
    : '';

  // ── Progress bar ──────────────────────────────────────────────
  const stepIndex = { email: 0, otp: 1, newPassword: 2, success: 3 }[step];
  const stepLabels = ['Email', 'Verify', 'Reset'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30 flex items-center justify-center p-4">

      <div className="w-full max-w-[480px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#166534] text-[#166534]">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-gray-900">CampusConnect</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Progress indicator (hidden on success) */}
          {step !== 'success' && (
            <div className="px-8 pt-8 pb-0">
              <div className="flex items-center gap-0 mb-6">
                {stepLabels.map((label, i) => (
                  <React.Fragment key={label}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        i < stepIndex
                          ? 'bg-[#166534] text-white'
                          : i === stepIndex
                          ? 'bg-[#166534] text-white ring-4 ring-green-100'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                        i <= stepIndex ? 'text-[#166534]' : 'text-gray-400'
                      }`}>{label}</span>
                    </div>
                    {i < stepLabels.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mb-4 transition-all duration-500 ${
                        i < stepIndex ? 'bg-[#166534]' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="px-8 pb-8 pt-4">

            {/* ── STEP 1: Email ─────────────────────────── */}
            {step === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Forgot Password?</h2>
                  <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                    Enter your registered email and we'll send you a 6-digit verification code.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@college.edu"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3.5 bg-[#166534] text-white rounded-xl font-bold text-sm hover:bg-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending Code...</> : 'Send Verification Code'}
                </button>

                <div className="text-center">
                  <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                  </Link>
                </div>
              </form>
            )}

            {/* ── STEP 2: OTP ──────────────────────────── */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Check Your Email</h2>
                  <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                    We sent a 6-digit code to{' '}
                    <span className="font-semibold text-gray-700">{maskedEmail}</span>.
                    Check your inbox (and spam folder).
                  </p>
                </div>

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
                      className={`w-11 h-13 text-center text-xl font-extrabold border-2 rounded-xl focus:outline-none transition-all
                        ${digit ? 'border-[#166534] bg-green-50 text-[#166534]' : 'border-gray-200 text-gray-900'}
                        focus:border-[#166534] focus:ring-2 focus:ring-green-100`}
                      style={{ height: '52px' }}
                    />
                  ))}
                </div>

                {/* Dev hint box */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-bold">Development mode:</span> Check your server console/terminal for the OTP code. It will be printed there since email is not configured yet.
                  </span>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  className="w-full py-3.5 bg-[#166534] text-white rounded-xl font-bold text-sm hover:bg-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : 'Verify Code'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(['','','','','','']); setError(''); }}
                    className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="font-semibold text-[#166534] hover:text-[#14532d] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: New Password ─────────────────── */}
            {step === 'newPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Set New Password</h2>
                  <p className="text-gray-500 text-sm mt-1.5">Choose a strong password for your account.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="Min. 6 characters"
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      required
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {newPassword && (
                    <div className="flex gap-1 mt-1.5">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                          newPassword.length >= i * 3
                            ? newPassword.length < 6 ? 'bg-red-400'
                            : newPassword.length < 9 ? 'bg-amber-400'
                            : 'bg-green-500'
                            : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Repeat your password"
                      className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-300 focus:ring-red-300'
                          : 'border-gray-200 focus:ring-green-500'
                      }`}
                      required
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword === newPassword && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Passwords match
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="w-full py-3.5 bg-[#166534] text-white rounded-xl font-bold text-sm hover:bg-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : 'Reset Password'}
                </button>
              </form>
            )}

            {/* ── STEP 4: Success ──────────────────────── */}
            {step === 'success' && (
              <div className="py-4 text-center space-y-5">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto border-2 border-green-100">
                  <CheckCircle2 className="h-10 w-10 text-[#166534]" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Password Reset!</h2>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                    Your password has been updated successfully.<br />
                    You can now sign in with your new password.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-3.5 bg-[#166534] text-white rounded-xl font-bold text-sm hover:bg-[#14532d] transition-all shadow-sm"
                >
                  Back to Sign In
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Footer note */}
        {step !== 'success' && (
          <p className="text-center text-xs text-gray-400 mt-5">
            Remember your password?{' '}
            <Link to="/login" className="text-[#166534] font-semibold hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;