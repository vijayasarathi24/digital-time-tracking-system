const API_BASE = '/api';

// --- Utility Functions ---

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (res.status === 401 && !window.location.pathname.includes('login')) {
        window.location.href = '/login'; // Redirect to landing if unauthorized
        return null; // Stop processing
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
}

// --- Auth Logic ---

// Check Auth on Dashboard Load
async function checkAuth() {
    try {
        const data = await apiCall('/auth/session');
        if (!data || !data.user) throw new Error('Not authenticated');
        return data.user;
    } catch (err) {
        window.location.href = '/login';
    }
}

// --- Unified Login Handler ---
const unifiedLoginForm = document.getElementById('unified-login-form');

if (unifiedLoginForm) {
    unifiedLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');
        const loginBtn = document.getElementById('login-btn');

        // Reset UI State
        errorMsg.classList.add('hidden');
        loginBtn.disabled = true;
        loginBtn.textContent = "Authenticating...";

        try {
            const data = await apiCall('/auth/login', 'POST', { username, password });
            if (data.role === 'admin') {
                window.location.href = '/admin';
            } else {
                window.location.href = '/user';
            }
        } catch (finalErr) {
            // Display error in the unified UI
            errorMsg.textContent = finalErr.message;
            errorMsg.classList.remove('hidden');
            loginBtn.disabled = false;
            loginBtn.textContent = "Login to Dashboard";
        }
    });
}

// Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await apiCall('/auth/logout', 'POST');
        window.location.href = '/login';
    });
}

// --- Admin Dashboard Logic ---

async function loadDashboardStats() {
    try {
        const stats = await apiCall('/admin/dashboard');
        document.getElementById('total-users').textContent = stats.totalUsers;
        document.getElementById('total-hours').textContent = stats.totalHours.toFixed(2);
    } catch (err) {
        console.error(err);
    }
}

async function loadUsers() {
    try {
        const users = await apiCall('/admin/users');
        const list = document.getElementById('user-list');
        list.innerHTML = users.map(u => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 text-gray-900 font-medium">${u.id}</td>
                <td class="px-6 py-4 text-gray-900 font-semibold">${u.name}</td>
                <td class="px-6 py-4 text-gray-600">@${u.username}</td>
                <td class="px-6 py-4 text-gray-600">${u.email}</td>
                <td class="px-6 py-4 text-right space-x-2">
                    <a href="/report?userId=${u.id}" class="text-green-600 hover:text-green-800 font-bold mr-2">View Report</a>
                    <button onclick="openChangePassModal(${u.id}, '${u.name}')" class="text-indigo-600 hover:text-indigo-800 font-bold">Reset Pass</button>
                    ${u.username !== 'admin' ? `<button onclick="deleteUser(${u.id})" class="text-rose-600 hover:text-rose-800 font-bold">Delete</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

const addUserForm = document.getElementById('add-user-form');
if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-name').value;
        const email = document.getElementById('new-email').value;
        const username = document.getElementById('new-user-username').value;
        const password = document.getElementById('new-user-password').value;

        try {
            await apiCall('/admin/users', 'POST', { name, email, username, password });
            document.getElementById('add-user-modal').classList.add('hidden');
            loadUsers();
            loadDashboardStats();
            e.target.reset(); // Clear form
        } catch (err) {
            alert(err.message);
        }
    });
}

window.deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await apiCall(`/admin/users/${id}`, 'DELETE');
        loadUsers();
        loadDashboardStats();
    } catch (err) {
        alert(err.message);
    }
};

window.openChangePassModal = (id, name) => {
    document.getElementById('reset-user-id').value = id;
    document.getElementById('reset-user-name').textContent = `Resetting password for: ${name}`;
    document.getElementById('change-pass-modal').classList.remove('hidden');
};

const resetPassForm = document.getElementById('reset-pass-form');
if (resetPassForm) {
    resetPassForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('reset-user-id').value;
        const newPassword = document.getElementById('reset-new-password').value;

        try {
            await apiCall(`/admin/reset-user-password/${id}`, 'PUT', { newPassword });
            document.getElementById('change-pass-modal').classList.add('hidden');
            alert('Password reset successfully');
            e.target.reset();
        } catch (err) {
            alert(err.message);
        }
    });
}


window.loadAdminReports = async (filter) => {
    try {
        const reports = await apiCall(`/admin/reports?filter=${filter}`);
        const list = document.getElementById('report-list');
        list.innerHTML = reports.map(r => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-900">${r.name}</div>
                    <div class="text-gray-600 text-sm">@${r.username}</div>
                </td>
                <td class="px-6 py-4 font-mono text-lg font-bold text-indigo-600">${r.total_hours} hrs</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
};

// --- User Dashboard Logic ---

// --- Independent Timer States ---
let taskInterval, projectInterval;
let taskState = { active: false, startTime: null, baseSeconds: 0, isRunning: false };
let projectState = { active: false, startTime: null, baseSeconds: 0, isRunning: false, estimatedSeconds: 0 };

async function initTimer() {
    try {
        const status = await apiCall('/user/timer/status');

        // Sync General Task
        if (status.general.active) {
            taskState = {
                active: true,
                baseSeconds: status.general.totalSeconds,
                isRunning: status.general.isRunning,
                startTime: status.general.startTime ? new Date(status.general.startTime) : null
            };
            document.getElementById('work-description').value = status.general.workDescription || '';
        } else {
            taskState.active = false;
            taskState.isRunning = false;
            taskState.startTime = null;
            stopClientTimer(false);
        }

        // Sync Project Task
        if (status.project.active) {
            projectState = {
                active: true,
                baseSeconds: status.project.totalSeconds,
                isRunning: status.project.isRunning,
                startTime: status.project.startTime ? new Date(status.project.startTime) : null,
                estimatedSeconds: status.project.estimatedSeconds || 0
            };
            document.getElementById('project-name').value = status.project.projectName || '';
            document.getElementById('project-description').value = status.project.projectDescription || '';

            const h = Math.floor(status.project.estimatedSeconds / 3600);
            const m = Math.floor((status.project.estimatedSeconds % 3600) / 60);
            document.getElementById('estimated-hours').value = h || '';
            document.getElementById('estimated-minutes').value = m || '';
        } else {
            projectState.active = false;
            projectState.isRunning = false;
            projectState.startTime = null;
            stopClientTimer(true);
        }

        updateTimerUI();

        // Ensure intervals start if running
        if (taskState.isRunning) startClientTimer(false);
        if (projectState.isRunning) startClientTimer(true);

    } catch (err) {
        console.error(err);
    }
}

function startClientTimer(isProject = false) {
    if (isProject) {
        if (projectInterval) clearInterval(projectInterval);
        projectInterval = setInterval(updateProjectDisplay, 1000);
        updateProjectDisplay();
    } else {
        if (taskInterval) clearInterval(taskInterval);
        taskInterval = setInterval(updateTaskDisplay, 1000);
        updateTaskDisplay();
    }
}

function stopClientTimer(isProject = false) {
    if (isProject) {
        clearInterval(projectInterval);
        projectInterval = null;
    } else {
        clearInterval(taskInterval);
        taskInterval = null;
    }
}

function updateTaskDisplay() {
    let currentSeconds = taskState.baseSeconds;
    if (taskState.isRunning && taskState.startTime) {
        const diff = Math.floor((new Date() - new Date(taskState.startTime)) / 1000);
        currentSeconds += diff;
    }
    document.getElementById('timer-display').textContent = formatTime(currentSeconds);
}

function updateProjectDisplay() {
    let currentSeconds = projectState.baseSeconds;
    if (projectState.isRunning && projectState.startTime) {
        const diff = Math.floor((new Date() - new Date(projectState.startTime)) / 1000);
        currentSeconds += diff;
    }

    const display = document.getElementById('project-timer-display');
    if (!display) return;

    if (projectState.estimatedSeconds > 0) {
        const remaining = Math.max(0, projectState.estimatedSeconds - currentSeconds);
        display.textContent = formatTime(remaining);
        if (remaining === 0 && projectState.isRunning) {
            stopProjectAutomatically();
        }
    } else {
        display.textContent = formatTime(currentSeconds);
    }
}

async function stopProjectAutomatically() {
    stopClientTimer(true);
    try {
        await apiCall('/user/timer/stop', 'POST', {
            isProject: true,
            work_description: "Project ended automatically: Time limit reached.",
            completion_status: 'not_completed'
        });
        projectState.active = false;
        projectState.isRunning = false;
        updateTimerUI();
        loadUserReports('day');
        alert("Project session ended automatically: Time limit reached.");
    } catch (err) {
        console.error(err);
    }
}

function updateTimerUI() {
    // Task UI
    const btnTaskStart = document.getElementById('btn-start');
    const btnTaskPause = document.getElementById('btn-pause');
    const btnTaskResume = document.getElementById('btn-resume');
    const btnTaskFinish = document.getElementById('btn-finish');
    const btnTaskStop = document.getElementById('btn-stop');
    const taskDesc = document.getElementById('work-description');

    [btnTaskStart, btnTaskPause, btnTaskResume, btnTaskFinish, btnTaskStop].forEach(b => b?.classList.add('hidden'));

    if (!taskState.active) {
        btnTaskStart?.classList.remove('hidden');
        if (taskDesc) taskDesc.disabled = false;
        document.getElementById('timer-display').textContent = "00:00:00";
        stopClientTimer(false);
    } else {
        btnTaskFinish?.classList.remove('hidden');
        btnTaskStop?.classList.remove('hidden');
        if (taskDesc) taskDesc.disabled = true;
        if (taskState.isRunning) {
            btnTaskPause?.classList.remove('hidden');
            startClientTimer(false);
        } else {
            btnTaskResume?.classList.remove('hidden');
            stopClientTimer(false);
            updateTaskDisplay();
        }
    }

    // Project UI
    const btnProjStart = document.getElementById('btn-project-start');
    const btnProjStop = document.getElementById('btn-project-stop');
    const projName = document.getElementById('project-name');
    const projDesc = document.getElementById('project-description');
    const projH = document.getElementById('estimated-hours');
    const projM = document.getElementById('estimated-minutes');

    btnProjStart?.classList.add('hidden');
    btnProjStop?.classList.add('hidden');

    if (!projectState.active) {
        btnProjStart?.classList.remove('hidden');
        [projName, projDesc, projH, projM].forEach(el => el && (el.disabled = false));
        document.getElementById('project-timer-display').textContent = "00:00:00";
        stopClientTimer(true);
    } else {
        btnProjStop?.classList.remove('hidden');
        [projName, projDesc, projH, projM].forEach(el => el && (el.disabled = true));
        if (projectState.isRunning) {
            startClientTimer(true);
        } else {
            stopClientTimer(true);
            updateProjectDisplay();
        }
    }
}

// Task Listeners
if (document.getElementById('btn-start')) {
    document.getElementById('btn-start').addEventListener('click', async () => {
        const desc = document.getElementById('work-description').value;
        try {
            await apiCall('/user/timer/start', 'POST', { work_description: desc });
            await initTimer();
        } catch (err) { alert(err.message); }
    });
}
if (document.getElementById('btn-pause')) {
    document.getElementById('btn-pause').addEventListener('click', async () => {
        try { await apiCall('/user/timer/pause', 'POST', { isProject: false }); await initTimer(); } catch (err) { alert(err.message); }
    });
}
if (document.getElementById('btn-resume')) {
    document.getElementById('btn-resume').addEventListener('click', async () => {
        try { await apiCall('/user/timer/resume', 'POST', { isProject: false }); await initTimer(); } catch (err) { alert(err.message); }
    });
}
if (document.getElementById('btn-finish')) {
    document.getElementById('btn-finish').addEventListener('click', async () => {
        const desc = document.getElementById('work-description').value;
        try {
            await apiCall('/user/timer/stop', 'POST', { isProject: false, work_description: desc, completion_status: 'finished' });
            await initTimer();
            loadUserReports('day');
        } catch (err) { alert(err.message); }
    });
}
if (document.getElementById('btn-stop')) {
    document.getElementById('btn-stop').addEventListener('click', async () => {
        const desc = document.getElementById('work-description').value;
        try {
            await apiCall('/user/timer/stop', 'POST', { isProject: false, work_description: desc, completion_status: 'not_completed' });
            await initTimer();
            loadUserReports('day');
        } catch (err) { alert(err.message); }
    });
}

// Project Listeners
const btnProjStart = document.getElementById('btn-project-start');
if (btnProjStart) {
    btnProjStart.addEventListener('click', async () => {
        const name = document.getElementById('project-name').value;
        const desc = document.getElementById('project-description').value;
        const h = parseInt(document.getElementById('estimated-hours').value) || 0;
        const m = parseInt(document.getElementById('estimated-minutes').value) || 0;

        if (!name) return alert("Please enter a project name.");

        try {
            await apiCall('/user/timer/start', 'POST', {
                project_name: name,
                project_description: desc,
                estimated_seconds: (h * 3600) + (m * 60)
            });
            await initTimer();
        } catch (err) { alert(err.message); }
    });
}
const btnProjStop = document.getElementById('btn-project-stop');
if (btnProjStop) {
    btnProjStop.addEventListener('click', async () => {
        try {
            await apiCall('/user/timer/stop', 'POST', { isProject: true, completion_status: 'finished' });
            await initTimer();
            loadUserReports('day');
        } catch (err) { alert(err.message); }
    });
}

window.loadUserReports = async (filter) => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        let endpoint = `/user/reports?filter=${filter}`;
        if (userId) endpoint += `&userId=${userId}`;

        const data = await apiCall(endpoint);

        // Update Title if admin viewing user
        const titleEl = document.getElementById('report-title');
        if (titleEl && data.targetUserName) {
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('userId')) {
                titleEl.textContent = `Activities: ${data.targetUserName}`;
                titleEl.classList.add('text-indigo-600');
            } else {
                titleEl.textContent = "Your Activity";
                titleEl.classList.remove('text-indigo-600');
            }
        }

        const totalEl = document.getElementById('period-total');
        if (totalEl) totalEl.textContent = data.totalHours;

        const list = document.getElementById('logs-list');
        list.innerHTML = data.logs.map(log => {
            const statusColor = log.completion_status === 'finished' ? 'text-green-600' : (log.completion_status === 'not_completed' ? 'text-rose-600' : 'text-amber-600');
            return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 text-gray-700 font-medium">${new Date(log.log_date).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    <div class="font-bold text-gray-900">${log.project_name || 'Personal'}</div>
                    <div class="text-xs text-gray-500">${log.work_description || '-'}</div>
                </td>
                <td class="px-6 py-4 text-gray-600 text-sm">
                    ${log.initial_start_time ? new Date(log.initial_start_time).toLocaleTimeString() : '-'} - 
                    ${log.end_time ? new Date(log.end_time).toLocaleTimeString() : '...'}
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 ${statusColor} uppercase tracking-tighter">
                        ${log.completion_status || 'in_progress'}
                    </span>
                </td>
                <td class="px-6 py-4 text-right font-mono font-bold text-indigo-600">
                    ${formatTime(log.live_total_seconds)}
                </td>
            </tr>
        `}).join('');
    } catch (err) {
        console.error(err);
    }
};
