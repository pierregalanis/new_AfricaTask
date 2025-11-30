import React, { useState, useEffect, useRef } from 'react';
import { Clock, Play, Square } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const JobTimer = ({ taskId, language = 'fr' }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchTimerStatus();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [taskId]);

  const fetchTimerStatus = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/timer-status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      const data = response.data;
      setIsRunning(data.is_timer_running);
      
      if (data.is_timer_running && data.timer_started_at) {
        setStartTime(new Date(data.timer_started_at));
        startLocalTimer(new Date(data.timer_started_at));
      } else if (data.actual_hours_worked) {
        setElapsedSeconds(Math.round(data.actual_hours_worked * 3600));
      }
    } catch (error) {
      console.error('Error fetching timer status:', error);
    }
  };

  const startLocalTimer = (startedAt) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now - startedAt) / 1000);
      setElapsedSeconds(diff);
    }, 1000);
  };

  const handleStartTimer = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/start-timer`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      const startedAt = new Date(response.data.started_at);
      setStartTime(startedAt);
      setIsRunning(true);
      startLocalTimer(startedAt);
      
      toast.success(
        language === 'en' ? '⏱️ Work timer started!' : '⏱️ Chronomètre de travail démarré!'
      );
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error(
        language === 'en' ? 'Failed to start timer' : 'Échec du démarrage du chronomètre'
      );
    }
  };

  const handleStopTimer = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/api/tasks/${taskId}/stop-timer`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      
      setIsRunning(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      const actualHours = response.data.actual_hours_worked;
      toast.success(
        language === 'en' 
          ? `⏱️ Work completed! Total time: ${actualHours} hours` 
          : `⏱️ Travail terminé! Temps total: ${actualHours} heures`
      );
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error(
        language === 'en' ? 'Failed to stop timer' : 'Échec de l\'arrêt du chronomètre'
      );
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clock className={`w-6 h-6 ${isRunning ? 'text-blue-600 animate-pulse' : 'text-gray-600'}`} />
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {language === 'en' ? 'Work Timer' : 'Chronomètre de travail'}
            </p>
            <p className={`text-3xl font-bold ${isRunning ? 'text-blue-700' : 'text-gray-700'}`}>
              {formatTime(elapsedSeconds)}
            </p>
          </div>
        </div>
        
        <div>
          {!isRunning ? (
            <button
              onClick={handleStartTimer}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition flex items-center space-x-2 shadow-lg"
            >
              <Play className="w-5 h-5" />
              <span>{language === 'en' ? 'Start Work' : 'Démarrer'}</span>
            </button>
          ) : (
            <button
              onClick={handleStopTimer}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition flex items-center space-x-2 shadow-lg"
            >
              <Square className="w-5 h-5" />
              <span>{language === 'en' ? 'Finish Work' : 'Terminer'}</span>
            </button>
          )}
        </div>
      </div>
      
      {isRunning && (
        <div className="mt-3 text-xs text-blue-600">
          <p>
            {language === 'en' 
              ? '⚡ Timer running. Client can see elapsed time.' 
              : '⚡ Chronomètre en cours. Le client peut voir le temps écoulé.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default JobTimer;
