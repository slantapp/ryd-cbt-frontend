import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

// Institution pages
import Login from './pages/institution/Login';
import Register from './pages/institution/Register';
import Dashboard from './pages/institution/Dashboard';
import Tests from './pages/institution/Tests';
import TestDetail from './pages/institution/TestDetail';
import Sessions from './pages/institution/Sessions';
import SessionDetail from './pages/institution/SessionDetail';
import StudentScores from './pages/institution/StudentScores';
import Profile from './pages/institution/Profile';
import AdminMinistries from './pages/institution/AdminMinistries';
import AdminSuperAdmins from './pages/institution/AdminSuperAdmins';
import MinistrySchools from './pages/institution/MinistrySchools';
import Classes from './pages/institution/Classes';
import Teachers from './pages/institution/Teachers';
import Students from './pages/institution/Students';
import StudentProfile from './pages/institution/StudentProfile';
import ThemeSettings from './pages/institution/ThemeSettings';
import CustomFields from './pages/institution/CustomFields';
import ManualGrading from './pages/institution/ManualGrading';
import GradeStudentTest from './pages/institution/GradeStudentTest';
import Notifications from './pages/institution/Notifications';
import Impersonation from './pages/institution/Impersonation';
import ForgotPassword from './pages/institution/ForgotPassword';
import ResetPassword from './pages/institution/ResetPassword';
import AuditLogs from './pages/institution/AuditLogs';
import TestGroups from './pages/institution/TestGroups';
import Subjects from './pages/institution/Subjects';
import GradingSchemes from './pages/institution/GradingSchemes';
import GradingModeSelection from './pages/institution/GradingModeSelection';
import GradeByStudent from './pages/institution/GradeByStudent';
import GradeByQuestion from './pages/institution/GradeByQuestion';
import TeacherTests from './pages/institution/TeacherTests';
import ClassTests from './pages/institution/ClassTests';
import SchoolAdmin from './pages/institution/SchoolAdmin';
import QuestionBank from './pages/institution/QuestionBank';
import Help from './pages/institution/Help';

// Student pages
import StudentTestPage from './pages/student/StudentTestPage';
import StudentTestTaking from './pages/student/StudentTestTaking';
import StudentTestResult from './pages/student/StudentTestResult';
import StudentTestReview from './pages/student/StudentTestReview';
import StudentRegister from './pages/student/StudentRegister';
import StudentLogin from './pages/student/StudentLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import SchoolLogin from './pages/student/SchoolLogin';

// Parent pages
import ParentLogin from './pages/parent/ParentLogin';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentStudentScores from './pages/parent/StudentScores';
import ReportCard from './pages/parent/ReportCard';

// Layout
import InstitutionLayout from './components/layout/InstitutionLayout';
import ParentLayout from './components/layout/ParentLayout';
import StudentLayout from './components/layout/StudentLayout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, account } = useAuthStore();
  if (!isAuthenticated) {
    // Redirect to appropriate login based on route
    const isParentRoute = window.location.pathname.startsWith('/parent');
    const isStudentRoute = window.location.pathname.startsWith('/student');
    
    if (isParentRoute) {
      return <Navigate to="/parent/login" replace />;
    } else if (isStudentRoute) {
      return <Navigate to="/student/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Student login */}
          <Route path="/student/login" element={<StudentLogin />} />
          
          {/* Parent login */}
          <Route path="/parent/login" element={<ParentLogin />} />

          {/* Student authenticated routes - MUST come before /:slug */}
          <Route
            path="/student/dashboard"
            element={
              <PrivateRoute>
                <StudentLayout>
                  <StudentDashboard />
                </StudentLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/student/test/:testId"
            element={
              <PrivateRoute>
                <StudentLayout>
                  <StudentTestTaking />
                </StudentLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/student/test/:testId/result"
            element={
              <PrivateRoute>
                <StudentLayout>
                  <StudentTestResult />
                </StudentLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/student/test/:testId/review"
            element={
              <PrivateRoute>
                <StudentLayout>
                  <StudentTestReview />
                </StudentLayout>
              </PrivateRoute>
            }
          />

          {/* Parent authenticated routes - MUST come before /:slug */}
          <Route
            path="/parent/dashboard"
            element={
              <PrivateRoute>
                <ParentLayout>
                  <ParentDashboard />
                </ParentLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/parent/students/:studentId/scores"
            element={
              <PrivateRoute>
                <ParentLayout>
                  <ParentStudentScores />
                </ParentLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/parent/students/:studentId/report-card"
            element={
              <PrivateRoute>
                <ParentLayout>
                  <ReportCard />
                </ParentLayout>
              </PrivateRoute>
            }
          />

          {/* Student self-registration route - MUST come before /:slug */}
          <Route path="/:slug/register" element={<StudentRegister />} />

          {/* Student public routes (class-based access) - MUST come before /:slug */}
          <Route path="/:slug/test/:testId" element={<StudentTestTaking />} />
          <Route path="/:slug/test/:testId/result" element={<StudentTestResult />} />
          
          {/* School login page - shows login for teachers and students */}
          <Route path="/:slug" element={<SchoolLogin />} />
          
          {/* Legacy test portal route - redirects to login */}
          <Route path="/:slug/portal" element={<StudentTestPage />} />

          {/* Institution protected routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Dashboard />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Tests />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests/:id"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <TestDetail />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests/:testId/grade"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <ManualGrading />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests/:testId/grade/select-mode"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <GradingModeSelection />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests/:testId/grade/by-student"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <GradeByStudent />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests/:testId/grade/by-question"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <GradeByQuestion />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests/:testId/grade/by-question/:questionId"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <GradeByQuestion />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/tests/:testId/grade/:studentTestId"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <GradeStudentTest />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/sessions"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Sessions />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/sessions/:id"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <SessionDetail />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/scores"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <StudentScores />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Profile />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/ministries"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <AdminMinistries />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/super-admins"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <AdminSuperAdmins />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/schools"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <MinistrySchools />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Classes />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/teachers"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Teachers />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/students"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Students />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/students/:id"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <StudentProfile />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/theme"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <ThemeSettings />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/custom-fields"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <CustomFields />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Notifications />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/impersonation"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Impersonation />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <AuditLogs />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/test-groups"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <TestGroups />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/subjects"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Subjects />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/question-bank"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <QuestionBank />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/grading-schemes"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <GradingSchemes />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/help"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <Help />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/teacher-tests"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <TeacherTests />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/class-tests"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <ClassTests />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />
          <Route
            path="/school-admin"
            element={
              <PrivateRoute>
                <InstitutionLayout>
                  <SchoolAdmin />
                </InstitutionLayout>
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
}

export default App;

