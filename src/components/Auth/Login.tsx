import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Eye, EyeOff, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      addNotification({ title: 'Welcome back!', message: 'Logged in successfully.', type: 'success' });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (role: 'student' | 'recruiter' | 'admin') => {
    const creds = { student: 'student@demo.com', recruiter: 'recruiter@demo.com', admin: 'admin@demo.com' };
    setEmail(creds[role]);
    setPassword('password');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden">
      
      {/* App-in-Box Wrapper */}
      <div className="w-full max-w-[550px] bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl flex overflow-hidden border border-gray-200 min-h-[600px]">
        
        {/* Form Area */}
        <div className="w-full p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white">
          
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#166534] text-[#166534]">
              <GraduationCap className="h-6 w-6" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              CampusConnect
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sign in</h2>
            <p className="text-gray-500 text-[15px] mt-2 font-medium">Welcome back! Please enter your details.</p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-2xl text-sm font-semibold bg-red-50 border border-red-100 text-red-600 flex items-center shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-full text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534] transition-all placeholder-gray-400"
                placeholder="Enter your email" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-sm font-bold text-[#166534] hover:text-[#14532d] transition-colors">Forgot password?</Link>
              </div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full px-5 py-3.5 pr-12 bg-gray-50/50 border border-gray-200 rounded-full text-[15px] font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#166534]/30 focus:border-[#166534] transition-all placeholder-gray-400"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#14532d] rounded-full text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(20,83,45,0.3)] hover:shadow-[0_8px_25px_rgba(20,83,45,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 mt-4">
              {isLoading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Sign in'}
            </button>
          </form>

          {/* Quick Demo Login */}
          <div className="mt-8 pt-8 border-t border-gray-100">
             <div className="flex items-center justify-center gap-2 mb-4">
               <Sparkles className="h-4 w-4 text-emerald-600" />
               <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Demo Vault</span>
             </div>
             <div className="grid grid-cols-3 gap-3">
               {(['student', 'recruiter', 'admin'] as const).map(role => (
                 <button key={role} onClick={() => fillDemo(role)} type="button"
                   className="py-2.5 bg-gray-50 hover:bg-gray-100 rounded-full text-[13px] font-bold text-gray-700 capitalize transition-colors shadow-sm border border-gray-200">
                   {role}
                 </button>
               ))}
             </div>
          </div>

          <p className="text-center text-[15px] mt-8 text-gray-500 font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="font-bold text-[#166534] hover:text-[#14532d] transition-colors">Sign up</Link>
          </p>
        </div>



      </div>
    </div>
  );
};

export default Login;