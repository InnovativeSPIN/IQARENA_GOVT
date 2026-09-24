import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Student } from '@/types/student';
import { useAuth } from '@/contexts/AuthContext'; // Sync with global auth

interface StudentAuthContextType {
  student: Student | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<boolean>;
  logout: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, logout: authLogout } = useAuth(); // Use global user role

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    // FIX: This prevents the Student provider from causing delays for Admins
    const fetchStudentProfile = async () => {
      // If there's no token OR if the current user is NOT a student, STOP immediately.
      if (!token || user?.role !== 'STUDENT') {
        return;
      }

      setLoading(true);
      try {
        // Replace with your real student profile endpoint when ready
        // const response = await fetch("https://tmhnu.nscet.org/api/student/profile", { ... });
      } catch (err) {
        console.warn('Student profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [user?.role, token]); // Re-run if user role changes

  const login = async (emailOrPhone: string, password: string): Promise<boolean> => {
    // Only allow login if strings are provided
    if (emailOrPhone && password) {
      // This is still mock data; update this when you connect your Student Login API
      setStudent({
        id: 'STU001',
        name: 'Rahul Kumar',
        email: 'rahul.kumar@email.com',
        phone: '+91 98765 43210',
        batch: 'NEET 2025 - Batch A',
        batchId: 'BATCH001',
        role: 'student',
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setStudent(null);
    authLogout(); // Ensure global state also logs out
  };

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (currentPassword && newPassword) {
      return true;
    }
    return false;
  };

  return (
    <StudentAuthContext.Provider
      value={{
        student,
        isAuthenticated: !!student,
        loading,
        login,
        logout,
        updatePassword,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
}