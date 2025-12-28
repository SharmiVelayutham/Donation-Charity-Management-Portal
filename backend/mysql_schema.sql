
CREATE DATABASE IF NOT EXISTS donation_charity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE donation_charity;
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id VARCHAR(50) UNIQUE, -- Auto-generated: NGO-2025-0001 format
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('NGO') DEFAULT 'NGO' NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
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
CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    donation_type VARCHAR(50) NOT NULL, -- Legacy field: FOOD, FUNDS, CLOTHES, etc.
    donation_category ENUM('CLOTHES', 'FOOD', 'MONEY'),
    purpose VARCHAR(500),
    description TEXT,
    quantity_or_amount DECIMAL(15, 2) NOT NULL,
    location_address VARCHAR(500) NOT NULL,
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    use_current_location BOOLEAN DEFAULT FALSE,
    pickup_date_time DATETIME,
    timezone VARCHAR(100), -- IANA timezone identifier
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
CREATE TABLE IF NOT EXISTS donation_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donation_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_order INT DEFAULT 0, -- To preserve order of images
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    INDEX idx_donation_id (donation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
CREATE TABLE IF NOT EXISTS donation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    ngo_name VARCHAR(255) NOT NULL, -- Display purpose
    ngo_address VARCHAR(500) NOT NULL, -- Display purpose
    donation_type ENUM('FOOD', 'FUNDS', 'CLOTHES', 'MEDICINE', 'BOOKS', 'TOYS', 'OTHER') NOT NULL,
    quantity_or_amount DECIMAL(15, 2) NOT NULL,
    description TEXT, -- Optional description
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
CREATE TABLE IF NOT EXISTS donation_request_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES donation_requests(id) ON DELETE CASCADE,
    INDEX idx_request_id (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
CREATE TABLE IF NOT EXISTS donation_request_contributions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    donor_id INT NOT NULL,
    quantity_or_amount DECIMAL(15, 2) NOT NULL,
    pickup_location VARCHAR(500) NULL, -- NULL allowed for FUNDS donations
    pickup_date DATE NULL, -- NULL allowed for FUNDS donations
    pickup_time TIME NULL, -- NULL allowed for FUNDS donations
    notes TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'ACCEPTED', 'NOT_RECEIVED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES donation_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
    INDEX idx_request_id (request_id),
    INDEX idx_donor_id (donor_id),
    INDEX idx_status (status),
    INDEX idx_pickup_date (pickup_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS donation_request_contribution_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contribution_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contribution_id) REFERENCES donation_request_contributions(id) ON DELETE CASCADE,
    INDEX idx_contribution_id (contribution_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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

/*
USE donation_charity;
ALTER TABLE donation_requests ADD COLUMN bank_account_number VARCHAR(50);
ALTER TABLE donation_requests ADD COLUMN bank_name VARCHAR(255);
ALTER TABLE donation_requests ADD COLUMN ifsc_code VARCHAR(50);
ALTER TABLE donation_requests ADD COLUMN account_holder_name VARCHAR(255);
CREATE INDEX idx_ngo_id ON users(ngo_id);
CREATE INDEX idx_verification_status ON users(verification_status);
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
ALTER TABLE otp_verifications 
MODIFY COLUMN purpose ENUM('REGISTRATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'ADMIN_REGISTRATION') 
DEFAULT 'REGISTRATION';
*/
USE donation_charity;
CREATE TABLE IF NOT EXISTS email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_type VARCHAR(50) NOT NULL UNIQUE,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_template_type (template_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT INTO email_templates (template_type, subject, body_html, is_default)
VALUES (
    'NGO_UNBLOCK',
    'NGO Account Unblocked - Donation & Charity Portal',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NGO Account Unblocked</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔓 Account Unblocked</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #0f172a;">Dear {{NGO_NAME}},</p>
    
    <p style="font-size: 16px; color: #0f172a;">Good news! 🎉</p>
    
    <p style="font-size: 16px; color: #0f172a;">
      We are happy to inform you that your NGO account has been <strong>successfully unblocked</strong> after review by the Admin team.
    </p>
    
    <h3 style="color: #0f172a; margin-top: 30px; margin-bottom: 15px;">🔓 Account Status</h3>
    
    <ul style="font-size: 16px; color: #0f172a; padding-left: 20px;">
      <li><strong>Current status:</strong> Active</li>
      <li><strong>Effective from:</strong> {{UNBLOCK_DATE}}</li>
    </ul>
    
    <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
      <p style="font-size: 15px; color: #0f172a; margin: 0;"><strong>Note:</strong> {{UNBLOCK_REASON}}</p>
    </div>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 20px;">You can now:</p>
    
    <ul style="font-size: 16px; color: #0f172a; padding-left: 20px;">
      <li>Create new donation requests</li>
      <li>Receive donor contributions</li>
      <li>Access your NGO dashboard normally</li>
    </ul>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 20px;">
      We appreciate your cooperation and commitment to following platform guidelines.
    </p>
    
    <p style="font-size: 16px; color: #0f172a;">
      If you have any questions or need assistance, feel free to reach out to us at:<br>
      <strong>{{SUPPORT_EMAIL}}</strong>
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      We look forward to your continued impact and contribution to the community.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      Best wishes,<br>
      <strong>Admin Team</strong><br>
      Donation & Charity Management Portal
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © 2025 Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>',
    TRUE
)
ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    body_html = VALUES(body_html),
    updated_at = NOW();
INSERT INTO email_templates (template_type, subject, body_html, is_default)
VALUES (
    'NGO_BLOCK',
    'NGO Account Blocked - Donation & Charity Portal',
    '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NGO Account Blocked</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Account Blocked</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #0f172a;">Dear {{NGO_NAME}},</p>
    
    <p style="font-size: 16px; color: #0f172a;">
      We regret to inform you that your NGO account has been <strong>blocked</strong> by the Admin team after review.
    </p>
    
    <h3 style="color: #0f172a; margin-top: 30px; margin-bottom: 15px;">🔒 Account Status</h3>
    
    <ul style="font-size: 16px; color: #0f172a; padding-left: 20px;">
      <li><strong>Current status:</strong> Blocked</li>
      <li><strong>Effective from:</strong> {{BLOCK_DATE}}</li>
    </ul>
    
    <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
      <p style="font-size: 15px; color: #0f172a; margin: 0;"><strong>Reason:</strong> {{BLOCK_REASON}}</p>
    </div>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 20px;">While your account is blocked, you will not be able to:</p>
    
    <ul style="font-size: 16px; color: #0f172a; padding-left: 20px;">
      <li>Create new donation requests</li>
      <li>Receive donor contributions</li>
      <li>Access all features of your NGO dashboard</li>
    </ul>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 20px;">
      If you believe this action was taken in error, or if you have questions about this decision, please contact our support team.
    </p>
    
    <p style="font-size: 16px; color: #0f172a;">
      For assistance or to appeal this decision, please reach out to us at:<br>
      <strong>{{SUPPORT_EMAIL}}</strong>
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      We hope to resolve this matter and work together toward a positive resolution.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      Best regards,<br>
      <strong>Admin Team</strong><br>
      Donation & Charity Management Portal
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © 2025 Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>',
    TRUE
)
ON DUPLICATE KEY UPDATE
    subject = VALUES(subject),
    body_html = VALUES(body_html),
    updated_at = NOW();
CREATE TABLE IF NOT EXISTS ngo_block_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    block_reason TEXT NOT NULL,
    blocked_by INT NOT NULL,
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_template_version VARCHAR(50) DEFAULT 'current',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_by) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_ngo_id (ngo_id),
    INDEX idx_blocked_by (blocked_by),
    INDEX idx_blocked_at (blocked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ngo_unblock_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ngo_id INT NOT NULL,
    unblock_reason TEXT NOT NULL,
    unblocked_by INT NOT NULL,
    unblocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    email_template_version VARCHAR(50) DEFAULT 'current',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (unblocked_by) REFERENCES admins(id) ON DELETE CASCADE,
    INDEX idx_ngo_id (ngo_id),
    INDEX idx_unblocked_by (unblocked_by),
    INDEX idx_unblocked_at (unblocked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ All migrations completed successfully!' AS result;
SELECT 'Tables created/updated: email_templates, ngo_block_history, ngo_unblock_history' AS tables_status;
SELECT 'Templates: NGO_BLOCK ({{NGO_NAME}}, {{BLOCK_DATE}}, {{SUPPORT_EMAIL}}, {{BLOCK_REASON}}), NGO_UNBLOCK ({{NGO_NAME}}, {{UNBLOCK_DATE}}, {{SUPPORT_EMAIL}}, {{UNBLOCK_REASON}})' AS templates_info;
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- ID of the user (NGO, Admin, or Donor)
    user_type ENUM('NGO', 'ADMIN', 'DONOR') NOT NULL, -- Type of user receiving notification
    title VARCHAR(255) NOT NULL, -- Notification title
    message TEXT NOT NULL, -- Notification message
    type ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'DONATION', 'REGISTRATION', 'SYSTEM') DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE, -- Whether notification has been read
    related_entity_type VARCHAR(50), -- e.g., 'donation', 'contribution', 'user'
    related_entity_id INT, -- ID of related entity (donation_id, contribution_id, etc.)
    metadata JSON, -- Additional data (donor name, amount, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL, -- When notification was read
    INDEX idx_user (user_id, user_type),
    INDEX idx_is_read (is_read),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at),
    INDEX idx_user_type_read (user_id, user_type, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS blogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(100) NOT NULL,
    author_ngo_id INT NOT NULL,
    excerpt TEXT, -- Short excerpt for listing page
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_ngo_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_author_ngo_id (author_ngo_id),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at),
    FULLTEXT INDEX idx_search (title, content, excerpt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sliders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    tagline VARCHAR(500),
    description TEXT,
    image_url VARCHAR(500) NOT NULL,
    button1_text VARCHAR(100),
    button1_link VARCHAR(500),
    button2_text VARCHAR(100),
    button2_link VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_is_active (is_active),
    INDEX idx_display_order (display_order),
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

