-- =====================================================
-- NOTIFICATIONS TABLE
-- Stores notifications for NGOs, Admins, and Donors
-- =====================================================
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

