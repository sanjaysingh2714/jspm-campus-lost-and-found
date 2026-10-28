import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Shield, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { signUpSchema, SignUpFormData } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/EmptyState';

export const SignUpPage: React.FC = () => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      prn: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const res = await signUp(data);
      if (!res.success) {
        setServerError(res.error || 'Failed to register account.');
        setIsSubmitting(false);
        return;
      }

      // Redirect to OTP verification page
      navigate('/verify-otp', {
        state: {
          email: data.email,
          message: res.message || 'Verification OTP sent to your registered email.',
        },
      });
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred during registration.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy-900 text-teal-400 mb-3 shadow-sm">
            <UserPlus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Student Account
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Register to report lost items and verify ownership of found belongings
          </p>
        </div>

        {/* Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md">
          {serverError && (
            <Alert variant="error" className="mb-6">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Full Name */}
            <Input
              label="Full Name"
              placeholder="e.g. Rohit Sharma"
              required
              error={errors.fullName?.message}
              {...register('fullName')}
            />

            {/* Indian Mobile Number */}
            <Input
              label="Contact / WhatsApp Number"
              placeholder="10-digit Indian mobile number (e.g. 9876543210)"
              required
              error={errors.phone?.message}
              helperText="Only shared with the other party after claim approval"
              {...register('phone')}
            />

            {/* Email Address */}
            <Input
              type="email"
              label="College Email Address"
              placeholder="e.g. rohit.sharma@jspm.edu.in"
              required
              error={errors.email?.message}
              helperText="Six-digit OTP will be sent here for account verification"
              {...register('email')}
            />

            {/* College PRN */}
            <Input
              label="College PRN (Permanent Registration Number)"
              placeholder="e.g. JSPM2023001 or 21010045"
              required
              error={errors.prn?.message}
              helperText="Format validation enforces account integrity; not an official university enrollment source"
              {...register('prn')}
            />

            {/* Password */}
            <Input
              type="password"
              label="Password"
              placeholder="Min 8 characters with letter & number"
              required
              error={errors.password?.message}
              {...register('password')}
            />

            {/* Confirm Password */}
            <Input
              type="password"
              label="Confirm Password"
              placeholder="Re-enter your password"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Terms and Privacy Agreement */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  {...register('agreeTerms')}
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{' '}
                  <span className="font-semibold text-slate-800">Privacy Notice</span> and agree to abide
                  by campus honesty guidelines when claiming or reporting items.
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="mt-1 text-xs font-medium text-rose-600">
                  {errors.agreeTerms.message}
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
              <span>Create Account &amp; Send OTP</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Footer link to sign in */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/signin" className="font-bold text-navy-800 hover:text-navy-950 underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
