-- SQL Script for XAMPP MySQL / MariaDB
-- Database name: app_db

CREATE DATABASE IF NOT EXISTS app_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE app_db;

-- Table structure for `users`
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sample Test User
-- Email: test@gmail.com
-- Password: admin1234
INSERT INTO users (name, email, password) 
VALUES ('Usuario Administrador', 'test@gmail.com', '$2y$10$CtIJuwSXWhxazw/ujFFKo.j.s6ve6dUphFl/K1IZcH6PbHGesIMKG')
ON DUPLICATE KEY UPDATE 
    name='Usuario Administrador', 
    password='$2y$10$CtIJuwSXWhxazw/ujFFKo.j.s6ve6dUphFl/K1IZcH6PbHGesIMKG';

-- Table structure for `products`
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
