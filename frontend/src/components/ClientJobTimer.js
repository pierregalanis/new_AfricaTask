import React, { useState, useEffect, useRef } from 'react';
import { Clock, DollarSign } from 'lucide-react';
import axios from 'axios';

const ClientJobTimer = ({ taskId, hourlyRate, language = 'fr' }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [actualHours, setActualHours] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchTimerStatus();
    
    // Poll every 5 seconds for updates
    const pollInterval = setInterval(() => {
      fetchTimerStatus();
    }, 5000);
    
    return () => {
      clearInterval(pollInterval);
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
      const wasRunning = isRunning;
      setIsRunning(data.is_timer_running);
      
      if (data.is_timer_running && data.timer_started_at) {
        if (!wasRunning) {
          // Timer just started
          setStartTime(new Date(data.timer_started_at));
          startLocalTimer(new Date(data.timer_started_at));
        }
      } else if (!data.is_timer_running && wasRunning) {
        // Timer just stopped
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        if (data.actual_hours_worked) {
          setActualHours(data.actual_hours_worked);
          setElapsedSeconds(Math.round(data.actual_hours_worked * 3600));
        }
      } else if (data.actual_hours_worked) {
        setActualHours(data.actual_hours_worked);
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

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateCurrentCost = () => {
    const hours = elapsedSeconds / 3600;
    return Math.round(hours * hourlyRate);
  };

  if (!isRunning && actualHours === null) {
    return (
      <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-gray-600">
          <Clock className="w-5 h-5" />
          <span className="text-sm">
            {language === 'en' ? 'Work timer not started yet' : 'Chronomètre de travail non démarré'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-lg p-4 ${isRunning ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clock className={`w-6 h-6 ${isRunning ? 'text-green-600 animate-pulse' : 'text-gray-600'}`} />
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {isRunning 
                ? (language === 'en' ? 'Work in Progress' : 'Travail en cours')
                : (language === 'en' ? 'Work Completed' : 'Travail terminé')}
            </p>
            <p className={`text-3xl font-bold ${isRunning ? 'text-green-700' : 'text-gray-700'}`}>
              {formatTime(elapsedSeconds)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            <span>{language === 'en' ? 'Current cost' : 'Coût actuel'}</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {calculateCurrentCost()} CFA
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {(elapsedSeconds / 3600).toFixed(2)} {language === 'en' ? 'hours' : 'heures'} × {hourlyRate} CFA/h
          </p>
        </div>
      </div>
      
      {isRunning && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-600">
            ⏱️ {language === 'en' 
              ? 'Timer updates automatically. Final cost calculated when work is completed.' 
              : 'Le chronomètre se met à jour automatiquement. Le coût final sera calculé à la fin du travail.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ClientJobTimer;
