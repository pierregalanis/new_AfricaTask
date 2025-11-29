import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import '@/App.css';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClientDashboard from './pages/ClientDashboard';
import TaskerDashboard from './pages/TaskerDashboard';
import BrowseTasks from './pages/BrowseTasks';
import TaskDetails from './pages/TaskDetails';
import ProfilePage from './pages/ProfilePage';

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to={user?.role === 'client' ? '/client/dashboard' : '/tasker/dashboard'} /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to={user?.role === 'client' ? '/client/dashboard' : '/tasker/dashboard'} /> : <RegisterPage />} 
      />
      
      {/* Client Routes */}
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute requiredRole="client">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Tasker Routes */}
      <Route
        path="/tasker/dashboard"
        element={
          <ProtectedRoute requiredRole="tasker">
            <TaskerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasker/browse"
        element={
          <ProtectedRoute requiredRole="tasker">
            <BrowseTasks />
          </ProtectedRoute>
        }
      />
      
      {/* Common Routes */}
      <Route
        path="/tasks/:taskId"
        element={
          <ProtectedRoute>
            <TaskDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <AppRoutes />
            <ToastContainer position="top-right" autoClose={3000} />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
