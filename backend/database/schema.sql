-- Hospital Appointment System Database Schema
-- MCA final year project: React + Express + MySQL

CREATE DATABASE IF NOT EXISTS hospital_appointment;
USE hospital_appointment;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'patient') NOT NULL,
    phone VARCHAR(15),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL,
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    department_id INT NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    qualification VARCHAR(100),
    experience INT DEFAULT 0,
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    available_status ENUM('available', 'unavailable') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    gender ENUM('male', 'female', 'other'),
    age INT,
    address TEXT,
    blood_group VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctor_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    doctor_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT DEFAULT 30,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_doctor_date_time (doctor_id, available_date, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_no VARCHAR(50) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    department_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    problem_description TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_amount DECIMAL(10,2) DEFAULT 0,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    diagnosis TEXT,
    prescription TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(150),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO departments (id, department_name, description, status) VALUES
(1, 'General Medicine', 'General health checkup and treatment', 'active'),
(2, 'Cardiology', 'Heart and cardiovascular system care', 'active'),
(3, 'Dermatology', 'Skin, hair, and nail conditions', 'active'),
(4, 'Orthopedics', 'Bone, joint, and muscle treatment', 'active'),
(5, 'Pediatrics', 'Healthcare for infants and children', 'active'),
(6, 'Neurology', 'Brain and nervous system care', 'active'),
(7, 'Gynecology', 'Women health and pregnancy care', 'active'),
(8, 'Ophthalmology', 'Eye care and vision treatment', 'active');

-- Demo password for all seed users: password123
INSERT IGNORE INTO users (id, name, email, password, role, phone, status) VALUES
(1, 'System Admin', 'admin@hospital.com', '$2b$10$yXiYX3HkTEn2OKV5ap63.OdXhr46yGVTv60wIXVXjmrFtggPgoBJi', 'admin', '9000000001', 'active'),
(2, 'Dr. Aisha Khan', 'aisha@hospital.com', '$2b$10$yXiYX3HkTEn2OKV5ap63.OdXhr46yGVTv60wIXVXjmrFtggPgoBJi', 'doctor', '9000000002', 'active'),
(3, 'Dr. Rahul Mehta', 'rahul@hospital.com', '$2b$10$yXiYX3HkTEn2OKV5ap63.OdXhr46yGVTv60wIXVXjmrFtggPgoBJi', 'doctor', '9000000003', 'active'),
(4, 'Priya Sharma', 'priya@example.com', '$2b$10$yXiYX3HkTEn2OKV5ap63.OdXhr46yGVTv60wIXVXjmrFtggPgoBJi', 'patient', '9000000004', 'active');

INSERT IGNORE INTO doctors (id, user_id, department_id, specialization, qualification, experience, consultation_fee, available_status) VALUES
(1, 2, 2, 'Interventional Cardiologist', 'MD, DM Cardiology', 11, 900.00, 'available'),
(2, 3, 1, 'Family Physician', 'MBBS, MD Medicine', 8, 600.00, 'available');

INSERT IGNORE INTO patients (id, user_id, gender, age, address, blood_group) VALUES
(1, 4, 'female', 24, 'Hyderabad', 'B+');

INSERT IGNORE INTO doctor_schedules (doctor_id, available_date, start_time, end_time, slot_duration, status) VALUES
(1, CURDATE(), '09:00:00', '13:00:00', 30, 'active'),
(1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', '14:00:00', 30, 'active'),
(2, CURDATE(), '11:00:00', '15:00:00', 30, 'active'),
(2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:30:00', '12:30:00', 30, 'active');
