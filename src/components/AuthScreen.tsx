import React, { useState } from 'react';
import {
  Store,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Lock,
  User,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { StoreType } from '../types';

interface AuthScreenProps {
  onSuccess?: () => void;
}

type AuthMethod = 'google' | 'email_login' | 'email_signup' | 'phone';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPhoneOtp,
    signInWithPhone,
    sendPasswordReset,
    continueAsGuest,
    storeType,
    setStoreType,
    isLoading,
  } = useAuth();

  const [method, setMethod] = useState<AuthMethod>('email_signup');
  const [selectedType, setSelectedType] = useState<StoreType>(storeType || 'shop');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  
  // Phone auth states
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [generatedTestOtp, setGeneratedTestOtp] = useState<string | null>(null);

  // Status & error feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPass, setShowForgotPass] = useState(false);

  const handleTypeChange = (type: StoreType) => {
    setSelectedType(type);
    setStoreType(type);
  };

  // Google sign in
  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMsg(err.message || 'Google sign-in was cancelled or failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Email login / signup
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (method === 'email_signup') {
        await signUpWithEmail(email, password, ownerName || 'Store Owner', selectedType);
        setSuccessMsg('Account created successfully! Loading your business workspace...');
      } else {
        await signInWithEmail(email, password);
        setSuccessMsg('Signed in successfully!');
      }
      onSuccess?.();
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      let msg = err.message || 'Authentication failed. Please verify your credentials.';
      if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account with this email already exists. Please switch to Sign In.';
      } else if (msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        msg = 'Invalid email or password. Please try again.';
      } else if (msg.includes('auth/user-not-found')) {
        msg = 'No account found with this email. Please create an account.';
      }
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password reset
  const handlePasswordReset = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address to receive password reset link.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await sendPasswordReset(email);
      setSuccessMsg(`Password reset link sent to ${email}. Check your inbox.`);
      setShowForgotPass(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send Phone OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    if (phoneNumber.replace(/\D/g, '').length < 8) {
      setErrorMsg('Please enter a valid mobile phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendPhoneOtp(fullPhone);
      setVerificationId(res.verificationId);
      setOtpSent(true);
      if (res.testCode) {
        setGeneratedTestOtp(res.testCode);
        setSuccessMsg(`OTP sent to ${fullPhone}! Fast verification code: ${res.testCode}`);
      } else {
        setSuccessMsg(`OTP sent to ${fullPhone}. Please enter the code below.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!otpCode) {
      setErrorMsg('Please enter the OTP verification code.');
      return;
    }

    const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
    setIsSubmitting(true);
    try {
      await signInWithPhone(fullPhone, otpCode, ownerName || businessName || 'Store Owner');
      setSuccessMsg('Mobile verification successful!');
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code. Please re-enter.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Guest / Demo Mode
  const handleExploreGuest = (type: StoreType = 'shop') => {
    continueAsGuest(type, 'Shree Krishna General Store');
    onSuccess?.();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-indigo-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl z-10">
        {/* Top Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 border border-emerald-400/30">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Sale Analytics
              </h1>
              <p className="text-xs text-slate-400">
                Created by Sukrit Ghosh • Small Stores & Retailers
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Direct daily record of item selling price and purchase cost. Instant daily profit & loss analysis, shop expense tracking, and true earnings without customer phone hassle.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Store Workspace Banner */}
          <div className="mb-6 p-3.5 bg-indigo-950/40 border border-indigo-800/60 rounded-xl flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white">Small Store & Retail Counter Workspace</div>
              <div className="text-[11px] text-indigo-300/80">
                Grocery, General Store, Pharmacy, Apparel, Daily Counter POS
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">{successMsg}</div>
            </div>
          )}

          {/* 2. Google Sign-In (Primary One-Click Option) */}
          <div className="mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting || isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 text-sm cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-5">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
              Or sign in with
            </span>
          </div>

          {/* 3. Auth Method Switcher Tabs: Email vs Mobile Phone */}
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 mb-5">
            <button
              type="button"
              onClick={() => {
                setMethod('email_signup');
                setShowForgotPass(false);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                method === 'email_signup' || method === 'email_login'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email Address</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMethod('phone');
                setShowForgotPass(false);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                method === 'phone'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Mobile Number</span>
            </button>
          </div>

          {/* Method A: Email Authentication */}
          {(method === 'email_login' || method === 'email_signup') && (
            <div>
              {/* Sub-tab: Login vs Create Account */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <span className="text-xs font-medium text-slate-300">
                  {method === 'email_signup' ? 'Create a New Store Account' : 'Sign In to Your Store'}
                </span>
                <button
                  type="button"
                  onClick={() => setMethod(method === 'email_signup' ? 'email_login' : 'email_signup')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                >
                  {method === 'email_signup' ? 'Already have an account? Sign In' : 'New here? Create Account'}
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                {method === 'email_signup' && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Store / Business Name</label>
                      <div className="relative">
                        <ShoppingBag className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Laxmi General Store & Daily Mart"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Owner / Manager Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="e.g. Rajesh Sharma"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="shopowner@gmail.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-slate-400">Password</label>
                    {method === 'email_login' && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPass(!showForgotPass)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {showForgotPass && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">Send password reset link to {email || 'your email'}?</span>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-xs px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium"
                    >
                      Send Reset Link
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-4 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{method === 'email_signup' ? 'Create Business Account' : 'Sign In to Dashboard'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Method B: Mobile Phone OTP Authentication (Ideal for Shopkeepers) */}
          {method === 'phone' && (
            <div>
              <div className="mb-4 border-b border-slate-800 pb-2">
                <span className="text-xs font-medium text-slate-300">
                  Shopkeeper Mobile OTP Sign-In
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Designed for counter retailers: fast 6-digit OTP verification.
                </p>
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Store / Shopkeeper Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Ramesh Patel"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Mobile Phone Number</label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-2.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="+91">🇮🇳 +91 (IN)</option>
                        <option value="+1">🇺🇸 +1 (US)</option>
                        <option value="+44">🇬🇧 +44 (UK)</option>
                        <option value="+971">🇦🇪 +971 (AE)</option>
                        <option value="+65">🇸🇬 +65 (SG)</option>
                        <option value="+61">🇦🇺 +61 (AU)</option>
                      </select>
                      <div className="relative flex-1">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="98765 43210"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-4 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-3.5">
                  <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
                    <div>
                      <span>Sent to </span>
                      <span className="font-semibold">{countryCode} {phoneNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-indigo-400 hover:text-white underline"
                    >
                      Change Number
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs text-slate-400">Enter 6-Digit OTP</label>
                      {generatedTestOtp && (
                        <button
                          type="button"
                          onClick={() => setOtpCode(generatedTestOtp)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono font-semibold"
                        >
                          Auto-fill: {generatedTestOtp}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-base font-mono tracking-widest text-slate-100 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const fullPhone = `${countryCode}${phoneNumber.replace(/\D/g, '')}`;
                        sendPhoneOtp(fullPhone).then((r) => {
                          if (r.testCode) {
                            setGeneratedTestOtp(r.testCode);
                            setSuccessMsg(`Resent! Fast code: ${r.testCode}`);
                          }
                        });
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Resend OTP</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || isLoading}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 px-4 rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Enter Store</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 4. Guest / Demo Mode Quick Access */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="text-center mb-3">
              <span className="text-xs text-slate-500">Want to test without signing up right now?</span>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => handleExploreGuest('shop')}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white transition text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Explore Demo Store & Daily Register (No Sign Up Needed)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Business Assurances Footnote */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Private Business Records</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>12+ Month Sales Analytics</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-blue-400" />
            <span>Works Offline & On Mobile</span>
          </div>
        </div>
      </div>
    </div>
  );
};
