-- =====================================================
-- MySQL Schema for Donation & Charity Management Portal
-- Database: donation_charity
-- Port: 3307
-- =====================================================

-- Drop database if exists (use with caution in production)
-- DROP DATABASE IF EXISTS donation_charity;

-- Create database
CREATE DATABASE IF NOT EXISTS donation_charity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE donation_charity;

-- =====================================================
-- 1. USERS TABLE (NGOs)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('NGO') DEFAULT 'NGO' NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    -- Profile fields
    contact_person_name VARCHAR(255),
    phone_number VARCHAR(50),
    about_ngo TEXT,
    website_url VARCHAR(500),
    logo_url VARCHAR(500),
    registration_number VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    verified BOOLEAN DEFAULT FALSE,
    admin_approval_for_edit BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. DONORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS donors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    full_address TEXT,
    role ENUM('DONOR') DEFAULT 'DONOR' NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_is_blocked (is_blocked)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    role ENUM('ADMIN') DEFAULT 'ADMIN' NOT NULL,
    permissions JSON, -- Store permissions as JSON array: ["permission1", "permission2"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. DONATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    donation_type VARCHAR(50) NOT NULL, -- Legacy field: FOOD, FUNDS, CLOTHES, etc.
    donation_category ENUM('CLOTHES', 'FOOD', 'MONEY'),
    purpose VARCHAR(500),
    description TEXT,
    quantity_or_amount DECIMAL(15, 2) NOT NULL,
    -- Location fields (flattened from nested object)
    location_address VARCHAR(500) NOT NULL,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    use_current_location BOOLEAN DEFAULT FALSE,
    -- Pickup details
    pickup_date_time DATETIME,
    timezone VARCHAR(100), -- IANA timezone identifier
    -- Status and priority
    status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    priority ENUM('NORMAL', 'URGENT') DEFAULT 'NORMAL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ngo_id (ngo_id),
    INDEX idx_status (status),
    INDEX idx_donation_category (donation_category),
    INDEX idx_created_at (created_at),
    INDEX idx_location_coords (location_latitude, location_longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. DONATION_IMAGES TABLE (Junction table for images array)
-- =====================================================
CREATE TABLE IF NOT EXISTS donation_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_order INT DEFAULT 0, -- To preserve order of images
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    INDEX idx_donation_id (donation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. DONATION_PAYMENT_DETAILS TABLE (For MONEY donations)
-- =====================================================
CREATE TABLE IF NOT EXISTS donation_payment_details (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL UNIQUE, -- One-to-one relationship
    qr_code_image VARCHAR(500),
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(255),
    ifsc_code VARCHAR(50),
    account_holder_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    INDEX idx_donation_id (donation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. CONTRIBUTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    donor_id INT NOT NULL,
    notes TEXT,
    scheduled_pickup_time DATETIME, -- Legacy field
    pickup_scheduled_date_time DATETIME NOT NULL,
    donor_address VARCHAR(500) NOT NULL,
    donor_contact_number VARCHAR(50) NOT NULL,
    pickup_status ENUM('SCHEDULED', 'PICKED_UP', 'CANCELLED') DEFAULT 'SCHEDULED',
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    INDEX idx_donation_id (donation_id),
    INDEX idx_donor_id (donor_id),
    INDEX idx_status (status),
    INDEX idx_pickup_status (pickup_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. PAYMENTS TABLE (For MONEY donations)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    donor_id INT NOT NULL,
    ngo_id INT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_reference_id VARCHAR(255) NOT NULL UNIQUE,
    donor_provided_reference VARCHAR(255),
    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
    verified_by_role ENUM('NGO', 'ADMIN'),
    verified_by_id INT, -- Can reference admins.id or users.id depending on verified_by_role
    verified_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_donation_donor (donation_id, donor_id),
    INDEX idx_ngo_status (ngo_id, payment_status),
    INDEX idx_transaction_ref (transaction_reference_id),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Donations with NGO info and image count
CREATE OR REPLACE VIEW donations_with_details AS
SELECT 
    d.*,
    u.name AS ngo_name,
    u.email AS ngo_email,
    u.contact_info AS ngo_contact_info,
    (SELECT COUNT(*) FROM donation_images di WHERE di.donation_id = d.id) AS image_count,
    (SELECT COUNT(*) FROM contributions c WHERE c.donation_id = d.id) AS contribution_count
FROM donations d
LEFT JOIN users u ON d.ngo_id = u.id;

-- View: Contributions with donor and donation info
CREATE OR REPLACE VIEW contributions_with_details AS
SELECT 
    c.*,
    d.name AS donor_name,
    d.email AS donor_email,
    d.contact_info AS donor_contact_info,
    don.donation_category,
    don.purpose,
    don.quantity_or_amount,
    u.name AS ngo_name
FROM contributions c
LEFT JOIN donors d ON c.donor_id = d.id
LEFT JOIN donations don ON c.donation_id = don.id
LEFT JOIN users u ON don.ngo_id = u.id;

-- =====================================================
-- 9. OTP VERIFICATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS otp_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose ENUM('REGISTRATION', 'PASSWORD_RESET', 'EMAIL_CHANGE') DEFAULT 'REGISTRATION',
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_otp_code (otp_code),
    INDEX idx_expires_at (expires_at),
    INDEX idx_verified (verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

