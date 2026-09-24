
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
  const [signupFetched, setSignupFetched] = useState<{ name: string; phone: string } | null>(null);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-2 w-40 h-40 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob sm:top-20 sm:left-10 sm:w-72 sm:h-72"></div>
        <div className="absolute top-24 right-2 w-40 h-40 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000 sm:top-40 sm:right-10 sm:w-72 sm:h-72"></div>
        <div className="absolute -bottom-4 left-4 w-40 h-40 bg-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000 sm:-bottom-8 sm:left-20 sm:w-72 sm:h-72"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl mx-auto">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-orange-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left Panel - Branding */}
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-12 flex flex-col justify-center items-center text-white relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
              
              <div className="relative z-10 text-center space-y-6">
                {/* Logo */}
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-lg shadow-xl mb-4 transform hover:scale-110 transition-transform duration-300">
                  <img src={logo} alt="App Logo" className='w-30' />
                </div>
                
                {/* App Name */}
                <div>
                  <h1 className="text-5xl font-bold mb-3 tracking-tight">
                    {appName}
                  </h1>
                  <div className="h-1 w-24 bg-white/50 mx-auto rounded-full"></div>
                </div>
                
                <p className="text-xl text-orange-100 font-medium">
                  Online Exam Management Platform
                </p>

                {/* Motivational Quote */}
                <div className="mt-12 space-y-6">
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                    <blockquote className="text-center">
                      <p className="text-lg text-white italic mb-3">
                        "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
                      </p>
                      <footer className="text-orange-200 text-sm">
                        — Malcolm X
                      </footer>
                    </blockquote>
                  </div>
                  
                  {/* Image Placeholder */}
                  <div className="flex justify-center">
                    <img 
                      src="/login-illustration.png" 
                      alt="Online Learning" 
                      className="w-full max-w-xs rounded-2xl shadow-2xl opacity-90 hover:opacity-100 transition-opacity"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Form */}
            <div className="p-12 flex flex-col justify-center">
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

                  {/* User ID Input */}
                  <div className="space-y-2">
                    <Label htmlFor="userId" className="text-base font-semibold text-gray-700">
                      User ID
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                      <Input
                        id="userId"
                        type="text"
                        placeholder="Enter your User ID"
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
                  {/* Login is also automatic when all fields are filled */}
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
                      User ID
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500" />
                      <Input
                        id="signupUserId"
                        type="text"
                        placeholder="Enter or choose a User ID"
                        value={signupUserId}
                        onChange={(e) => setSignupUserId(e.target.value)}
                        className="pl-10 h-10 text-sm border-2 border-orange-200 focus:border-orange-500 rounded-lg"
                        required
                      />
                    </div>
                    {signupFetchLoading && signupUserId.trim() && (
                      <div className="mt-2 text-xs text-orange-500">Fetching...</div>
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
                  {/* Signup is also automatic when all fields are filled */}
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
)}