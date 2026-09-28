import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StudentAuthProvider } from "@/contexts/StudentAuthContext";
import { FacultyAuthProvider } from "@/contexts/FacultyAuthContext";

// Admin Pages
import Login from "./pages/Login";
import BatchManagement from "./pages/admin/BatchManagement";
import Dashboard from "./pages/admin/Dashboard";
import UserManagement from "./pages/admin/UserManagement";
import ExamManagement from "./pages/admin/ExamManagement";
import SubjectManagement from "./pages/admin/SubjectManagement";
import TopicManagement from "./pages/admin/TopicManagement";
import QuestionManagement from "./pages/admin/QuestionManagement";
import TestManagement from "./pages/admin/TestManagement";
import NotificationLogs from "./pages/admin/NotificationLogs";
import SchoolManagement from "./pages/admin/SchoolManagement";
import NotFound from "./pages/NotFound";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import AssignedTests from "./pages/student/AssignedTests";
import ExamInterface from "./pages/student/ExamInterface";
import ExamComplete from "./pages/student/ExamComplete";
import StudentResults from "./pages/student/StudentResults";
import ResultDetail from "./pages/student/ResultDetail";
import StudentProfile from "./pages/student/StudentProfile";
import StudentNotifications from "./pages/student/StudentNotifications";
import StudentHelp from "./pages/student/StudentHelp";

// Faculty Pages
import FacultyLayout from "./components/layout/FacultyLayout";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultySubjects from "./pages/faculty/FacultySubjects";
import FacultyQuestions from "./pages/faculty/FacultyQuestions";
import FacultyProposals from "./pages/faculty/FacultyProposals";
import FacultyPerformance from "./pages/faculty/FacultyPerformance";
import FacultyNotifications from "./pages/faculty/FacultyNotifications";
import FacultyProfile from "./pages/faculty/FacultyProfile";

const queryClient = new QueryClient();

// Protected route that checks authentication and role
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, role } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'FACULTY') return <Navigate to="/faculty" replace />;
    if (role === 'STUDENT') return <Navigate to="/student" replace />;
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, role } = useAuth();

  const LoginRoute = () => {
    if (isAuthenticated) {
      if (role === 'ADMIN') return <Navigate to="/admin" replace />;
      if (role === 'FACULTY') return <Navigate to="/faculty" replace />;
      if (role === 'STUDENT') return <Navigate to="/student" replace />;
    }
    return <Login />;
  };

  // Landing route - redirect based on auth
  const LandingRoute = () => {
    if (isAuthenticated) {
      if (role === 'ADMIN') return <Navigate to="/admin" replace />;
      if (role === 'FACULTY') return <Navigate to="/faculty" replace />;
      if (role === 'STUDENT') return <Navigate to="/student" replace />;
    }
    return <Navigate to="/login" replace />;
  };

  return (
    <Routes>
      {/* Landing - redirect based on auth */}
      <Route path="/" element={<LandingRoute />} />

      {/* Common Login Route */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><Dashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UserManagement /></ProtectedRoute>} />
      
      {/* ADDED: Batch Management Route */}
      <Route path="/admin/batches" element={<ProtectedRoute allowedRoles={['ADMIN']}><BatchManagement /></ProtectedRoute>} />
      <Route path="/admin/schools" element={<ProtectedRoute allowedRoles={['ADMIN']}><SchoolManagement /></ProtectedRoute>} />
      <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['ADMIN']}><ExamManagement /></ProtectedRoute>} />
      
      <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['ADMIN']}><SubjectManagement /></ProtectedRoute>} />
      <Route path="/admin/topics" element={<ProtectedRoute allowedRoles={['ADMIN']}><TopicManagement /></ProtectedRoute>} />
      <Route path="/admin/questions" element={<ProtectedRoute allowedRoles={['ADMIN']}><QuestionManagement /></ProtectedRoute>} />
      <Route path="/admin/tests" element={<ProtectedRoute allowedRoles={['ADMIN']}><TestManagement /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['ADMIN']}><NotificationLogs /></ProtectedRoute>} />

      {/* Student Routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/tests" element={<ProtectedRoute allowedRoles={['STUDENT']}><AssignedTests /></ProtectedRoute>} />
      <Route path="/student/exam/:testId" element={<ProtectedRoute allowedRoles={['STUDENT']}><ExamInterface /></ProtectedRoute>} />
      <Route path="/student/exam-complete/:testId" element={<ProtectedRoute allowedRoles={['STUDENT']}><ExamComplete /></ProtectedRoute>} />
      <Route path="/student/results" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentResults /></ProtectedRoute>} />
      <Route path="/student/results/:testId" element={<ProtectedRoute allowedRoles={['STUDENT']}><ResultDetail /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentProfile /></ProtectedRoute>} />
      <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentNotifications /></ProtectedRoute>} />
      <Route path="/student/help" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentHelp /></ProtectedRoute>} />

      {/* Faculty Routes */}
      <Route path="/faculty" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyLayout><FacultyDashboard /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/subjects" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyLayout><FacultySubjects /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/questions" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyLayout><FacultyQuestions /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/tests" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyLayout><FacultyProposals /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/performance" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyLayout><FacultyPerformance /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/notifications" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyLayout><FacultyNotifications /></FacultyLayout></ProtectedRoute>} />
      <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyLayout><FacultyProfile /></FacultyLayout></ProtectedRoute>} />

      {/* Fallback 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StudentAuthProvider>
        <FacultyAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </FacultyAuthProvider>
      </StudentAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;