import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, CheckCircle2, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { resetPasswordSchema, ResetPasswordFormData } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/EmptyState';

const RESEND_COOLDOWN_SECONDS = 45;

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword, resendOtp, isSupabaseReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const passedEmail = (location.state as any)?.email || '';
  const initialMessage = (location.state as any)?.message || null;

  const [email, setEmail] = useState<string>(passedEmail);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(initialMessage);
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      otp: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!email) {
      setServerError('Please provide the email address associated with this reset.');
      return;
    }

    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await resetPassword(data.password, data.otp, email);
      if (!res.success) {
        setServerError(res.error || 'Failed to update password. Please check the code.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
    } catch (err: any) {
      setServerError(err.message || 'Failed to update password.');
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    setServerError(null);
    setIsResending(true);

    try {
      const res = await resendOtp(email, 'recovery');
      if (!res.success) {
        setServerError(res.error || 'Failed to resend recovery code.');
      } else {
        setResendStatus('A fresh recovery code has been dispatched to your email.');
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy-900 text-teal-400 mb-3 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create New Password
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Verify the 6-digit recovery code and enter your new password
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md">
          {success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Password Updated!</h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-6">
                Your password has been changed securely. You can now sign in with your new credentials.
              </p>
              <Link to="/signin">
                <Button variant="primary" size="lg" className="w-full">
                  <span>Sign In with New Password</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {resendStatus && (
                <Alert variant="info" className="mb-4">
                  {resendStatus}
                </Alert>
              )}

              {serverError && (
                <Alert variant="error" className="mb-4">
                  {serverError}
                </Alert>
              )}

              {!passedEmail && (
                <div className="mb-4">
                  <Input
                    type="email"
                    label="Registered College Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rohit.sharma@jspm.edu.in"
                    required
                  />
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Input
                    label="6-Digit Recovery Code"
                    placeholder="e.g. 123456"
                    maxLength={6}
                    required
                    className="text-center tracking-widest text-lg font-mono font-bold"
                    error={errors.otp?.message}
                    {...register('otp')}
                  />
                  {!isSupabaseReady && (
                    <p className="text-[11px] text-teal-700 font-medium mt-1 text-center">
                      Demo code <span className="font-mono font-bold bg-teal-50 px-1.5 py-0.5 rounded">123456</span> pre-authorized for testing.
                    </p>
                  )}
                </div>

                <Input
                  type="password"
                  label="New Password"
                  placeholder="Min 8 characters with letter & number"
                  required
                  error={errors.password?.message}
                  {...register('password')}
                />

                <Input
                  type="password"
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  required
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword')}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  isLoading={isSubmitting}
                >
                  <span>Update Password</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn't get code?</span>
                {cooldown > 0 ? (
                  <span className="text-slate-400 font-medium">Resend in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="inline-flex items-center gap-1 font-bold text-teal-700 hover:text-teal-800 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
