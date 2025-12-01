import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/LoginPage';
import Register from './pages/RegisterPage';
import LandingPage from './pages/LandingPage';
import NewClientDashboard from './pages/NewClientDashboard';
import NewTaskerDashboard from './pages/NewTaskerDashboard';
import TaskerProfileSetup from './pages/TaskerProfileSetup';
import TaskerServicesManagement from './pages/TaskerServicesManagement';
import TaskerEarnings from './pages/TaskerEarnings';
import AdminDashboard from './pages/AdminDashboard';
import ServiceSelection from './pages/ServiceSelection';
import BrowseTaskersPage from './pages/BrowseTaskersPage';
import TaskerProfile from './pages/TaskerProfile';
import BookTasker from './pages/BookTasker';
import BookingConfirmation from './pages/BookingConfirmation';
import TaskDetails from './pages/TaskDetails';
import ProfilePage from './pages/ProfilePage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import '@/App.css';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
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
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === 'client' ? <Navigate to="/services" replace /> : <Navigate to="/tasker/dashboard" replace />
          ) : (
            <LandingPage />
          )
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
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
        path="/tasker/:taskerId"
        element={
          <ProtectedRoute requiredRole="client">
            <TaskerProfile />
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
        path="/tasker-profile-setup"
        element={
          <ProtectedRoute requiredRole="tasker">
            <TaskerProfileSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasker/services"
        element={
          <ProtectedRoute requiredRole="tasker">
            <TaskerServicesManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasker/earnings"
        element={
          <ProtectedRoute requiredRole="tasker">
            <TaskerEarnings />
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
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {user?.role === 'client' ? <Navigate to="/client/dashboard" /> : <Navigate to="/tasker/dashboard" />}
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
      <Route
        path="/tasks/:taskId"
        element={
          <ProtectedRoute>
            <TaskDetails />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <div className="App">
              <AppRoutes />
              <ToastContainer position="top-right" autoClose={3000} />
            </div>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
