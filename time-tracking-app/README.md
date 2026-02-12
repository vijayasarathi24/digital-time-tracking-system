# Digital Time Tracking System

A full-stack Time Tracking Web Application built with Node.js, Express, MySQL, and Vanilla JS + Tailwind CSS.

## 🚀 Features

### Admin Portal
- **Dashboard Stats**: View total users and total logged hours.
- **User Management**: Create, view, delete users, and reset passwords.
- **Reports**: View aggregated work hours by Day, Week, or Month.

### User Portal
- **Live Timer**: Start, Pause, Resume, and Stop work sessions.
- **Work Logs**: View personal work history with duration.
- **Reports**: Filter activity by Day, Week, or Month.

### Security
- **Authentication**: Session-based login with hashed passwords (bcrypt).
- **Authorization**: Role-based access control (Admin vs User).
- **Input Validation**: Secure API endpoints.

## 🛠️ Tech Stack
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript (Fetch API).
- **Backend**: Node.js, Express.js.
- **Database**: MySQL 8+ (relational schema).
- **Authentication**: express-session, bcrypt.

## 📦 Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server (v8+)

### 2. Database Setup
1. Open your MySQL client (Workbench, CLI, etc.).
2. Create a new database or use an existing one.
3. Import the schema from `database/schema.sql`:
   ```sql
   source database/schema.sql;
   ```
   *Note: This script creates the database `time_tracking_db` (if not exists) and tables.*

### 3. Backend Configuration
1. Navigate to the `time-tracking-app` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```ini
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=time_tracking_db
   DB_PORT=3000
   SESSION_SECRET=your_secret_key
   PORT=3001
   ```
   *Update `DB_USER` and `DB_PASSWORD` to match your local MySQL credentials.*
   *Note: I detected MySQL running on port 3000. If your setup is different, update `DB_PORT`.*

### 4. Run the Application
Start the server:
```bash
npm start
```
The server will start on `http://localhost:3001`.

## 🧪 How to Use

1. Open `http://localhost:3001` in your browser.
2. **Admin Login**:
   - URL: `http://localhost:3001/login-admin.html`
   - Default Credentials:
     - Username: `admin`
     - Password: `admin123`
3. **User Login**:
   - URL: `http://localhost:3001/login-user.html`
   - Default Credentials:
     - Username: `user`
     - Password: `user123`
   *You can create more users from the Admin Dashboard.*

## 🐛 Common Issues & Fixes

1. **Database Connection Failed**:
   - Check if MySQL server is running.
   - Verify credentials in `.env`.
   - Ensure database `time_tracking_db` exists.

2. **Login Fails**:
   - Ensure you ran `schema.sql` which inserts default users.
   - Check console logs for server errors.

3. **Timer Not Updating**:
   - Ensure JavaScript is enabled.
   - Check browser console for errors.

## 📂 API Endpoints
- **Auth**: `/api/auth/admin/login`, `/api/auth/user/login`, `/api/auth/logout`, `/api/auth/session`
- **Admin**: `/api/admin/dashboard`, `/api/admin/users` (CRUD), `/api/admin/reports`
- **User**: `/api/user/timer/start`, `/api/user/timer/stop`, `/api/user/reports`
