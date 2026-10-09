import React, { useState, useEffect } from 'react';
import { useFacultyAuth } from '@/contexts/FacultyAuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
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
  BookOpen,
  Lock,
  LogOut,
  Calendar,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

export default function FacultyProfile() {
  const { faculty, allocatedSubjects, logout, updateProfile, changePassword } = useFacultyAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [editForm, setEditForm] = useState({ name: faculty?.name || '', phone: faculty?.phone || '' });

  useEffect(() => {
    setEditForm({ name: faculty?.name || '', phone: faculty?.phone || '' });
  }, [faculty]);

  const handleLogout = () => {
    logout();
    navigate('/faculty/login');
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('Profile', 'சுயவிவரம்')}</h1>
        <p className="text-muted-foreground">{t('Manage your account settings', 'உங்கள் கணக்கு அமைப்புகளை நிர்வகிக்கவும்')}</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {faculty ? getInitials(faculty.name) : 'FC'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{faculty?.name}</h2>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {t('Faculty', 'ஆசிரியர்கள்')}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{faculty?.email}</p>
              <div className="flex flex-wrap gap-2">
                {allocatedSubjects.map((subject) => (
                  <Badge key={subject.id} variant="outline">
                    {subject.subjectName} ({subject.examType})
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setIsEditDialogOpen(true); setEditForm({ name: faculty?.name || '', phone: faculty?.phone || '' }); }}>
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
        {/* Personal Information */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t('Personal Information', 'தனிப்பட்ட விவரங்கள்')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Full Name', 'முழுப் பெயர்')}</p>
                <p className="font-medium">{faculty?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Email Address', 'மின்னஞ்சல் முகவரி')}</p>
                <p className="font-medium">{faculty?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Phone Number', 'தொலைபேசி எண்')}</p>
                <p className="font-medium">{faculty?.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('Member Since', 'இணைந்த தேதி')}</p>
                <p className="font-medium">
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

        {/* Allocated Subjects */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t('Allocated Subjects', 'ஒதுக்கப்பட்ட பாடங்கள்')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allocatedSubjects.map((subject) => (
              <div 
                key={subject.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{subject.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {subject.topicCount} {t('topics', 'தலைப்புகள்')} • {subject.questionCount} {t('questions', 'வினாக்கள்')}
                    </p>
                  </div>
                </div>
                <Badge variant={subject.examType === 'NEET' ? 'default' : 'secondary'}>
                  {subject.examType}
                </Badge>
              </div>
            ))}

            {allocatedSubjects.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                {t('No subjects allocated yet', 'இதுவரை பாடங்கள் ஒதுக்கப்படவில்லை')}
              </div>
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
