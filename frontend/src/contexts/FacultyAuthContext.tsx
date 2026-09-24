import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Faculty, AllocatedSubject } from '@/types/faculty';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface FacultyAuthContextType {
  faculty: Faculty | null;
  allocatedSubjects: AllocatedSubject[];
  isAuthenticated: boolean;
  loading?: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshProfile?: () => Promise<void>;
  updateProfile?: (payload: { name: string; phone: string; }) => Promise<any>;
  changePassword?: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

const FacultyAuthContext = createContext<FacultyAuthContextType | undefined>(undefined);

export function FacultyAuthProvider({ children }: { children: ReactNode }) {
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [allocatedSubjects, setAllocatedSubjects] = useState<AllocatedSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const { updateUser, logout: authLogout, user } = useAuth();

  const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('jwt_token')) : null;

  useEffect(() => {
    // If token present AND user role is FACULTY, auto-fetch profile
    const fetchProfile = async () => {
      // FIX: Only proceed if there's a token AND the user is actually a faculty member
      // This prevents the 403 error and the 5-second delay for Admin users
      if (!token || user?.role !== 'FACULTY') return; 

      setLoading(true);
      try {
        const data = await apiFetch('/faculty/profile', { headers: { Authorization: `Bearer ${token}` } });
        if (data?.success && data.faculty) {
          setFaculty(data.faculty);
          setAllocatedSubjects(data.faculty.allocatedSubjects || []);
          // Sync with global auth context
          updateUser?.({ 
            id: String(data.faculty.id), 
            name: data.faculty.name, 
            phone: data.faculty.phone || '', 
            role: 'FACULTY', 
            email: data.faculty.email || null 
          });
        }
      } catch (err) {
        console.warn('Failed to fetch faculty profile (automated):', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, user?.role, token]); // Added user?.role to dependency array to catch role changes

  const login = async (email: string, password: string): Promise<boolean> => {
      // Login logic is typically handled by the global AuthContext, 
      // but this returns the faculty state status.
      return !!faculty;
  };

  const refreshProfile = async (): Promise<void> => {
    if (!token || user?.role !== 'FACULTY') return;
    setLoading(true);
    try {
      const data = await apiFetch('/faculty/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (data?.success && data.faculty) {
        setFaculty(data.faculty);
        setAllocatedSubjects(data.faculty.allocatedSubjects || []);
      }
    } catch (err) {
      console.warn('Failed to refresh faculty profile', err);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (payload: { name: string; phone: string; }) => {
    if (!token) throw new Error('Not authenticated');
    const data = await apiFetch('/faculty/profile', { 
      method: 'PUT', 
      headers: { Authorization: `Bearer ${token}` }, 
      body: JSON.stringify(payload) 
    });
    if (data?.success && data.faculty) {
      setFaculty(data.faculty);
      updateUser?.({ 
        id: String(data.faculty.id), 
        name: data.faculty.name, 
        phone: data.faculty.phone || '', 
        role: 'FACULTY', 
        email: data.faculty.email || null 
      });
      return data.faculty;
    }
    throw new Error(data?.message || 'Failed to update profile');
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error('Not authenticated');
    const data = await apiFetch('/faculty/change-password', { 
      method: 'POST', 
      headers: { Authorization: `Bearer ${token}` }, 
      body: JSON.stringify({ currentPassword, newPassword }) 
    });
    if (data?.success) return true;
    throw new Error(data?.message || 'Failed to change password');
  };

  const logout = () => {
    setFaculty(null);
    setAllocatedSubjects([]);
    authLogout();
  };

  return (
    <FacultyAuthContext.Provider
      value={{
        faculty,
        allocatedSubjects,
        isAuthenticated: !!faculty,
        login,
        logout,
        refreshProfile,
        updateProfile,
        changePassword,
        loading
      }}
    >
      {children}
    </FacultyAuthContext.Provider>
  );
}

export function useFacultyAuth() {
  const context = useContext(FacultyAuthContext);
  if (context === undefined) {
    throw new Error('useFacultyAuth must be used within a FacultyAuthProvider');
  }
  return context;
}