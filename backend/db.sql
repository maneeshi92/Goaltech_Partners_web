CREATE DATABASE IF NOT EXISTS goal_tech;
USE goal_tech;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS businesses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    gst_vat VARCHAR(100),
    registered_address TEXT,
    reject_reason TEXT,
    status ENUM('active', 'inactive', 'pending', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facilities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    business_id INT NOT NULL,
    venue VARCHAR(255),
    venue_location VARCHAR(255),
    type VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    icon VARCHAR(100),
    mode VARCHAR(50),
    status ENUM('active', 'inactive') DEFAULT 'active',
    hours JSON,
    amenities JSON,
    price DECIMAL(10, 2),
    weekendPrice DECIMAL(10, 2),
    peakPrice DECIMAL(10, 2),
    peakStart TIME,
    peakEnd TIME,
    capacity INT,
    description TEXT,
    phone VARCHAR(20),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
