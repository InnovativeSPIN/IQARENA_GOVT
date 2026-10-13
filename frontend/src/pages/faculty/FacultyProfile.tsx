import React, { useState, useEffect } from 'react';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  User,
  Mail,
  Phone,
  BarChart3,
  ClipboardList,
  Lock,
  LogOut,
  Calendar,
  School,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface SchoolTestItem {
  id: number;
  title: string;
  examType?: string;
  standard?: string;
  completedAttempts?: number;
  averageScore?: number | string;
  status?: string;
  startsAt?: string;
}

export default function FacultyProfile() {
  const { faculty, logout, updateProfile, changePassword } = useFacultyAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [schoolTests, setSchoolTests] = useState<SchoolTestItem[]>([]);
  const [loadingTests, setLoadingTests] = useState(true);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [editForm, setEditForm] = useState({ name: faculty?.name || '', phone: faculty?.phone || '' });

  useEffect(() => {
    setEditForm({ name: faculty?.name || '', phone: faculty?.phone || '' });
  }, [faculty]);

  // Fetch school tests
  useEffect(() => {
    setLoadingTests(true);
    apiFetch<{ success: boolean; tests: SchoolTestItem[] }>('/faculty/school/tests')
      .then((res) => {
        if (res?.success && Array.isArray(res.tests)) {
          setSchoolTests(res.tests);
        }
      })
      .catch((err) => {
        console.warn('Could not load school tests for profile:', err);
      })
      .finally(() => setLoadingTests(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    toast.success('Logged out successfully');
  };

  const handleChangePassword = () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error('Please fill all password fields');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    (async () => {
      try {
        await changePassword?.(passwords.current, passwords.new);
        setPasswords({ current: '', new: '', confirm: '' });
        setIsPasswordDialogOpen(false);
        toast.success('Password changed successfully');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to change password');
      }
    })();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('School Profile', 'பள்ளி சுயவிவரம்')}</h1>
        <p className="text-muted-foreground">{t('Manage your school account and view assigned tests', 'உங்கள் பள்ளி கணக்கை நிர்வகிக்கவும் மற்றும் சோதனைகளைக் காண்க')}</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-sm bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {faculty ? getInitials(faculty.name) : 'SC'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-foreground">{faculty?.name}</h2>
                <Badge variant="secondary" className="flex items-center gap-1 bg-primary/10 text-primary">
                  <School className="h-3.5 w-3.5" />
                  {t('School Account', 'பள்ளி கணக்கு')}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-3">{faculty?.email || 'School Portal Account'}</p>
              
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-muted/40 font-mono text-xs">
                  UDISE: {faculty?.userid || (faculty as any)?.udise_code || (faculty as any)?.id || 'Verified'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {schoolTests.length} {t('Tests Assigned', 'சோதனைகள்')}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(true); setEditForm({ name: faculty?.name || '', phone: faculty?.phone || '' }); }}>
                {t('Edit Profile', 'சுயவிவரத்தைத் திருத்து')}
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('Logout', 'வெளியேறு')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal / School Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t('School Information', 'பள்ளி விவரங்கள்')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <School className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('School Name', 'பள்ளி பெயர்')}</p>
                <p className="font-medium text-foreground">{faculty?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Email Address', 'மின்னஞ்சல் முகவரி')}</p>
                <p className="font-medium text-foreground">{faculty?.email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Phone Number', 'தொலைபேசி எண்')}</p>
                <p className="font-medium text-foreground">{faculty?.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Member Since', 'இணைந்த தேதி')}</p>
                <p className="font-medium text-foreground">
                  {faculty?.createdAt ? new Date(faculty.createdAt).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* School Tests & Shortcut to Test Reports (Replaces Allocated Subjects) */}
        <Card className="border-0 shadow-sm flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">{t('School Tests & Reports', 'பள்ளி தேர்வுகள் & அறிக்கைகள்')}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('Take test report shortcut for your school', 'உங்கள் பள்ளிக்கான தேர்வு அறிக்கை குறுக்குவழி')}
              </p>
            </div>
            {schoolTests.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/faculty/reports')}
                className="text-xs text-primary"
              >
                {t('View All', 'அனைத்தும்')} &rarr;
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
            {loadingTests ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t('Loading school tests...', 'சோதனைகள் ஏற்றப்படுகின்றன...')}
              </div>
            ) : schoolTests.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">{t('No published tests yet', 'இன்னும் தேர்வுகள் வெளியிடப்படவில்லை')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('Tests assigned to your school will appear here', 'உங்கள் பள்ளிக்கு ஒதுக்கப்பட்ட தேர்வுகள் இங்கே தோன்றும்')}
                </p>
              </div>
            ) : (
              schoolTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate" title={test.title}>
                        {test.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {test.examType && (
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                            {test.examType}
                          </Badge>
                        )}
                        {test.standard && <span>Std {test.standard}</span>}
                        {test.completedAttempts !== undefined && (
                          <span>• {test.completedAttempts} {t('attended', 'attended')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shortcut Button to Test Report */}
                  <Button
                    size="sm"
                    className="shrink-0 gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-sm"
                    onClick={() => navigate(`/faculty/reports/${test.id}`)}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{t('View Report', 'அறிக்கை')}</span>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t('Security', 'பாதுகாப்பு')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('Password', 'கடவுச்சொல்')}</p>
                <p className="text-sm text-muted-foreground">{t('Last changed 30 days ago', '30 நாட்களுக்கு முன்பு மாற்றப்பட்டது')}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(true)}>
              {t('Change Password', 'கடவுச்சொல்லை மாற்று')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit Profile', 'சுயவிவரத்தைத் திருத்து')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('Full Name', 'முழுப் பெயர்')}</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t('Phone', 'தொலைபேசி எண்')}</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>{t('Cancel', 'ரத்துசெய்க')}</Button>
            <Button onClick={async () => {
              try {
                await updateProfile?.({ name: editForm.name, phone: editForm.phone });
                toast.success(t('Profile updated', 'சுயவிவரம் புதுப்பிக்கப்பட்டது'));
                setIsEditDialogOpen(false);
              } catch (err: any) {
                toast.error(err?.message || t('Failed to update profile', 'சுயவிவரத்தைப் புதுப்பிப்பதில் தோல்வி'));
              }
            }}>{t('Save', 'சேமி')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Change Password', 'கடவுச்சொல்லை மாற்று')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('Current Password', 'தற்போதைய கடவுச்சொல்')}</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  placeholder={t('Enter current password', 'தற்போதைய கடவுச்சொல்லை உள்ளிடவும்')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('New Password', 'புதிய கடவுச்சொல்')}</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  placeholder={t('Enter new password', 'புதிய கடவுச்சொல்லை உள்ளிடவும்')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Confirm New Password', 'புதிய கடவுச்சொல்லை உறுதிப்படுத்துக')}</Label>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                placeholder={t('Confirm new password', 'புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              {t('Cancel', 'ரத்துசெய்க')}
            </Button>
            <Button onClick={handleChangePassword}>{t('Change Password', 'கடவுச்சொல்லை மாற்று')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
