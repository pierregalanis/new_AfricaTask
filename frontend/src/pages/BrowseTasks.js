import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

const BrowseTasks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect to tasker dashboard
  React.useEffect(() => {
    navigate('/tasker/dashboard');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p>Redirecting...</p>
      </div>
    </div>
  );
};

export default BrowseTasks;
