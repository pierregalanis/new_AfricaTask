import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import '@/App.css';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NewClientDashboard from './pages/NewClientDashboard';
import NewTaskerDashboard from './pages/NewTaskerDashboard';
import TaskerProfileSetup from './pages/TaskerProfileSetup';
import ServiceSelection from './pages/ServiceSelection';
import BrowseTaskersPage from './pages/BrowseTaskersPage';
import BookTasker from './pages/BookTasker';
import BookingConfirmation from './pages/BookingConfirmation';
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
        element={isAuthenticated ? <Navigate to={user?.role === 'client' ? '/services' : '/tasker/dashboard'} /> : <LoginPage />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to={user?.role === 'client' ? '/services' : '/tasker/setup'} /> : <RegisterPage />} 
      />
      
      {/* Client Routes */}
      <Route
        path="/services"
        element={
          <ProtectedRoute requiredRole="client">
            <ServiceSelection />
          </ProtectedRoute>
        }
      />
      <Route
        path="/browse-taskers/:categoryId"
        element={
          <ProtectedRoute requiredRole="client">
            <BrowseTaskersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/book-tasker/:taskerId"
        element={
          <ProtectedRoute requiredRole="client">
            <BookTasker />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking-confirmation/:taskId"
        element={
          <ProtectedRoute requiredRole="client">
            <BookingConfirmation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/dashboard"
        element={
          <ProtectedRoute requiredRole="client">
            <NewClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client-dashboard"
        element={
          <ProtectedRoute requiredRole="client">
            <NewClientDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/client/bookings"
        element={
          <ProtectedRoute requiredRole="client">
            <NewClientDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Tasker Routes */}
      <Route
        path="/tasker/setup"
        element={
          <ProtectedRoute requiredRole="tasker">
            <TaskerProfileSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasker/dashboard"
        element={
          <ProtectedRoute requiredRole="tasker">
            <NewTaskerDashboard />
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
