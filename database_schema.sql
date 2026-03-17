-- Database Schema for HOSTEL MANAGEMENT SYSTEM

CREATE TABLE Students (
    student_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(50),
    year INT,
    hostel_id VARCHAR(20),
    password_hash VARCHAR(255) -- For authentication
);

CREATE TABLE Admins (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Wardens (
    warden_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE Daily_Menu (
    menu_date DATE PRIMARY KEY,
    breakfast_desc TEXT,
    lunch_desc TEXT,
    dinner_desc TEXT,
    cooking_staff_names TEXT -- JSON or comma-separated list of staff on duty
);

CREATE TABLE Meal_Attendance (
    attendance_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20),
    meal_date DATE,
    breakfast_opt_in BOOLEAN DEFAULT FALSE,
    lunch_opt_in BOOLEAN DEFAULT FALSE,
    dinner_opt_in BOOLEAN DEFAULT FALSE,
    breakfast_consumed BOOLEAN DEFAULT FALSE,
    lunch_consumed BOOLEAN DEFAULT FALSE,
    dinner_consumed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (student_id) REFERENCES Students(student_id),
    UNIQUE(student_id, meal_date)
);

CREATE TABLE Feedback (
    feedback_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20),
    meal_date DATE,
    meal_type ENUM('Breakfast', 'Lunch', 'Dinner'),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    FOREIGN KEY (student_id) REFERENCES Students(student_id)
);

-- Index for analytics performance
CREATE INDEX idx_attendance_date ON Meal_Attendance(meal_date);
