CREATE DATABASE IF NOT EXISTS time_tracking_db;
USE time_tracking_db;

-- 1. Admins Table
-- This is the top-level table for system administrators.
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
-- Linked to admins via admin_id. 
-- Each user is managed by an admin (or system default).
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
);

-- 3. Time Logs Table
-- Linked to both users and admins.
-- This allows both types of accounts to track time independently.
CREATE TABLE IF NOT EXISTS time_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    admin_id INT NULL,
    work_description TEXT,
    project_name VARCHAR(255),
    project_description TEXT,
    estimated_seconds INT DEFAULT 0,
    completion_status ENUM('finished', 'not_completed', 'in_progress') DEFAULT 'in_progress',
    start_time DATETIME,
    end_time DATETIME,
    total_seconds INT DEFAULT 0,
    log_date DATE DEFAULT (CURRENT_DATE),
    initial_start_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_time_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_time_logs_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Note: 'accounts' table (if exists) is deprecated in favor of separate linked tables 
-- to maintain strict ownership and different permission sets.

-- Insert Default Admin (password: admin123)
INSERT INTO admins (username, password_hash) 
VALUES ('admin', '$2b$10$vpMy7dgWDuiqepaRv.L6veo/sLnrfQ7vWUPo0z4UywoJ9DJ2h8J1e')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Insert Test User (password: user123)
-- This user is linked to the default admin (id=1)
INSERT INTO users (name, email, username, password_hash, admin_id) 
VALUES ('Test User', 'test@example.com', 'user', '$2b$10$qGBY1AZ8zYH60TWZtr4pA/NiNBGeTJOmCtxWiiTxlP/hSg5A', 1)
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
