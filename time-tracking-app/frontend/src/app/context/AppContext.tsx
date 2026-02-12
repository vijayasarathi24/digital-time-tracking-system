import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  password: string;
  totalHours: number;
  lastActivity: string;
}

interface TimeLog {
  id: number;
  userId: number;
  date: string;
  description: string;
  duration: number; // in seconds
  startTime: string;
  endTime: string;
}

interface AuthUser {
  id: number;
  username: string;
  type: 'admin' | 'user';
}

interface AppContextType {
  users: User[];
  timeLogs: TimeLog[];
  currentUser: AuthUser | null;
  login: (username: string, password: string, type: 'admin' | 'user') => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id' | 'totalHours' | 'lastActivity'>) => void;
  updateUser: (id: number, updates: Partial<User>) => void;
  deleteUser: (id: number) => void;
  addTimeLog: (log: Omit<TimeLog, 'id'>) => void;
  getTimeLogsByUser: (userId: number) => TimeLog[];
  getUserStats: (userId: number) => { totalHours: number; sessionsToday: number };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Admin User', username: 'admin', email: 'admin@timetrack.com', password: 'admin', totalHours: 0, lastActivity: 'Just now' },
      { id: 2, name: 'John Doe', username: 'user', email: 'john@example.com', password: 'user', totalHours: 42.5, lastActivity: '2 hours ago' },
      { id: 3, name: 'Jane Smith', username: 'janesmith', email: 'jane@example.com', password: 'password', totalHours: 38.2, lastActivity: '5 hours ago' },
      { id: 4, name: 'Mike Johnson', username: 'mikej', email: 'mike@example.com', password: 'password', totalHours: 45.8, lastActivity: '1 hour ago' },
      { id: 5, name: 'Sarah Williams', username: 'sarahw', email: 'sarah@example.com', password: 'password', totalHours: 40.0, lastActivity: '3 hours ago' },
    ];
  });

  const [timeLogs, setTimeLogs] = useState<TimeLog[]>(() => {
    const saved = localStorage.getItem('timeLogs');
    return saved ? JSON.parse(saved) : [
      { id: 1, userId: 2, date: '2026-02-10', description: 'Frontend Development', duration: 13500, startTime: '09:00', endTime: '12:45' },
      { id: 2, userId: 2, date: '2026-02-10', description: 'Team Meeting', duration: 5400, startTime: '14:00', endTime: '15:30' },
      { id: 3, userId: 2, date: '2026-02-09', description: 'Code Review', duration: 8100, startTime: '10:00', endTime: '12:15' },
      { id: 4, userId: 3, date: '2026-02-10', description: 'Documentation', duration: 4800, startTime: '09:00', endTime: '10:20' },
      { id: 5, userId: 4, date: '2026-02-10', description: 'Bug Fixes', duration: 15000, startTime: '08:00', endTime: '12:10' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('timeLogs', JSON.stringify(timeLogs));
  }, [timeLogs]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const login = (username: string, password: string, type: 'admin' | 'user'): boolean => {
    if (type === 'admin' && username === 'admin' && password === 'admin') {
      setCurrentUser({ id: 1, username: 'admin', type: 'admin' });
      return true;
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    if (user && type === 'user') {
      setCurrentUser({ id: user.id, username: user.username, type: 'user' });
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addUser = (user: Omit<User, 'id' | 'totalHours' | 'lastActivity'>) => {
    const newUser: User = {
      ...user,
      id: Math.max(...users.map(u => u.id), 0) + 1,
      totalHours: 0,
      lastActivity: 'Never',
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: number, updates: Partial<User>) => {
    setUsers(users.map(user => user.id === id ? { ...user, ...updates } : user));
  };

  const deleteUser = (id: number) => {
    setUsers(users.filter(user => user.id !== id));
    setTimeLogs(timeLogs.filter(log => log.userId !== id));
  };

  const addTimeLog = (log: Omit<TimeLog, 'id'>) => {
    const newLog: TimeLog = {
      ...log,
      id: Math.max(...timeLogs.map(l => l.id), 0) + 1,
    };
    setTimeLogs([...timeLogs, newLog]);

    // Update user's total hours and last activity
    const user = users.find(u => u.id === log.userId);
    if (user) {
      updateUser(user.id, {
        totalHours: user.totalHours + (log.duration / 3600),
        lastActivity: 'Just now',
      });
    }
  };

  const getTimeLogsByUser = (userId: number): TimeLog[] => {
    return timeLogs.filter(log => log.userId === userId);
  };

  const getUserStats = (userId: number) => {
    const userLogs = timeLogs.filter(log => log.userId === userId);
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = userLogs.filter(log => log.date === today);
    
    const totalHours = userLogs.reduce((sum, log) => sum + log.duration, 0) / 3600;
    const sessionsToday = todayLogs.length;

    return { totalHours, sessionsToday };
  };

  return (
    <AppContext.Provider
      value={{
        users,
        timeLogs,
        currentUser,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        addTimeLog,
        getTimeLogsByUser,
        getUserStats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
