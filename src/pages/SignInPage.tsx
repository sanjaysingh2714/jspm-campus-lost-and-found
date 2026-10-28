import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, KeyRound, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { signInSchema, SignInFormData } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/EmptyState';

export const SignInPage: React.FC = () => {
  const { signIn, isSupabaseReady, switchMockAccount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await signIn(data);
      if (!res.success) {
        setServerError(res.error || 'Failed to sign in.');
        setIsSubmitting(false);
        // If unverified email error, give direct link to verify
        if (res.error?.includes('verify your email')) {
          navigate('/verify-otp', { state: { email: data.email } });
        }
        return;
      }

      navigate(from, { replace: true });
    } catch (err: any) {
      setServerError(err.message || 'An error occurred during sign in.');
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
    onSubmit({ email, password: pass });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy-900 text-teal-400 mb-3 shadow-sm">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign In to Portal
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            JSPM Campus Lost &amp; Found Portal
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md">
          {serverError && (
            <Alert variant="error" className="mb-6">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              type="email"
              label="College Email Address"
              placeholder="e.g. rohit.sharma@jspm.edu.in"
              required
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                placeholder="Enter your password"
                required
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Quick Demo Test Logins for easy 2-account verification */}
          {!isSupabaseReady && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
                Preloaded Student Test Accounts
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('rohit.sharma@jspm.edu.in', 'Password123!')}
                  className="p-2 text-xs text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <p className="font-bold text-slate-800">Rohit Sharma</p>
                  <p className="text-[10px] text-slate-500">Finder of 2 items</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('priya.deshmukh@jspm.edu.in', 'Password123!')}
                  className="p-2 text-xs text-left rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <p className="font-bold text-slate-800">Priya Deshmukh</p>
                  <p className="text-[10px] text-slate-500">Claimant test user</p>
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              New to JSPM Lost &amp; Found?{' '}
              <Link to="/signup" className="font-bold text-navy-800 hover:text-navy-950 underline">
                Register as Student
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
