import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Teachers from './pages/Teachers';
import AcceptInvite from './pages/AcceptInvite';
import ClassroomDetails from './pages/ClassroomDetails';
import JoinClassroom from './pages/JoinClassroom';
import { ClassroomProvider } from './components/ClassroomContext';

// Protected Route wrapper component
interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route wrapper component (prevents logged-in users from viewing auth screens)
interface PublicRouteProps {
  children: React.ReactElement;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { token } = useSelector((state: RootState) => state.auth);
  
  if (token) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ClassroomProvider>
        <Routes>
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
      </ClassroomProvider>
    </BrowserRouter>
  );
}

export default App;
