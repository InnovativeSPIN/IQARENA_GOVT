import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { User, Phone, Lock, Check, Loader2,Mail } from 'lucide-react';
import StudentLayout from '@/components/layout/StudentLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  email:string;
  phone: string;
  role: string;
  batch?: string | null;
}

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPasswordDigits, setCurrentPasswordDigits] = useState(['', '', '', '', '', '']);
  const [newPasswordDigits, setNewPasswordDigits] = useState(['', '', '', '', '', '']);
  const [confirmPasswordDigits, setConfirmPasswordDigits] = useState(['', '', '', '', '', '']);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const currentPasswordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newPasswordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPasswordRefs = useRef<(HTMLInputElement | null)[]>([]);

  const API_URL = import.meta.env.VITE_API_URL ;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiFetch(`/profile/user/${user.id}`);
        if (data?.success) {
          setProfile({
            id:  data.user.id,
            userId: data.user.userId,
            name: data.user.name,
            phone: data.user.phone,
            email:data.user.email,
            role: data.user.role,
            batch: data.user.batch || data.user.batchName || null,
          });
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to fetch profile",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Profile fetch error:', error);
        toast({
          title: "Error",
          description: "Failed to connect to server",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, API_URL, toast]);

  const handlePasswordDigitChange = (index: number, value: string, type: 'current' | 'new' | 'confirm') => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    if (type === 'current') {
      const newDigits = [...currentPasswordDigits];
      newDigits[index] = value;
      setCurrentPasswordDigits(newDigits);
      if (value && index < 5) {
        currentPasswordRefs.current[index + 1]?.focus();
      }
    } else if (type === 'new') {
      const newDigits = [...newPasswordDigits];
      newDigits[index] = value;
      setNewPasswordDigits(newDigits);
      if (value && index < 5) {
        newPasswordRefs.current[index + 1]?.focus();
      }
    } else if (type === 'confirm') {
      const newDigits = [...confirmPasswordDigits];
      newDigits[index] = value;
      setConfirmPasswordDigits(newDigits);
      if (value && index < 5) {
        confirmPasswordRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePasswordDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>, type: 'current' | 'new' | 'confirm') => {
    const digits = type === 'current' ? currentPasswordDigits : type === 'new' ? newPasswordDigits : confirmPasswordDigits;
    const refs = type === 'current' ? currentPasswordRefs : type === 'new' ? newPasswordRefs : confirmPasswordRefs;
    
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePasswordDigitPaste = (e: React.ClipboardEvent, type: 'current' | 'new' | 'confirm') => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const digits = pastedData.split('').filter(char => /^\d$/.test(char));
    
    if (type === 'current') {
      const newDigits = [...currentPasswordDigits];
      digits.forEach((digit, index) => {
        if (index < 6) newDigits[index] = digit;
      });
      setCurrentPasswordDigits(newDigits);
      const lastIndex = Math.min(digits.length, 5);
      currentPasswordRefs.current[lastIndex]?.focus();
    } else if (type === 'new') {
      const newDigits = [...newPasswordDigits];
      digits.forEach((digit, index) => {
        if (index < 6) newDigits[index] = digit;
      });
      setNewPasswordDigits(newDigits);
      const lastIndex = Math.min(digits.length, 5);
      newPasswordRefs.current[lastIndex]?.focus();
    } else if (type === 'confirm') {
      const newDigits = [...confirmPasswordDigits];
      digits.forEach((digit, index) => {
        if (index < 6) newDigits[index] = digit;
      });
      setConfirmPasswordDigits(newDigits);
      const lastIndex = Math.min(digits.length, 5);
      confirmPasswordRefs.current[lastIndex]?.focus();
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const currentPassword = currentPasswordDigits.join('');
    const newPassword = newPasswordDigits.join('');
    const confirmPassword = confirmPasswordDigits.join('');
    
    if (currentPassword.length !== 6) {
      toast({
        title: "Invalid current password",
        description: "Please enter all 6 digits of your current password.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length !== 6) {
      toast({
        title: "Invalid new password",
        description: "Please enter all 6 digits of your new password.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirmPassword.length !== 6) {
      toast({
        title: "Invalid confirmation",
        description: "Please enter all 6 digits to confirm your new password.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      
      toast({
        title: "Coming Soon",
        description: "Password change feature will be available soon.",
      });
      setShowChangePassword(false);
      setCurrentPasswordDigits(['', '', '', '', '', '']);
      setNewPasswordDigits(['', '', '', '', '', '']);
      setConfirmPasswordDigits(['', '', '', '', '', '']);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </StudentLayout>
    );
  }

  if (!profile) {
    return (
      <StudentLayout>
        <div className="p-6">
          <Card className="shadow-sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">Profile not available.</p>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="p-4 md:p-6 pb-24 lg:pb-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">View and manage your account</p>
        </div>

        {/* Profile Card */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-4 sm:p-6 text-primary-foreground">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl sm:text-3xl font-bold">{profile?.name?.charAt(0)}</span>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold">{profile?.name}</h2>
                <Badge variant="secondary" className="mt-2 bg-primary-foreground/20 text-primary-foreground border-0">
                  {profile?.role}
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* User ID */}
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
              <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">User ID</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{profile?.userId}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
              <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{profile?.phone}</p>
              </div>
            </div>
             <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
              <div className="p-2 sm:p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Email Id</p>
                <p className="font-medium text-sm sm:text-base text-foreground">{profile?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {profile?.batch && (
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent>
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Batch</p>
                  <p className="font-medium text-sm sm:text-base text-foreground">{profile.batch}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Change Password Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Password & Security
            </CardTitle>
            {!showChangePassword && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowChangePassword(true)}
              >
                Change Password
              </Button>
            )}
          </CardHeader>

          {showChangePassword && (
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-6">
                {/* Current Password - 6 Digit Input */}
                <div className="space-y-2">
                  <Label>Current Password (6 digits)</Label>
                  <div className="flex gap-2 justify-center sm:justify-start" onPaste={(e) => handlePasswordDigitPaste(e, 'current')}>
                    {currentPasswordDigits.map((value, index) => (
                      <Input
                        key={index}
                        ref={(el) => (currentPasswordRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value}
                        onChange={(e) => handlePasswordDigitChange(index, e.target.value, 'current')}
                        onKeyDown={(e) => handlePasswordDigitKeyDown(index, e, 'current')}
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold",
                          value && "border-primary bg-primary/5"
                        )}
                        autoFocus={index === 0}
                        required
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Enter your 6-digit current password</p>
                </div>

                {/* New Password - 6 Digit Input */}
                <div className="space-y-2">
                  <Label>New Password (6 digits)</Label>
                  <div className="flex gap-2 justify-center sm:justify-start" onPaste={(e) => handlePasswordDigitPaste(e, 'new')}>
                    {newPasswordDigits.map((value, index) => (
                      <Input
                        key={index}
                        ref={(el) => (newPasswordRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value}
                        onChange={(e) => handlePasswordDigitChange(index, e.target.value, 'new')}
                        onKeyDown={(e) => handlePasswordDigitKeyDown(index, e, 'new')}
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold",
                          value && "border-primary bg-primary/5"
                        )}
                        required
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Enter your new 6-digit password</p>
                </div>

                {/* Confirm Password - 6 Digit Input */}
                <div className="space-y-2">
                  <Label>Confirm New Password (6 digits)</Label>
                  <div className="flex gap-2 justify-center sm:justify-start" onPaste={(e) => handlePasswordDigitPaste(e, 'confirm')}>
                    {confirmPasswordDigits.map((value, index) => (
                      <Input
                        key={index}
                        ref={(el) => (confirmPasswordRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value}
                        onChange={(e) => handlePasswordDigitChange(index, e.target.value, 'confirm')}
                        onKeyDown={(e) => handlePasswordDigitKeyDown(index, e, 'confirm')}
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-bold",
                          value && "border-primary bg-primary/5"
                        )}
                        required
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Re-enter your new 6-digit password</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={isUpdating} className="gap-2">
                    {isUpdating ? (
                      <>Updating...</>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowChangePassword(false);
                      setCurrentPasswordDigits(['', '', '', '', '', '']);
                      setNewPasswordDigits(['', '', '', '', '', '']);
                      setConfirmPasswordDigits(['', '', '', '', '', '']);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        
      </div>
    </StudentLayout>
  );
}
