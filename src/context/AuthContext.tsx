import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore, LocalUser } from '../lib/mockStore';
import { Profile } from '../types/database';
import { SignUpFormData, SignInFormData } from '../lib/validators';

export interface UserSession {
  id: string;
  email: string;
  isVerified: boolean;
  profile: Profile | null;
}

interface AuthContextType {
  user: UserSession | null;
  profile: Profile | null;
  loading: boolean;
  isSupabaseReady: boolean;
  pendingVerificationEmail: string | null;
  setPendingVerificationEmail: (email: string | null) => void;
  signUp: (data: SignUpFormData) => Promise<{ success: boolean; error?: string; message?: string }>;
  signIn: (data: SignInFormData) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string, type: 'signup' | 'recovery') => Promise<{ success: boolean; error?: string }>;
  resendOtp: (email: string, type: 'signup' | 'recovery') => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (newPassword: string, otpToken?: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  switchMockAccount?: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('jspm_pending_verify_email');
  });

  const isSupabaseReady = isSupabaseConfigured();

  // Save pending verification email to sessionStorage for reload persistence
  const updatePendingEmail = (email: string | null) => {
    setPendingVerificationEmail(email);
    if (email) {
      sessionStorage.setItem('jspm_pending_verify_email', email);
    } else {
      sessionStorage.removeItem('jspm_pending_verify_email');
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (isSupabaseReady) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            const isEmailConfirmed = Boolean(session.user.email_confirmed_at);
            
            // Fetch profile
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            const profileData = (userProfile as Profile) || {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || 'Student',
              phone: session.user.user_metadata?.phone || '',
              email: session.user.email || '',
              prn: session.user.user_metadata?.prn || 'PRN-' + session.user.id.slice(0, 6),
              created_at: session.user.created_at,
              updated_at: session.user.created_at,
            };

            setUser({
              id: session.user.id,
              email: session.user.email || '',
              isVerified: isEmailConfirmed,
              profile: profileData,
            });
            setProfile(profileData);
          } else if (mounted) {
            setUser(null);
            setProfile(null);
          }
        } catch (err) {
          console.error('Error fetching Supabase session:', err);
        }
      } else {
        // Fallback local mock session
        const session = mockStore.getCurrentSession();
        if (session && mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            isVerified: session.user.isVerified,
            profile: session.user.profile,
          });
          setProfile(session.user.profile);
        }
      }

      if (mounted) setLoading(false);
    }

    initializeAuth();

    // Set up Supabase auth listener
    if (isSupabaseReady) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user && mounted) {
          const isEmailConfirmed = Boolean(session.user.email_confirmed_at);
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const profileData = (userProfile as Profile) || {
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || 'Student',
            phone: session.user.user_metadata?.phone || '',
            email: session.user.email || '',
            prn: session.user.user_metadata?.prn || 'PRN-' + session.user.id.slice(0, 6),
            created_at: session.user.created_at,
            updated_at: session.user.created_at,
          };

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            isVerified: isEmailConfirmed,
            profile: profileData,
          });
          setProfile(profileData);
        } else if (mounted) {
          setUser(null);
          setProfile(null);
        }
      });

      return () => {
        mounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      mounted = false;
    };
  }, [isSupabaseReady]);

  // Sign Up
  const signUp = async (data: SignUpFormData): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (isSupabaseReady) {
      try {
        const { data: res, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
              phone: data.phone,
              prn: data.prn,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        updatePendingEmail(data.email);
        return {
          success: true,
          message: 'Verification code sent to your registered college email. Please verify OTP to proceed.',
        };
      } catch (err: any) {
        return { success: false, error: err.message || 'Signup failed' };
      }
    }

    // Local / Mock store implementation
    const users = mockStore.getUsers();
    if (users.some((u) => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'An account with this email address already exists.' };
    }
    if (users.some((u) => u.profile.prn.toUpperCase() === data.prn.toUpperCase())) {
      return { success: false, error: 'An account with this College PRN already exists.' };
    }

    const newUserId = 'user-' + Math.random().toString(36).substring(2, 9);
    const newProfile: Profile = {
      id: newUserId,
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      prn: data.prn,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newUser: LocalUser = {
      id: newUserId,
      email: data.email,
      password: data.password,
      isVerified: false,
      profile: newProfile,
    };

    users.push(newUser);
    mockStore.saveUsers(users);
    mockStore.saveOtp(data.email, '123456', 'signup');
    updatePendingEmail(data.email);

    return {
      success: true,
      message: 'Verification code (123456) sent to your registered email.',
    };
  };

  // Sign In
  const signIn = async (data: SignInFormData): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseReady) {
      try {
        const { data: res, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        const isEmailConfirmed = Boolean(res.user?.email_confirmed_at);
        if (!isEmailConfirmed) {
          updatePendingEmail(data.email);
          return {
            success: false,
            error: 'Please verify your email address before accessing the campus portal.',
          };
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Invalid credentials' };
      }
    }

    // Local / Mock store sign in
    const users = mockStore.getUsers();
    const found = users.find(
      (u) => u.email.toLowerCase() === data.email.toLowerCase() && u.password === data.password
    );

    if (!found) {
      return { success: false, error: 'Invalid email address or password. Please check your credentials.' };
    }

    if (!found.isVerified) {
      updatePendingEmail(found.email);
      return {
        success: false,
        error: 'Please verify your email address before logging in.',
      };
    }

    mockStore.setCurrentSession(found);
    setUser({
      id: found.id,
      email: found.email,
      isVerified: true,
      profile: found.profile,
    });
    setProfile(found.profile);

    return { success: true };
  };

  // Verify OTP (Email confirmation or recovery)
  const verifyOtp = async (
    email: string,
    token: string,
    type: 'signup' | 'recovery'
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseReady) {
      try {
        const { data: res, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: type === 'signup' ? 'signup' : 'recovery',
        });

        if (error) {
          return { success: false, error: error.message };
        }

        updatePendingEmail(null);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Verification failed' };
      }
    }

    // Mock store verification
    const isValid = mockStore.verifyOtp(email, token, type);
    if (!isValid) {
      return { success: false, error: 'Invalid or expired 6-digit verification code.' };
    }

    if (type === 'signup') {
      const users = mockStore.getUsers();
      const userToVerify = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (userToVerify) {
        userToVerify.isVerified = true;
        mockStore.saveUsers(users);
        mockStore.setCurrentSession(userToVerify);
        setUser({
          id: userToVerify.id,
          email: userToVerify.email,
          isVerified: true,
          profile: userToVerify.profile,
        });
        setProfile(userToVerify.profile);
      }
    }

    updatePendingEmail(null);
    return { success: true };
  };

  // Resend OTP
  const resendOtp = async (email: string, type: 'signup' | 'recovery'): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseReady) {
      try {
        if (type === 'recovery') {
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          if (error) return { success: false, error: error.message };
          return { success: true };
        } else {
          const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
          });
          if (error) return { success: false, error: error.message };
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to resend code' };
      }
    }

    // Mock OTP resend
    mockStore.saveOtp(email, '123456', type);
    return { success: true };
  };

  // Forgot Password request
  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseReady) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
          return { success: false, error: error.message };
        }
        updatePendingEmail(email);
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to request password reset' };
      }
    }

    // Mock forgot password
    mockStore.saveOtp(email, '123456', 'recovery');
    updatePendingEmail(email);
    return { success: true };
  };

  // Reset Password
  const resetPassword = async (
    newPassword: string,
    otpToken?: string,
    email?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseReady) {
      try {
        // If otp was provided, verify recovery OTP first
        if (otpToken && email) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            email,
            token: otpToken,
            type: 'recovery',
          });
          if (otpError) return { success: false, error: otpError.message };
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to reset password' };
      }
    }

    // Mock reset password
    if (otpToken && email) {
      const isValid = mockStore.verifyOtp(email, otpToken, 'recovery');
      if (!isValid) {
        return { success: false, error: 'Invalid or expired recovery code.' };
      }
    }

    const targetEmail = email || user?.email;
    if (!targetEmail) return { success: false, error: 'Email context missing.' };

    const users = mockStore.getUsers();
    const foundUser = users.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (foundUser) {
      foundUser.password = newPassword;
      mockStore.saveUsers(users);
      if (user?.id === foundUser.id) {
        mockStore.setCurrentSession(foundUser);
      }
    }

    return { success: true };
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseReady) {
      await supabase.auth.signOut();
    } else {
      mockStore.setCurrentSession(null);
    }
    setUser(null);
    setProfile(null);
    updatePendingEmail(null);
  };

  // Update Profile
  const updateProfile = async (fullName: string, phone: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'User not signed in.' };

    if (isSupabaseReady) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone,
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) return { success: false, error: error.message };

        setProfile(data as Profile);
        setUser((prev) => (prev ? { ...prev, profile: data as Profile } : null));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Mock update profile
    const users = mockStore.getUsers();
    const found = users.find((u) => u.id === user.id);
    if (found) {
      found.profile.full_name = fullName;
      found.profile.phone = phone;
      found.profile.updated_at = new Date().toISOString();
      mockStore.saveUsers(users);
      mockStore.setCurrentSession(found);
      setProfile(found.profile);
      setUser((prev) => (prev ? { ...prev, profile: found.profile } : null));
    }
    return { success: true };
  };

  // Helper for multi-account testing in mock mode
  const switchMockAccount = (email: string) => {
    const users = mockStore.getUsers();
    const target = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (target) {
      mockStore.setCurrentSession(target);
      setUser({
        id: target.id,
        email: target.email,
        isVerified: target.isVerified,
        profile: target.profile,
      });
      setProfile(target.profile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isSupabaseReady,
        pendingVerificationEmail,
        setPendingVerificationEmail: updatePendingEmail,
        signUp,
        signIn,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        signOut,
        updateProfile,
        switchMockAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
