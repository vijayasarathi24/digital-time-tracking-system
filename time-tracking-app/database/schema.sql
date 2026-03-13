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
    pass_word VARCHAR(255) NOT NULL,
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
    project_reference VARCHAR(255),
    project_description TEXT,
    estimated_seconds INT DEFAULT 0,
    completion_status ENUM('finished', 'not_completed', 'in_progress') DEFAULT 'in_progress',
    start_time DATETIME,
    end_time DATETIME,
    total_seconds INT DEFAULT 0,
    log_date DATE DEFAULT (CURRENT_DATE),
    initial_start_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_time_logs_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_active_user (user_id, end_time),
    INDEX idx_active_admin (admin_id, end_time),
    INDEX idx_log_date (log_date)
);

-- Note: 'accounts' table (if exists) is deprecated in favor of separate linked tables 
-- to maintain strict ownership and different permission sets.

-- Insert Default Admin (password: admin123)
INSERT INTO admins (username, password_hash) 
VALUES ('admin', '$2b$10$vpMy7dgWDuiqepaRv.L6veo/sLnrfQ7vWUPo0z4UywoJ9DJ2h8J1e')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Insert Users
INSERT INTO users (admin_id, name, username, email, pass_word) VALUES
(1, 'AHILL PRANAV M', 'ahill pranav', 'ahillpranav.ct23@bitsathy.ac.in', '7376232CT101'),
(1, 'ANIRUTH J R', 'aniruth', 'aniruth.ct23@bitsathy.ac.in', '7376232CT102'),
(1, 'ANNA POORANI K', 'anna poorani', 'annapoorani.ct23@bitsathy.ac.in', '7376232CT103'),
(1, 'ANUVARSHINI K S', 'anuvarshini', 'anuvarshini.ct23@bitsathy.ac.in', '7376232CT104'),
(1, 'ARAVINTH V', 'aravinth', 'aravinthv.ct23@bitsathy.ac.in', '7376232CT105'),
(1, 'ARJUN C', 'arjun', 'arjun.ct23@bitsathy.ac.in', '7376232CT106'),
(1, 'ASHVANTH KARTHIC R', 'ashvanth karthic', 'ashvanthkarthic.ct23@bitsathy.ac.in', '7376232CT107'),
(1, 'DHARANI M', 'dharani', 'dharani.ct23@bitsathy.ac.in', '7376232CT108'),
(1, 'DHARINEESH V', 'dharineesh', 'dharineesh.ct23@bitsathy.ac.in', '7376232CT109'),
(1, 'DHARSHINI A T', 'dharshini', 'dharshini.ct23@bitsathy.ac.in', '7376232CT110'),
(1, 'DHIVYA DHARSHINI S', 'dhivya dharshini', 'dhivyadharshini.ct23@bitsathy.ac.in', '7376232CT111'),
(1, 'DIVYADHARSHINI K', 'divyadharshini', 'divyadharshinik.ct23@bitsathy.ac.in', '7376232CT113'),
(1, 'GESNA P', 'gesna', 'gesna.ct23@bitsathy.ac.in', '7376232CT115'),
(1, 'HARIHARAN S', 'hariharan', 'hariharan.ct23@bitsathy.ac.in', '7376232CT116'),
(1, 'JAGAN M', 'jagan', 'jaganm.ct23@bitsathy.ac.in', '7376232CT117'),
(1, 'KAMALESH V', 'kamalesh', 'kamalesh.ct23@bitsathy.ac.in', '7376232CT118'),
(1, 'KARANEESH A', 'karaneesh', 'karaneesha.ct23@bitsathy.ac.in', '7376232CT119'),
(1, 'KAUSHI K S', 'kaushi', 'kaushi.ct23@bitsathy.ac.in', '7376232CT120'),
(1, 'KAVISURYA B', 'kavisurya', 'kavisurya.ct23@bitsathy.ac.in', '7376232CT121'),
(1, 'KISHORE B V', 'kishore', 'kishore.ct23@bitsathy.ac.in', '7376232CT122'),
(1, 'MIDHUVARSHNI S', 'midhuvarshni', 'midhuvarshni.ct23@bitsathy.ac.in', '7376232CT123'),
(1, 'MOHANA KRISHNA K J', 'mohana krishna', 'mohanakrishna.ct23@bitsathy.ac.in', '7376232CT124'),
(1, 'MUGILAN D', 'mugilan', 'mugiland.ct23@bitsathy.ac.in', '7376232CT125'),
(1, 'NARESH V', 'naresh', 'naresh.ct23@bitsathy.ac.in', '7376232CT127'),
(1, 'PARTHASARATHY PALANIALAGU', 'parthasarathy palanialagu', 'parthasarathy.ct23@bitsathy.ac.in', '7376232CT128'),
(1, 'PRADHYUMNAN SHANKAR', 'pradhyumnan shankar', 'pradhyumnanshankar.ct23@bitsathy.ac.in', '7376232CT129'),
(1, 'PRANESH S', 'pranesh', 'pranesh.ct23@bitsathy.ac.in', '7376232CT130'),
(1, 'PRAVEEN V', 'praveen', 'praveen.ct23@bitsathy.ac.in', '7376232CT131'),
(1, 'PRIYADHARSHINI K', 'priyadharshini', 'priyadharshini.ct23@bitsathy.ac.in', '7376232CT132'),
(1, 'RAAGHAV K S', 'raaghav', 'raaghav.ct23@bitsathy.ac.in', '7376232CT133'),
(1, 'RAMANAN M', 'ramanan', 'ramanan.ct23@bitsathy.ac.in', '7376232CT136'),
(1, 'RHIDHANYA K', 'rhidhanya', 'rhidhanya.ct23@bitsathy.ac.in', '7376232CT137'),
(1, 'RITHIGHA SHRI K V', 'rithigha shri', 'rithighashri.ct23@bitsathy.ac.in', '7376232CT138'),
(1, 'RITHIKHA G', 'rithikha', 'rithikha.ct23@bitsathy.ac.in', '7376232CT139'),
(1, 'RITHU PAVISHA S', 'rithu pavisha', 'rithupavisha.ct23@bitsathy.ac.in', '7376232CT140'),
(1, 'ROHIT KANGOTRA', 'rohit kangotra', 'rohitkangotras.ct23@bitsathy.ac.in', '7376232CT141'),
(1, 'ROSHINI R', 'roshini', 'roshini.ct23@bitsathy.ac.in', '7376232CT142'),
(1, 'SANJAY R', 'sanjay', 'sanjay.ct23@bitsathy.ac.in', '7376232CT143'),
(1, 'SANTHOSH B', 'santhosh', 'santhosh.ct23@bitsathy.ac.in', '7376232CT144'),
(1, 'SAUTANYHASSRE B T', 'sautanyhassre', 'sautanyhassre.ct23@bitsathy.ac.in', '7376232CT145'),
(1, 'SHAJANA MIRSHA I', 'shajana mirsha', 'shajanamirsha.ct23@bitsathy.ac.in', '7376232CT146'),
(1, 'SHREYA BABU', 'shreya babu', 'shreya.ct23@bitsathy.ac.in', '7376232CT147'),
(1, 'SOBANA M', 'sobana', 'sobana.ct23@bitsathy.ac.in', '7376232CT148'),
(1, 'SONA SRI S R', 'sona sri', 'sonasrisr.ct23@bitsathy.ac.in', '7376232CT149'),
(1, 'SRIGANTH D', 'sriganth', 'sriganth.ct23@bitsathy.ac.in', '7376232CT150'),
(1, 'SUDHIR S', 'sudhir', 'sudhir.ct23@bitsathy.ac.in', '7376232CT151'),
(1, 'SUKESH R', 'sukesh', 'sukesh.ct23@bitsathy.ac.in', '7376232CT152'),
(1, 'THANISHA G', 'thanisha', 'thanisha.ct23@bitsathy.ac.in', '7376232CT154'),
(1, 'THILAK R P', 'thilak', 'thilak.ct23@bitsathy.ac.in', '7376232CT155'),
(1, 'THIRUGNANAVEL M', 'thirugnanavel', 'thirugnanavel.ct23@bitsathy.ac.in', '7376232CT156'),
(1, 'VAISHNAVI K', 'vaishnavi', 'vaishnavi.ct23@bitsathy.ac.in', '7376232CT157'),
(1, 'VARNA VIGAASINI M', 'varna vigaasini', 'varnavigaasini.ct23@bitsathy.ac.in', '7376232CT158'),
(1, 'VARSHA C', 'varsha', 'varsha.ct23@bitsathy.ac.in', '7376232CT159'),
(1, 'VIGNESH M', 'vignesh', 'vignesh.ct23@bitsathy.ac.in', '7376232CT160'),
(1, 'VIJAYASARATHI S', 'vijayasarathi', 'vijayasarathi.ct23@bitsathy.ac.in', '7376232CT161'),
(1, 'VISHNU PRASAD S', 'vishnu prasad', 'vishnuprasad.ct23@bitsathy.ac.in', '7376232CT162'),
(1, 'ROSHAN PRAVEEN D', 'roshan praveen', 'roshanpraveen.ct23@bitsathy.ac.in', '7376242CT502'),
(1, 'SUGAVANTH S M', 'sugavanth', 'sugavanthsm.ct23@bitsathy.ac.in', '7376242CT503');
