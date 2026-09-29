
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import logo from "../../public/logo.png";

export default function Login() {
  const { loginWithToken } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  // Login fields
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  // ...existing code...
  // Signup fields
  const [signupUserId, setSignupUserId] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupFetched, setSignupFetched] = useState<{ name: string; phone: string; school_name?: string; standard?: string; section?: string; } | null>(null);
  const [signupFetchLoading, setSignupFetchLoading] = useState(false);
  const [signupPin, setSignupPin] = useState(['', '', '', '', '', '']);
  const signupPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Auto-fetch user details for signup when userId changes (debounced)
  useEffect(() => {
    if (!signupUserId.trim()) {
      setSignupFetched(null);
      setSignupName('');
      setSignupPhone('');
      return;
    }
    const timer = setTimeout(async () => {
      setSignupFetchLoading(true);
      try {
        const res = await apiFetch(`/auth/user/${signupUserId}`);
        setSignupFetched(res.data);
        setSignupName(res.data.name || '');
        setSignupPhone(res.data.phone || '');
      } catch {
        setSignupFetched(null);
        setSignupName('');
        setSignupPhone('');
      } finally {
        setSignupFetchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [signupUserId]);
  const navigate = useNavigate();
  const appName = import.meta.env.VITE_APP_NAME || 'IQARENA';

  const handlePinChange = (index: number, value: string) => {
    const numValue = value.replace(/\D/g, '');
    
    if (numValue.length > 1) {
      return;
    }

    const newPin = [...pin];
    newPin[index] = numValue;
    setPin(newPin);

    if (numValue && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (pin[index]) {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      } else if (index > 0) {
        pinRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handleSignupPinChange = (index: number, value: string) => {
    const numValue = value.replace(/\D/g, '');
    
    if (numValue.length > 1) {
      return;
    }

    const newPin = [...signupPin];
    newPin[index] = numValue;
    setSignupPin(newPin);

    if (numValue && index < 5) {
      signupPinRefs.current[index + 1]?.focus();
    }
  };

  const handleSignupPinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (signupPin[index]) {
        const newPin = [...signupPin];
        newPin[index] = '';
        setSignupPin(newPin);
      } else if (index > 0) {
        signupPinRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      signupPinRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      signupPinRefs.current[index + 1]?.focus();
    }
  };

  useEffect(() => {
    const tryAutoLogin = async () => {
      if (userId.trim() && pin.join('').length === 6) {
        setIsLoading(true);
        try {
          const res = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ userId, password: pin.join('') })
          });
          loginWithToken(res.data.token, {
            id: res.data.userId,
            name: res.data.name,
            phone: res.data.phone,
            role: res.data.role,
          });
          toast.success('Welcome back!');
          // Redirect based on role
          setTimeout(() => {
            if (res.data.role === 'ADMIN') {
              navigate('/admin', { replace: true });
            } else if (res.data.role === 'FACULTY') {
              navigate('/faculty', { replace: true });
            } else {
              navigate('/student', { replace: true });
            }
          }, 500);
        } catch (error: any) {
          toast.error(error.message || 'Login failed');
        } finally {
          setIsLoading(false);
        }
      }
    };
    tryAutoLogin();
  }, [userId, pin, navigate, loginWithToken]);

  useEffect(() => {
    const tryAutoSignup = async () => {
      if (
        signupUserId.trim() &&
        signupName.trim() &&
        signupPhone.trim() &&
        signupPhone.length === 10 &&
        signupPin.join('').length === 6
      ) {
        setIsLoading(true);
        try {
          await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              userId: signupUserId,
              name: signupName,
              phone: signupPhone,
              password: signupPin.join('')
            })
          });
          toast.success('Account created successfully!');
          setIsLogin(true);
          setSignupUserId('');
          setSignupName('');
          setSignupPhone('');
          setSignupPin(['', '', '', '', '', '']);
          setSignupFetched(null);
        } catch (error: any) {
          toast.error(error.message || 'Signup failed');
        } finally {
          setIsLoading(false);
        }
      }
    };
    tryAutoSignup();
  }, [signupUserId, signupName, signupPhone, signupPin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/70 via-orange-50/50 to-orange-100/80 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background IQ Arena watermark / logo */}
      <div 
        className="absolute inset-0 pointer-events-none bg-no-repeat bg-center bg-contain opacity-[0.05] select-none scale-75"
        style={{ backgroundImage: `url('/iqlogo.png')` }}
      />

      {/* Subtle Animated Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -left-16 w-80 h-80 sm:w-96 sm:h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-16 -right-16 w-80 h-80 sm:w-96 sm:h-96 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-5 sm:gap-6 z-10 my-auto">
        {/* TOP HEADER: Tamil Nadu Govt & NSCET Collaboration Header */}
        <header className="w-full">
          <div className="bg-white/90 backdrop-blur-md border border-orange-200/90 shadow-lg shadow-orange-500/5 rounded-2xl px-5 py-3.5 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-4">
            {/* Left: TN Govt Emblem & Department Details */}
            <div className="flex items-center gap-3.5 sm:gap-4">
              <img 
                src="/tn-govt-logo.png" 
                alt="Government of Tamil Nadu" 
                className="h-14 sm:h-16 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105 duration-300" 
              />
              <div className="flex flex-col">
                <span className="text-xs sm:text-sm font-bold tracking-wider text-orange-950 uppercase">
                  தமிழ்நாடு அரசு | Government of Tamil Nadu
                </span>
                <span className="text-sm sm:text-base font-extrabold text-orange-700 leading-tight">
                  பள்ளிக்கல்வித்துறை - தேனி மாவட்டம்
                </span>
                <span className="text-[11px] sm:text-xs text-gray-600 font-medium">
                  Department of School Education - Theni District
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Card Container */}
        <div className="w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-orange-200/90">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left Panel - Branding */}
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-8 sm:p-12 flex flex-col justify-between items-center text-white relative overflow-hidden min-h-[460px]">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24 pointer-events-none"></div>
              
              <div className="relative z-10 w-full flex flex-col items-center justify-center my-auto text-center space-y-6">
                {/* Logo - completely transparent without white box background */}
                <div className="flex items-center justify-center">
                  <img 
                    src="/iqlogo.jpeg" 
                    alt="IQ Arena Logo" 
                    className="h-24 sm:h-28 w-auto object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)] hover:scale-105 transition-transform duration-300" 
                  />
                </div>
                
                {/* App Name & Subtitle */}
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-2 tracking-tight drop-shadow-sm">
                    IQARENA
                  </h1>
                 
                  <div className="h-1 w-20 bg-white/60 mx-auto rounded-full mt-3"></div>
                </div>
                
                <p className="text-sm sm:text-base text-orange-100/90 font-medium max-w-sm">
                   Online Exam & Assessment Management Portal
                </p>

                {/* Quote Box */}
                <div className="w-full max-w-md bg-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/20 shadow-inner">
                  <blockquote className="text-center">
                    <p className="text-sm sm:text-base text-white font-medium italic mb-1.5">
                      "கற்க கசடறக் கற்பவை கற்றபின் <br className="hidden sm:inline" /> நிற்க அதற்குத் தக."
                    </p>
                    <footer className="text-orange-200 text-xs sm:text-sm font-semibold">
                      — திருக்குறள் (குறள் 391)
                    </footer>
                  </blockquote>
                </div>

                <div className="mt-6 sm:mt-10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
                  <span className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-white/70" />
                  <p className="nscet-shimmer text-xs sm:text-sm font-bold tracking-[0.25em] uppercase">
                    A Product of NSCET
                  </p>
                  <span className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-white/70" />
                </div>
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="p-8 sm:p-12 flex flex-col justify-center">
              {/* Tab Switcher */}
              <div className="flex gap-2 mb-8 p-1 ">
                {/* <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                    isLogin
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                      : 'text-orange-700 hover:bg-orange-200/50'
                  }`}
                >
                  Login
                </button> */}
                {/* <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all duration-300 ${
                    !isLogin
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                      : 'text-orange-700 hover:bg-orange-200/50'
                  }`}
                >
                  Sign Up
                </button> */}
              </div>

              {/* Login Form */}
              {isLogin ? (
                <form className="space-y-6" autoComplete="off" onSubmit={async (e) => {
                  e.preventDefault();
                  if (userId.trim() && pin.join('').length === 6) {
                    setIsLoading(true);
                    try {
                      const res = await apiFetch('/auth/login', {
                        method: 'POST',
                        body: JSON.stringify({ userId, password: pin.join('') })
                      });
                      // Store token and set auth context
                      loginWithToken(res.data.token, {
                        id: res.data.userId,
                        name: res.data.name,
                        phone: res.data.phone,
                        role: res.data.role,
                      });
                      toast.success('Welcome back!');
                      // Redirect based on role
                      if (res.data.role === 'ADMIN') {
                        navigate('/admin', { replace: true });
                      } else if (res.data.role === 'FACULTY') {
                        navigate('/faculty', { replace: true });
                      } else {
                        navigate('/student', { replace: true });
                      }
                    } catch (error: any) {
                      toast.error(error.message || 'Login failed');
                    } finally {
                      setIsLoading(false);
                    }
                  } else {
                    toast.error('Please enter User ID and 6-digit PIN');
                  }
                }}>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                      Welcome Back
                    </h2>
                  </div>

                  {/* User ID / Email Input */}
                  <div className="space-y-2">
                    <Label htmlFor="userId" className="text-base font-semibold text-gray-700">
                      User ID / Email
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                      <Input
                        id="userId"
                        type="text"
                        placeholder="Enter your User ID or Email"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="pl-12 h-12 sm:h-14 text-base border-2 border-orange-200 focus:border-orange-500 rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  {/* 6-Digit PIN Input */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-orange-500" />
                      6-Digit PIN
                    </Label>
                    <div className="flex gap-2 justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border-2 border-orange-200">
                      {pin.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            pinRefs.current[index] = el;
                          }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinChange(index, e.target.value)}
                          onKeyDown={(e) => handlePinKeyDown(index, e)}
                          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold border-2 border-orange-300 rounded-xl focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all bg-white hover:border-orange-400 shadow-sm"
                          aria-label={`PIN digit ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <Button type="submit" size="lg" className="w-full max-w-xs" disabled={isLoading}>
                      {isLoading ? 'Logging In...' : 'Login'}
                    </Button>
                  </div>
                  <div className="pt-2 flex justify-center text-sm text-gray-600">
                    Don't have an account? 
                    <button type="button" onClick={() => setIsLogin(false)} className="ml-1 font-semibold text-orange-600 hover:text-orange-700 underline">
                      Sign Up
                    </button>
                  </div>
                </form>
              ) : (
                /* Signup Form */
                <form className="space-y-3" autoComplete="off" onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    signupUserId.trim() &&
                    signupName.trim() &&
                    signupPhone.trim() &&
                    signupPhone.length === 10 &&
                    signupPin.join('').length === 6
                  ) {
                    setIsLoading(true);
                    try {
                      await apiFetch('/auth/register', {
                        method: 'POST',
                        body: JSON.stringify({
                          userId: signupUserId,
                          name: signupName,
                          phone: signupPhone,
                          password: signupPin.join('')
                        })
                      });
                      toast.success('Account created successfully!');
                      setIsLogin(true);
                      setSignupUserId('');
                      setSignupName('');
                      setSignupPhone('');
                      setSignupPin(['', '', '', '', '', '']);
                      setSignupFetched(null);
                    } catch (error: any) {
                      toast.error(error.message || 'Signup failed');
                    } finally {
                      setIsLoading(false);
                    }
                  } else {
                    toast.error('Please fill all fields correctly');
                  }
                }}>
                  <div className="text-center mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                      Create Account
                    </h2>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="signupUserId" className="text-xs font-semibold text-gray-700">
                      User ID / Email
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                      <Input
                        id="signupUserId"
                        type="text"
                        placeholder="Enter your User ID or Email"
                        value={signupUserId}
                        onChange={(e) => setSignupUserId(e.target.value)}
                        className="pl-10 h-10 text-sm border-2 border-orange-200 focus:border-orange-500 rounded-lg"
                        required
                      />
                    </div>
                    {signupFetchLoading && signupUserId.trim() && (
                      <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                        <span className="animate-spin inline-block w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full"></span>
                        Fetching your details...
                      </div>
                    )}
                    {signupFetched && !signupFetchLoading && (
                      <div className="mt-3 space-y-2">
                        {signupFetched.school_name && (
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold text-gray-700">School</Label>
                            <div className="h-10 px-3 flex items-center rounded-lg border-2 border-orange-200 bg-orange-50/60 text-sm text-gray-700 font-medium">
                              {signupFetched.school_name}
                            </div>
                          </div>
                        )}
                        {signupFetched.standard && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold text-gray-700">Class</Label>
                              <div className="h-10 px-3 flex items-center rounded-lg border-2 border-orange-200 bg-orange-50/60 text-sm text-gray-700 font-medium">
                                {signupFetched.standard}
                              </div>
                            </div>
                            {signupFetched.section && (
                              <div className="space-y-1">
                                <Label className="text-xs font-semibold text-gray-700">Section</Label>
                                <div className="h-10 px-3 flex items-center rounded-lg border-2 border-orange-200 bg-orange-50/60 text-sm text-gray-700 font-medium">
                                  {signupFetched.section}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {!signupFetchLoading && signupUserId.trim().length > 4 && !signupFetched && (
                      <div className="mt-2 text-xs text-red-500">User ID not found. You can still sign up as a new user.</div>
                    )}
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1">
                    <Label htmlFor="signupName" className="text-xs font-semibold text-gray-700">
                      Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="signupName"
                        type="text"
                        placeholder="Enter your name"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="h-10 text-sm border-2 border-orange-200 focus:border-orange-500 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1">
                    <Label htmlFor="signupPhone" className="text-xs font-semibold text-gray-700">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                      <Input
                        id="signupPhone"
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="pl-10 h-10 text-sm border-2 border-orange-200 focus:border-orange-500 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-orange-500" />
                      6-Digit PIN
                    </Label>
                    <div className="flex gap-1.5 justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border-2 border-orange-200">
                      {signupPin.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            signupPinRefs.current[index] = el;
                          }}
                          type="password"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleSignupPinChange(index, e.target.value)}
                          onKeyDown={(e) => handleSignupPinKeyDown(index, e)}
                          className="w-8 h-10 sm:w-10 sm:h-10 text-center text-lg sm:text-xl font-bold border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all bg-white hover:border-orange-400 shadow-sm"
                          aria-label={`Signup PIN digit ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <Button type="submit" size="lg" className="w-full max-w-xs" disabled={isLoading}>
                      {isLoading ? 'Signing Up...' : 'Sign Up'}
                    </Button>
                  </div>
                  <div className="pt-2 flex justify-center text-sm text-gray-600">
                    Already have an account? 
                    <button type="button" onClick={() => setIsLogin(true)} className="ml-1 font-semibold text-orange-600 hover:text-orange-700 underline">
                      Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
)}