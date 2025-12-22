-- =====================================================
-- MySQL Schema for Donation & Charity Management Portal
-- Database: donation_charity
-- Port: 3307
-- =====================================================
--
-- ✅ FOR FRESH DATABASE: Run from line 1 to line 320 (END OF SCHEMA)
--    This will create all tables with all required columns.
--    Account details columns are already included in donation_requests table.
--
-- ⚠️ FOR EXISTING DATABASE: Skip to UPDATE SCRIPT section (line 338+)
--    Only run the commands you need to add missing columns.
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
    ngo_id VARCHAR(50) UNIQUE, -- Auto-generated: NGO-2025-0001 format
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
    registration_number VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    -- Verification fields
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    rejection_reason TEXT, -- Reason for rejection (if rejected)
    verified BOOLEAN DEFAULT FALSE, -- Legacy field (keep for backward compatibility)
    admin_approval_for_edit BOOLEAN DEFAULT FALSE,
    pending_profile_updates JSON, -- Store pending profile updates waiting for admin approval
    is_blocked BOOLEAN DEFAULT FALSE,
    address_locked BOOLEAN DEFAULT FALSE, -- Lock address after initial submission
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_ngo_id (ngo_id),
    INDEX idx_is_blocked (is_blocked),
    INDEX idx_verified (verified),
    INDEX idx_verification_status (verification_status)
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
-- 7. DONATION_REQUESTS TABLE (NGO creates requests for what they need)
-- =====================================================
CREATE TABLE IF NOT EXISTS donation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    ngo_name VARCHAR(255) NOT NULL, -- Display purpose
    ngo_address VARCHAR(500) NOT NULL, -- Display purpose
    donation_type ENUM('FOOD', 'FUNDS', 'CLOTHES', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER') NOT NULL,
    quantity_or_amount DECIMAL(15, 2) NOT NULL,
    description TEXT, -- Optional description
    -- Account details for FUNDS type (optional)
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(255),
    ifsc_code VARCHAR(50),
    account_holder_name VARCHAR(255),
    status ENUM('ACTIVE', 'CLOSED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ngo_id (ngo_id),
    INDEX idx_status (status),
    INDEX idx_donation_type (donation_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. DONATION_REQUEST_IMAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS donation_request_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES donation_requests(id) ON DELETE CASCADE,
    INDEX idx_request_id (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. CONTRIBUTIONS TABLE (for old donations table)
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
-- 10. DONATION_REQUEST_CONTRIBUTIONS TABLE (for donation_requests)
-- =====================================================
CREATE TABLE IF NOT EXISTS donation_request_contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    donor_id INT NOT NULL,
    quantity_or_amount DECIMAL(15, 2) NOT NULL,
    pickup_location VARCHAR(500) NOT NULL,
    pickup_date DATE NOT NULL,
    pickup_time TIME NOT NULL,
    notes TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES donation_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    INDEX idx_request_id (request_id),
    INDEX idx_donor_id (donor_id),
    INDEX idx_status (status),
    INDEX idx_pickup_date (pickup_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. DONATION_REQUEST_CONTRIBUTION_IMAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS donation_request_contribution_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contribution_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contribution_id) REFERENCES donation_request_contributions(id) ON DELETE CASCADE,
    INDEX idx_contribution_id (contribution_id)
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
    purpose ENUM('REGISTRATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'ADMIN_REGISTRATION') DEFAULT 'REGISTRATION',
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

-- =====================================================
-- IMPORTANT: If you already created the tables before,
-- you MUST run this ALTER command to update the OTP purpose ENUM:
-- =====================================================
-- 
-- Run this SQL in phpMyAdmin SQL tab:
--
-- USE donation_charity;
-- ALTER TABLE otp_verifications 
-- MODIFY COLUMN purpose ENUM('REGISTRATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'ADMIN_REGISTRATION') 
-- DEFAULT 'REGISTRATION';
--
-- Without this, admin registration OTP verification will NOT work!
-- =====================================================

-- =====================================================
-- END OF FRESH DATABASE SCHEMA
-- =====================================================
-- 
-- ✅ If you're creating a FRESH database, STOP HERE!
--    All tables are created with all required columns.
--    The account details columns are already included in
--    the donation_requests table (lines 159-162).
--
-- =====================================================
-- UPDATE SCRIPT FOR EXISTING DATABASES ONLY
-- =====================================================
-- ⚠️ DO NOT RUN THIS SECTION IF CREATING A FRESH DATABASE!
--    This section is ONLY for databases that already exist
--    and need to add missing columns.
-- =====================================================
-- 
-- To use this update script:
-- 1. Make sure your database already has tables
-- 2. Run only the commands you need
-- 3. Skip commands that give "Duplicate column name" errors
-- =====================================================

-- Uncomment the section below ONLY if you have an existing database:

/*
USE donation_charity;

-- Add account details columns (only if they don't exist)
ALTER TABLE donation_requests ADD COLUMN bank_account_number VARCHAR(50);
ALTER TABLE donation_requests ADD COLUMN bank_name VARCHAR(255);
ALTER TABLE donation_requests ADD COLUMN ifsc_code VARCHAR(50);
ALTER TABLE donation_requests ADD COLUMN account_holder_name VARCHAR(255);

-- Add indexes (only if they don't exist)
CREATE INDEX idx_ngo_id ON users(ngo_id);
CREATE INDEX idx_verification_status ON users(verification_status);

-- Update existing data (only if you have existing records)
UPDATE users 
SET verification_status = CASE 
    WHEN verified = TRUE THEN 'VERIFIED'
    ELSE 'PENDING'
END
WHERE role = 'NGO' AND (verification_status IS NULL OR verification_status = '');

UPDATE users u1
SET ngo_id = CONCAT('NGO-', YEAR(created_at), '-', LPAD(
    (SELECT COUNT(*) FROM users u2 
     WHERE u2.role = 'NGO' 
     AND u2.id <= u1.id 
     AND YEAR(u2.created_at) = YEAR(u1.created_at)), 
    4, '0'))
WHERE u1.role = 'NGO' AND (u1.ngo_id IS NULL OR u1.ngo_id = '');

-- Update OTP purpose ENUM
ALTER TABLE otp_verifications 
MODIFY COLUMN purpose ENUM('REGISTRATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'ADMIN_REGISTRATION') 
DEFAULT 'REGISTRATION';
*/

-- =====================================================
-- UTILITY SCRIPTS
-- =====================================================
-- These are helper scripts you can use when needed
-- =====================================================

-- =====================================================
-- UTILITY 1: Check if account detail columns exist
-- =====================================================
-- Run this to see which account detail columns already exist
-- =====================================================
/*
USE donation_charity;

-- Check the structure of donation_requests table
DESCRIBE donation_requests;

-- Or check for specific columns
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'donation_charity'
  AND TABLE_NAME = 'donation_requests'
  AND COLUMN_NAME IN (
    'bank_account_number',
    'bank_name',
    'ifsc_code',
    'account_holder_name'
  );
*/

-- =====================================================
-- UTILITY 2: Add account details columns only (minimal script)
-- =====================================================
-- Use this if you ONLY need to add the 4 account detail columns
-- Skip all users table columns - they already exist!
-- =====================================================
/*
USE donation_charity;

-- Add account details columns to donation_requests table
-- These 4 columns are what you need for FUNDS donation requests
-- If you get "Duplicate column name" error, that column already exists

ALTER TABLE donation_requests ADD COLUMN bank_account_number VARCHAR(50);
ALTER TABLE donation_requests ADD COLUMN bank_name VARCHAR(255);
ALTER TABLE donation_requests ADD COLUMN ifsc_code VARCHAR(50);
ALTER TABLE donation_requests ADD COLUMN account_holder_name VARCHAR(255);

-- Check if columns were added
DESCRIBE donation_requests;

SELECT 'Done! Check DESCRIBE results above to see the new columns.' AS result;
*/

-- =====================================================
-- END OF ALL SQL SCRIPTS
-- =====================================================
