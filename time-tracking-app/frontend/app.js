/**
 * Digital Time Tracking System - Core Frontend Logic
 * Refactored for Robustness and Performance.
 */

class TimerManager {
    constructor() {
        this.generalTimer = { interval: null, seconds: 0, isRunning: false, active: false };
        this.projectTimer = { interval: null, seconds: 0, isRunning: false, active: false, initialGoal: 0 };
    }

    startTick(type, callback) {
        this.stopTick(type);
        const timer = type === 'general' ? this.generalTimer : this.projectTimer;
        
        timer.interval = setInterval(() => {
            if (type === 'general') {
                timer.seconds++;
            } else {
                timer.seconds = Math.max(0, timer.seconds - 1);
                if (timer.seconds === 0) {
                    this.stopTick(type);
                    // Trigger auto-end check via callback or refresh
                }
            }
            callback(timer.seconds);
        }, 1000);
    }

    stopTick(type) {
        const timer = type === 'general' ? this.generalTimer : this.projectTimer;
        if (timer.interval) {
            clearInterval(timer.interval);
            timer.interval = null;
        }
    }

    reset(type) {
        this.stopTick(type);
        const timer = type === 'general' ? this.generalTimer : this.projectTimer;
        timer.seconds = 0;
        timer.isRunning = false;
        timer.active = false;
    }
}

const timerManager = new TimerManager();

// --- Configuration & State ---
const API_BASE = '/api';

// --- Theme Management (Execute immediately to prevent flicker) ---
if (localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}

function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;
    const isAuthPage = path.includes('login') || path.includes('register') || path === '/';
    
    if (isAuthPage) {
        setupAuthPageListeners();
        return;
    }

    try {
        await checkAuth();
        await initDashboard();
        setupEventListeners();
        
        // Polling for sync (on user dashboard only)
        if (path === '/user') {
            setInterval(syncState, 30000); 
        }
    } catch (err) {
        console.error("Init Error:", err);
    }
});

async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/auth/session`);
        if (!res.ok) {
             window.location.href = '/user/login';
             return;
        }
        const data = await res.json();
        const userNameElem = document.getElementById('userName');
        if (userNameElem) userNameElem.textContent = data.user.name || data.user.username;
    } catch (err) {
        console.error("Auth Check Failed:", err);
        window.location.href = '/user/login';
    }
}

async function initDashboard() {
    const path = window.location.pathname;
    if (path.includes('/admin')) {
        await Promise.all([
            loadDashboardStats(),
            loadUsers(),
            loadAdminReports('day')
        ]);
        setupAdminUIHandlers();
    } else if (path === '/user') {
        await Promise.all([
            syncState(),
            loadRecentActivities(),
            loadTodayAverage()
        ]);
    } else if (path === '/report') {
        // Report page handles its own specific data loading
        // But we still want shared UI handlers like theme
    }
}

function setupAdminUIHandlers() {
    // Profile dropdown toggle
    document.getElementById('profile-btn')?.addEventListener('click', () => {
        document.getElementById('profile-dropdown')?.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const profileBtn = document.getElementById('profile-btn');
        const dropdown = document.getElementById('profile-dropdown');
        if (profileBtn && dropdown && !profileBtn.contains(event.target) && !dropdown.contains(event.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // Add User Form Listener
    const addUserForm = document.getElementById('add-user-form');
    addUserForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-name').value;
        const email = document.getElementById('new-email').value;
        const username = document.getElementById('new-user-username').value;
        const password = document.getElementById('new-user-password').value;

        try {
            await apiCall('/admin/users', 'POST', { name, email, username, password });
            alert('User created successfully!');
            document.getElementById('add-user-modal').classList.add('hidden');
            loadUsers();
            loadDashboardStats();
        } catch (err) {
            alert(err.message);
        }
    });
}

function openResetPasswordModal() {
    document.getElementById('profile-dropdown')?.classList.add('hidden');
    document.getElementById('change-pass-modal')?.classList.remove('hidden');
    document.getElementById('change-pass-error')?.classList.add('hidden');
    document.getElementById('change-pass-form')?.reset();
}

// --- API Call Wrapper ---
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Action failed');
    return data;
}

// --- Sync State ---
async function syncState() {
    try {
        const status = await apiCall('/user/timer/status');
        
        // Handle General Timer
        updateTimerUI('general', status.general || { active: false });
        
        // Handle Project Timer
        updateTimerUI('project', status.project || { active: false });

    } catch (err) {
        console.error("Sync Error:", err);
    }
}

function updateTimerUI(type, session) {
    const tm = type === 'general' ? timerManager.generalTimer : timerManager.projectTimer;
    const prefix = type === 'general' ? 'work' : 'proj';
    
    const descriptionElem = document.getElementById(`${prefix}ActiveDesc`);
    const timeDisplay = document.getElementById(`${prefix}Timer`);
    const startBtn = document.getElementById(`${prefix}StartBtn`);
    const pauseBtn = document.getElementById(`${prefix}PauseBtn`);
    const stopBtn = document.getElementById(`${prefix}StopBtn`);
    
    if (!session.active) {
        timerManager.reset(type);
        if (descriptionElem) descriptionElem.textContent = "No active session";
        if (timeDisplay) timeDisplay.textContent = type === 'general' ? "00:00:00" : "00:00:00";
        setButtonState(type, 'idle');
        return;
    }

    tm.active = true;
    tm.isRunning = session.isRunning;
    
    // Calculate accurate current seconds
    if (type === 'general') {
        let currentSeconds = session.totalSeconds;
        if (session.isRunning && session.startTime) {
            currentSeconds += Math.floor((Date.now() - new Date(session.startTime)) / 1000);
        }
        tm.seconds = currentSeconds;
    } else {
        // Countdown
        let elapsed = session.totalSeconds || 0;
        if (session.isRunning && session.startTime) {
            elapsed += Math.floor((Date.now() - new Date(session.startTime)) / 1000);
        }
        tm.seconds = Math.max(0, (session.estimatedSeconds || 0) - elapsed);
        if (tm.seconds === 0 && session.isRunning) {
            // Force refresh to trigger auto-end
            syncState();
        }
    }

    if (descriptionElem) descriptionElem.textContent = session.workDescription || session.projectName;
    if (timeDisplay) timeDisplay.textContent = formatTime(tm.seconds);

    if (tm.isRunning) {
        setButtonState(type, 'running');
        timerManager.startTick(type, (s) => {
            timeDisplay.textContent = formatTime(s);
        });
    } else {
        setButtonState(type, 'paused');
        timerManager.stopTick(type);
    }
}

function setButtonState(type, state) {
    const prefix = type === 'general' ? 'work' : 'proj';
    const startBtn = document.getElementById(`${prefix}StartBtn`);
    const pauseBtn = document.getElementById(`${prefix}PauseBtn`);
    const stopBtn = document.getElementById(`${prefix}StopBtn`);
    const inputs = document.querySelectorAll(`.${prefix}-input`);

    if (state === 'idle') {
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'none';
        inputs.forEach(i => i.disabled = false);
    } else if (state === 'running') {
        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) {
            pauseBtn.style.display = 'inline-flex';
            pauseBtn.innerHTML = `<i class='bx bx-pause-circle mr-2'></i>Pause`;
        }
        if (stopBtn) stopBtn.style.display = 'inline-flex';
        inputs.forEach(i => i.disabled = true);
    } else if (state === 'paused') {
        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) {
            pauseBtn.style.display = 'inline-flex';
            pauseBtn.innerHTML = `<i class='bx bx-play-circle mr-2'></i>Resume`;
        }
        if (stopBtn) stopBtn.style.display = 'inline-flex';
        inputs.forEach(i => i.disabled = true);
    }
}

// --- Action Handlers ---
async function handleAction(type, action) {
    const tm = type === 'general' ? timerManager.generalTimer : timerManager.projectTimer;
    const prefix = type === 'general' ? 'work' : 'proj';
    
    try {
        if (action === 'start') {
            const body = {};
            if (type === 'general') {
                body.work_description = document.getElementById('workDescInput').value;
            } else {
                body.project_name = document.getElementById('projNameInput').value;
                body.project_description = document.getElementById('projDescInput').value;
                body.estimated_seconds = (parseInt(document.getElementById('projHrs').value) || 0) * 3600 +
                                       (parseInt(document.getElementById('projMins').value) || 0) * 60;
            }
            await apiCall('/user/timer/start', 'POST', body);
        } else if (action === 'pause') {
            if (tm.isRunning) {
                await apiCall('/user/timer/pause', 'POST', { type });
            } else {
                await apiCall('/user/timer/resume', 'POST', { type });
            }
        } else if (action === 'stop') {
            await apiCall('/user/timer/stop', 'POST', { type });
        }
        
        // Immediate sync after action
        await syncState();
        loadRecentActivities();
        loadTodayAverage();
    } catch (err) {
        alert(err.message);
    }
}

// --- Load Content ---
async function loadRecentActivities() {
    try {
        const logs = await apiCall('/user/recent-activities');
        const container = document.getElementById('recentActivityList');
        if (!container) return;
        
        let logsHtml = '';
        logs.forEach(log => {
            const status = (log.completion_status || 'finished').replace('_', ' ');
            const statusColor = status.includes('in') 
                ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' 
                : status.includes('not') 
                    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' 
                    : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            
            const formatSessionTime = (d) => d ? new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: true}) : '-';
            const startTimeStr = log.initial_start_time || log.start_time;
            const timeRange = startTimeStr ? `${formatSessionTime(startTimeStr).toLowerCase()} - ${log.end_time ? formatSessionTime(log.end_time).toLowerCase() : '...'}` : '-';

            logsHtml += `
                <tr class="hover:bg-indigo-500/[0.02] transition-colors border-b border-slate-700/10 last:border-0 group">
                    <td class="px-10 py-6 font-medium text-slate-500 text-base">${new Date(log.created_at || log.log_date).toLocaleDateString()}</td>
                    <td class="px-10 py-6">
                        <div class="font-bold text-slate-800 dark:text-white text-base">${log.project_name || 'General Work'}</div>
                        <div class="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">${log.work_description || '-'}</div>
                    </td>
                    <td class="px-10 py-6 text-sm text-slate-500">${timeRange}</td>
                    <td class="px-10 py-6 text-center">
                        <span class="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${statusColor}">${status}</span>
                    </td>
                    <td class="px-10 py-6 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-lg tabular-nums">${log.time_spent}</td>
                </tr>
            `;
        });
        container.innerHTML = logs.length ? logsHtml : '<tr><td colspan="5" class="py-10 text-center text-slate-500 text-base">No recent activities</td></tr>';
    } catch (err) {
        console.error(err);
    }
}

async function loadTodayAverage() {
    try {
        const data = await apiCall('/user/today-average');
        const avgElem = document.getElementById('todayAvg');
        if (avgElem) avgElem.textContent = data.formatted;
    } catch (err) {
        console.error(err);
    }
}

// --- Admin Dashboard Logic ---
async function loadDashboardStats() {
    try {
        const data = await apiCall('/admin/dashboard');
        const usersElem = document.getElementById('total-users');
        const hoursElem = document.getElementById('total-hours');
        if (usersElem) usersElem.textContent = data.totalUsers;
        if (hoursElem) hoursElem.textContent = parseFloat(data.totalHours).toFixed(2);
    } catch (err) {
        console.error("Load Stats Error:", err);
    }
}

async function loadUsers() {
    try {
        const users = await apiCall('/admin/users');
        const container = document.getElementById('user-list');
        if (!container) return;

        let usersHtml = '';
        users.forEach(user => {
            usersHtml += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td class="px-6 py-4 text-sm tabular">${user.id}</td>
                    <td class="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">${user.name}</td>
                    <td class="px-6 py-4 text-sm text-slate-500">${user.username}</td>
                    <td class="px-6 py-4 text-sm text-slate-500">${user.email}</td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="resetUserPassword(${user.id})" title="Reset Password" class="text-amber-500 hover:scale-110 transition-transform"><i class='bx bx-key text-lg'></i></button>
                        <button onclick="deleteUser(${user.id})" title="Delete User" class="text-rose-500 hover:scale-110 transition-transform ml-4"><i class='bx bx-trash text-lg'></i></button>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = users.length ? usersHtml : '<tr><td colspan="5" class="p-4 text-center">No users found</td></tr>';
    } catch (err) {
        console.error("Load Users Error:", err);
    }
}

async function loadAdminReports(filter = 'day') {
    try {
        const reports = await apiCall(`/admin/reports?filter=${filter}`);
        const container = document.getElementById('report-list');
        if (!container) return;

        let reportsHtml = '';
        reports.forEach(row => {
            reportsHtml += `
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td class="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">${row.name} (@${row.username})</td>
                    <td class="px-6 py-4 text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">${row.total_hours} hrs</td>
                </tr>
            `;
        });
        container.innerHTML = reports.length ? reportsHtml : '<tr><td colspan="2" class="p-4 text-center">No data found</td></tr>';
    } catch (err) {
        console.error("Load Reports Error:", err);
    }
}

async function deleteUser(id) {
    if (!confirm('Are you sure you want to delete this user? All their logs will be removed.')) return;
    try {
        await apiCall(`/admin/users/${id}`, 'DELETE');
        loadUsers();
        loadDashboardStats();
    } catch (err) {
        alert(err.message);
    }
}


async function resetUserPassword(id) {
    const newPass = prompt('Enter new password for this user (minimum 6 characters):');
    if (!newPass) return;
    if (newPass.length < 6) return alert('Password too short');
    
    try {
        await apiCall(`/admin/reset-user-password/${id}`, 'PUT', { password: newPass });
        alert('User password has been reset successfully');
    } catch (err) {
        alert(err.message);
    }
}

// --- Theme Management ---
// toggleTheme moved to top to be available to early clicks

// --- Auth Page Logic ---
function setupAuthPageListeners() {
    const loginForm = document.getElementById('user-login-form');
    const adminForm = document.getElementById('admin-login-form');
    const registerForm = document.getElementById('register-form');
    const errorMsg = document.getElementById('error-msg');

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('user-login-btn');
        const originalText = submitBtn?.innerHTML;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin mr-2"></i>Verifying...';
            }
            const data = await apiCall('/auth/user/login', 'POST', { username, password });
            submitBtn.innerHTML = '<i class="bx bx-check mr-2"></i>Login Successful';
            window.location.href = '/user';
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = err.message;
                errorMsg.classList.remove('hidden');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    });

    adminForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('admin-login-btn');
        const originalText = submitBtn?.innerHTML;

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin mr-2"></i>Logging in...';
            }
            const data = await apiCall('/auth/admin/login', 'POST', { username, password });
            submitBtn.innerHTML = '<i class="bx bx-check mr-2"></i>Access Granted';
            window.location.href = '/admin';
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = err.message;
                errorMsg.classList.remove('hidden');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    });

    const adminChangePassForm = document.getElementById('change-pass-form');
    adminChangePassForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorEl = document.getElementById('change-pass-error');

        if (newPassword !== confirmPassword) {
            errorEl.textContent = 'New password and confirmation do not match';
            errorEl.classList.remove('hidden');
            return;
        }

        try {
            await apiCall('/admin/change-password', 'PUT', { currentPassword, newPassword, confirmPassword });
            alert('Password updated successfully!');
            document.getElementById('change-pass-modal').classList.add('hidden');
        } catch (err) {
            errorEl.textContent = err.message;
            errorEl.classList.remove('hidden');
        }
    });

    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('fullname').value;
        const email = document.getElementById('email').value;
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const errorMsg = document.getElementById('reg-error-msg');

        if (password !== confirmPassword) {
            if (errorMsg) {
                errorMsg.textContent = 'Passwords do not match';
                errorMsg.classList.remove('hidden');
            } else {
                alert('Passwords do not match');
            }
            return;
        }

        try {
            await apiCall('/auth/register', 'POST', { name, email, username, password });
            alert('Registration successful! Please login.');
            window.location.href = '/user/login';
        } catch (err) {
            if (errorMsg) {
                errorMsg.textContent = err.message;
                errorMsg.classList.remove('hidden');
            } else {
                alert(err.message);
            }
        }
    });


}

// --- Event Listeners ---
function setupEventListeners() {
    // General Work Buttons
    document.getElementById('workStartBtn')?.addEventListener('click', () => handleAction('general', 'start'));
    document.getElementById('workPauseBtn')?.addEventListener('click', () => handleAction('general', 'pause'));
    document.getElementById('workStopBtn')?.addEventListener('click', () => handleAction('general', 'stop'));

    // Project Buttons
    document.getElementById('projStartBtn')?.addEventListener('click', () => handleAction('project', 'start'));
    document.getElementById('projPauseBtn')?.addEventListener('click', () => handleAction('project', 'pause'));
    document.getElementById('projStopBtn')?.addEventListener('click', () => handleAction('project', 'stop'));

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
}

async function logout() {
    try {
        await apiCall('/auth/logout', 'POST');
        window.location.href = '/user/login';
    } catch (err) {
        window.location.href = '/user/login';
    }
}

// --- Utility ---
function formatTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
