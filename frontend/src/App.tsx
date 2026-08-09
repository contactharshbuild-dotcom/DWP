import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import { ClassroomProvider } from './components/ClassroomContext';

// Lazy loading route components for code splitting & initial bundle optimization
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Teachers = lazy(() => import('./pages/Teachers'));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite'));
const ClassroomDetails = lazy(() => import('./pages/ClassroomDetails'));
const JoinClassroom = lazy(() => import('./pages/JoinClassroom'));
const MasterAdminLogin = lazy(() => import('./pages/MasterAdminLogin'));
const MasterAdminDashboard = lazy(() => import('./pages/MasterAdminDashboard'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const OrganizationProfile = lazy(() => import('./pages/OrganizationProfile'));
const SelectPlan = lazy(() => import('./pages/SelectPlan'));
const QuizBuilderPage = lazy(() => import('./quiz-builder/QuizBuilderPage').then(module => ({ default: module.QuizBuilderPage })));
const MaterialBankPage = lazy(() => import('./material-bank/MaterialBankPage').then(module => ({ default: module.MaterialBankPage })));

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactElement;
  allowNoSubscription?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowNoSubscription = false }) => {
  const { token, user, organization } = useSelector((state: RootState) => state.auth);
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'masteradmin') {
    return <Navigate to="/master-admin" replace />;
  }

  // Enforce subscription plan selection for client organization users
  const hasPlan = Boolean(organization?.subscription_plan_id || organization?.subscriptionPlan);
  if (!hasPlan && !allowNoSubscription) {
    return <Navigate to="/select-plan" replace />;
  }
  
  return children;
};

// Public Route wrapper component (prevents logged-in users from viewing auth screens)
interface PublicRouteProps {
  children: React.ReactElement;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { token, user, organization } = useSelector((state: RootState) => state.auth);
  
  if (token) {
    if (user?.role === 'masteradmin') {
      return <Navigate to="/master-admin" replace />;
    }

    const hasPlan = Boolean(organization?.subscription_plan_id || organization?.subscriptionPlan);
    if (!hasPlan) {
      return <Navigate to="/select-plan" replace />;
    }

    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Master Protected Route wrapper component
const MasterProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  
  if (!token || user?.role !== 'masteradmin') {
    return <Navigate to="/master-login" replace />;
  }
  
  return children;
};

// Master Public Route wrapper component
const MasterPublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  
  if (token && user?.role === 'masteradmin') {
    return <Navigate to="/master-admin" replace />;
  }
  
  return children;
};

const PageFallback = (
  <div style={{
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: '12px'
  }}>
    <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary, #4f46e5)', width: '36px', height: '36px' }}></span>
    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Loading view...</span>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ClassroomProvider>
        <Suspense fallback={PageFallback}>
          <Routes>
            {/* Master Admin Routes */}
            <Route
              path="/master-login"
              element={
                <MasterPublicRoute>
                  <MasterAdminLogin />
                </MasterPublicRoute>
              }
            />
            <Route
              path="/master-admin"
              element={
                <MasterProtectedRoute>
                  <MasterAdminDashboard />
                </MasterProtectedRoute>
              }
            />

            {/* Protected Dashboard Route */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teachers"
              element={
                <ProtectedRoute>
                  <Teachers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/about"
              element={
                <ProtectedRoute>
                  <OrganizationProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/select-plan"
              element={
                <ProtectedRoute allowNoSubscription={true}>
                  <SelectPlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz-builder"
              element={
                <ProtectedRoute>
                  <QuizBuilderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/material-bank"
              element={
                <ProtectedRoute>
                  <MaterialBankPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/classrooms/:id"
              element={
                <ProtectedRoute>
                  <ClassroomDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accept-invite"
              element={<AcceptInvite />}
            />
            <Route
              path="/join-classroom/:classroomId"
              element={<JoinClassroom />}
            />

            {/* Public Login/Signup Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              }
            />

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ClassroomProvider>
    </BrowserRouter>
  );
}

export default App;
