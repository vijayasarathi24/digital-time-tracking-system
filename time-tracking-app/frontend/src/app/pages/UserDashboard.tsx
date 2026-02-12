import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useApp } from '../context/AppContext';
import { Play, Pause, Square, Clock, Calendar } from 'lucide-react';

export function UserDashboard() {
  const navigate = useNavigate();
  const { currentUser, addTimeLog, getTimeLogsByUser, getUserStats } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState('daily');
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Redirect if not logged in as user
  React.useEffect(() => {
    if (!currentUser || currentUser.type !== 'user') {
      navigate('/user/login');
    }
  }, [currentUser, navigate]);

  const userLogs = useMemo(() => {
    if (!currentUser) return [];
    return getTimeLogsByUser(currentUser.id);
  }, [currentUser, getTimeLogsByUser]);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (filter === 'daily') {
      return userLogs.filter(log => log.date === today);
    } else if (filter === 'weekly') {
      return userLogs.filter(log => log.date >= weekAgo);
    } else if (filter === 'monthly') {
      return userLogs.filter(log => log.date >= monthAgo);
    }
    return userLogs;
  }, [userLogs, filter]);

  const stats = useMemo(() => {
    if (!currentUser) return { totalHours: 0, sessionsToday: 0 };
    return getUserStats(currentUser.id);
  }, [currentUser, getUserStats, userLogs]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = userLogs.filter(log => log.date === today);
    const totalSeconds = todayLogs.reduce((sum, log) => sum + log.duration, 0);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return {
      time: `${hours}h ${minutes}m`,
      sessions: todayLogs.length,
      streak: 7, // Mock streak
    };
  }, [userLogs]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleStart = () => {
    if (!description.trim()) {
      alert('Please enter a work description');
      return;
    }
    setIsRunning(true);
    setIsPaused(false);
    setStartTime(new Date());
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    if (!currentUser) return;

    const endTime = new Date();
    const start = startTime || endTime;

    addTimeLog({
      userId: currentUser.id,
      date: new Date().toISOString().split('T')[0],
      description: description,
      duration: seconds,
      startTime: start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      endTime: endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });

    setIsRunning(false);
    setIsPaused(false);
    setSeconds(0);
    setDescription('');
    setStartTime(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <TopNav type="user" />
      
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#1F2937] mb-2">Time Tracker</h1>
          <p className="text-[#64748B]">Track your work and manage your time effectively</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timer Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-8">
              <h2 className="text-xl font-semibold text-[#1F2937] mb-6">Current Task</h2>
              
              {/* Work Description */}
              <div className="mb-6">
                <Input
                  label="Work Description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you working on?"
                  disabled={isRunning}
                />
              </div>

              {/* Timer Display */}
              <div className="bg-[#F8FAFC] rounded-xl p-8 mb-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-[#4F46E5] rounded-full mb-4">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-6xl font-semibold text-[#1F2937] mb-2 font-mono">
                    {formatTime(seconds)}
                  </div>
                  <p className="text-[#64748B]">
                    {!isRunning ? 'Ready to start' : isPaused ? 'Paused' : 'Timer running'}
                  </p>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="grid grid-cols-2 gap-4">
                {!isRunning ? (
                  <Button
                    fullWidth
                    size="lg"
                    icon={<Play className="w-5 h-5" />}
                    onClick={handleStart}
                  >
                    Start
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button
                        fullWidth
                        size="lg"
                        variant="secondary"
                        icon={<Pause className="w-5 h-5" />}
                        onClick={handlePause}
                      >
                        Pause
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        size="lg"
                        icon={<Play className="w-5 h-5" />}
                        onClick={handleResume}
                      >
                        Resume
                      </Button>
                    )}
                    <Button
                      fullWidth
                      size="lg"
                      variant="danger"
                      icon={<Square className="w-5 h-5" />}
                      onClick={handleStop}
                    >
                      Stop
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Today's Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6">
            <h2 className="text-xl font-semibold text-[#1F2937] mb-6">Today's Summary</h2>
            
            <div className="space-y-6">
              <div className="bg-[#F1F5F9] rounded-lg p-4">
                <p className="text-sm text-[#64748B] mb-1">Total Time Today</p>
                <p className="text-3xl font-semibold text-[#1F2937]">{todayStats.time}</p>
              </div>

              <div className="bg-[#F1F5F9] rounded-lg p-4">
                <p className="text-sm text-[#64748B] mb-1">Sessions Completed</p>
                <p className="text-3xl font-semibold text-[#1F2937]">{todayStats.sessions}</p>
              </div>

              <div className="bg-[#F1F5F9] rounded-lg p-4">
                <p className="text-sm text-[#64748B] mb-1">Current Streak</p>
                <p className="text-3xl font-semibold text-[#22C55E]">{todayStats.streak} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#1F2937]">Time Logs</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('daily')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === 'daily'
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => setFilter('weekly')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === 'weekly'
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setFilter('monthly')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  filter === 'monthly'
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-[#64748B] hover:bg-[#F1F5F9]'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {filteredLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="text-left py-3 px-4 text-sm text-[#64748B]">Date</th>
                    <th className="text-left py-3 px-4 text-sm text-[#64748B]">Work Description</th>
                    <th className="text-left py-3 px-4 text-sm text-[#64748B]">Time</th>
                    <th className="text-left py-3 px-4 text-sm text-[#64748B]">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[#E2E8F0] hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 text-[#64748B]">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(log.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#1F2937]">{log.description}</td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {log.startTime} - {log.endTime}
                      </td>
                      <td className="py-3 px-4 text-[#4F46E5] font-semibold">{formatDuration(log.duration)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-[#E2E8F0] mx-auto mb-4" />
              <p className="text-[#64748B]">No time logged yet for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
