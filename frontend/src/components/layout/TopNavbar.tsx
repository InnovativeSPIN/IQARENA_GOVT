import { Bell, Search, Menu, Lock, Key } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TopNavbarProps {
  onMenuClick?: () => void;
}

export function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const { user: admin, logout } = useAuth();
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState(['', '', '', '', '', '']);
  const [confirmPassword, setConfirmPassword] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [notifLogs, setNotifLogs] = useState<Array<{ testId: number; title: string; recipients: number; readCount: number; schools: string | null; sentAt: string }>>([]);
  useEffect(() => {
    apiFetch<{ success: boolean; logs: typeof notifLogs }>('/admin/tests/notification-logs')
      .then(res => { if (res?.success) setNotifLogs(res.logs); })
      .catch(() => {});
  }, []);
  // Badge: alerts sent in the last 24 hours
  const recentCount = notifLogs.filter(n => Date.now() - new Date(n.sentAt).getTime() < 24 * 60 * 60 * 1000).length;

  const currentPasswordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const newPasswordRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmPasswordRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (
    index: number,
    value: string,
    pinArray: string[],
    setPinArray: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    const numValue = value.replace(/\D/g, '');
    
    if (numValue.length > 1) {
      return;
    }

    const newPin = [...pinArray];
    newPin[index] = numValue;
    setPinArray(newPin);

    if (numValue && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    pinArray: string[],
    setPinArray: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === 'Backspace') {
      if (pinArray[index]) {
        const newPin = [...pinArray];
        newPin[index] = '';
        setPinArray(newPin);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleResetPassword = async () => {
    const currentPinString = currentPassword.join('');
    const newPinString = newPassword.join('');
    const confirmPinString = confirmPassword.join('');

    if (currentPinString.length !== 6) {
      toast.error('Current password must be 6 digits');
      return;
    }

    if (newPinString.length !== 6) {
      toast.error('New password must be 6 digits');
      return;
    }

    if (confirmPinString.length !== 6) {
      toast.error('Confirm password must be 6 digits');
      return;
    }

    if (newPinString !== confirmPinString) {
      toast.error('New password and confirm password do not match');
      return;
    }

    if (currentPinString === newPinString) {
      toast.error('New password must be different from current password');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual password reset API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated API call
      toast.success('Password updated successfully!');
      setIsResetPasswordOpen(false);
      // Reset form
      setCurrentPassword(['', '', '', '', '', '']);
      setNewPassword(['', '', '', '', '', '']);
      setConfirmPassword(['', '', '', '', '', '']);
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Mobile Menu */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md">
         
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 pl-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {admin?.name?.charAt(0) || 'A'}
                  </span>
                </div>
                <span className="hidden md:inline text-sm font-medium">
                  {admin?.name || 'Admin'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsResetPasswordOpen(true)}>
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications: latest test alerts sent to students */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {recentCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px]">
                    {recentCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifLogs.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted-foreground text-center">No notifications yet</p>
              ) : (
                notifLogs.slice(0, 5).map(n => (
                  <DropdownMenuItem key={n.testId} className="flex flex-col items-start gap-1 py-3" onClick={() => navigate('/admin/notifications')}>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent to {n.recipients} students{n.schools ? ` • ${n.schools}` : ''} • {n.readCount} read
                    </p>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary" onClick={() => navigate('/admin/notifications')}>
                View all
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Lock className="w-6 h-6 text-orange-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Enter your current password and new 6-digit password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Current Password */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-500" />
                Current Password
              </Label>
              <div className="flex gap-2 justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200">
                {currentPassword.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      currentPasswordRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(
                        index,
                        e.target.value,
                        currentPassword,
                        setCurrentPassword,
                        currentPasswordRefs
                      )
                    }
                    onKeyDown={(e) =>
                      handlePinKeyDown(
                        index,
                        e,
                        currentPassword,
                        setCurrentPassword,
                        currentPasswordRefs
                      )
                    }
                    className="w-10 h-12 text-center text-xl font-bold border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all bg-white hover:border-orange-400 shadow-sm"
                    aria-label={`Current password digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-orange-500" />
                New Password
              </Label>
              <div className="flex gap-2 justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200">
                {newPassword.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      newPasswordRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(
                        index,
                        e.target.value,
                        newPassword,
                        setNewPassword,
                        newPasswordRefs
                      )
                    }
                    onKeyDown={(e) =>
                      handlePinKeyDown(
                        index,
                        e,
                        newPassword,
                        setNewPassword,
                        newPasswordRefs
                      )
                    }
                    className="w-10 h-12 text-center text-xl font-bold border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all bg-white hover:border-orange-400 shadow-sm"
                    aria-label={`New password digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
                <Key className="w-4 h-4 text-orange-500" />
                Confirm New Password
              </Label>
              <div className="flex gap-2 justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200">
                {confirmPassword.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      confirmPasswordRefs.current[index] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) =>
                      handlePinChange(
                        index,
                        e.target.value,
                        confirmPassword,
                        setConfirmPassword,
                        confirmPasswordRefs
                      )
                    }
                    onKeyDown={(e) =>
                      handlePinKeyDown(
                        index,
                        e,
                        confirmPassword,
                        setConfirmPassword,
                        confirmPasswordRefs
                      )
                    }
                    className="w-10 h-12 text-center text-xl font-bold border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all bg-white hover:border-orange-400 shadow-sm"
                    aria-label={`Confirm password digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsResetPasswordOpen(false);
                setCurrentPassword(['', '', '', '', '', '']);
                setNewPassword(['', '', '', '', '', '']);
                setConfirmPassword(['', '', '', '', '', '']);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleResetPassword}
              disabled={isLoading}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
