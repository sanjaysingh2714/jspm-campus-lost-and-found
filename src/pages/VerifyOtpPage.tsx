import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { otpSchema, OtpFormData } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/EmptyState';

const RESEND_COOLDOWN_SECONDS = 45;

export const VerifyOtpPage: React.FC = () => {
  const { verifyOtp, resendOtp, pendingVerificationEmail, isSupabaseReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const passedEmail = (location.state as any)?.email || pendingVerificationEmail || '';
  const initialMessage = (location.state as any)?.message || null;

  const [email, setEmail] = useState<string>(passedEmail);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(initialMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState<number>(RESEND_COOLDOWN_SECONDS);

  // Cooldown timer
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
    setValue,
    formState: { errors },
  } = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const onSubmit = async (data: OtpFormData) => {
    if (!email) {
      setServerError('Please provide your registered email address.');
      return;
    }

    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await verifyOtp(email, data.otp, 'signup');
      if (!res.success) {
        setServerError(res.error || 'Invalid or expired OTP code.');
        setIsSubmitting(false);
        return;
      }

      // Verification successful -> go to dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setServerError(err.message || 'Verification failed. Please check the code.');
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;

    setServerError(null);
    setIsResending(true);

    try {
      const res = await resendOtp(email, 'signup');
      if (!res.success) {
        setServerError(res.error || 'Failed to resend code.');
      } else {
        setSuccessMessage('A fresh verification code has been dispatched to your email.');
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
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white mb-3 shadow-sm">
            <MailCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Verify College Email
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Enter the 6-digit verification code sent to your registered email
          </p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md">
          {successMessage && (
            <Alert variant="success" className="mb-4">
              {successMessage}
            </Alert>
          )}

          {serverError && (
            <Alert variant="error" className="mb-4">
              {serverError}
            </Alert>
          )}

          {/* If email wasn't passed, allow typing it */}
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

          {passedEmail && (
            <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-xs text-slate-500">Verification code sent to:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{email}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Input
                label="6-Digit Verification Code"
                placeholder="e.g. 123456"
                maxLength={6}
                required
                className="text-center tracking-widest text-lg font-mono font-bold"
                error={errors.otp?.message}
                {...register('otp')}
              />
              {!isSupabaseReady && (
                <p className="text-[11px] text-teal-700 font-medium mt-1.5 text-center">
                  Demo code <span className="font-mono font-bold bg-teal-50 px-1.5 py-0.5 rounded">123456</span> pre-authorized for testing.
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isSubmitting}
            >
              <span>Confirm &amp; Enter Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Resend Cooldown Section */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Didn't receive the email?</span>
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

          <div className="mt-4 text-center">
            <Link to="/signin" className="text-xs text-slate-500 hover:text-slate-800 transition">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
