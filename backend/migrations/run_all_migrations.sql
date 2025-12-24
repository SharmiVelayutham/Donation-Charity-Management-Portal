-- =====================================================
-- Complete Migration Script for Email Templates Feature
-- Run this in phpMyAdmin or MySQL command line
-- All migrations in one file
-- =====================================================

USE donation_charity;

-- =====================================================
-- 1. Email Templates Table
-- =====================================================
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

-- Insert or Update default NGO_UNBLOCK template (with UNBLOCK_REASON placeholder)
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

-- Insert or Update default NGO_BLOCK template (with BLOCK_REASON placeholder)
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

-- =====================================================
-- 2. NGO Block History Table
-- =====================================================
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

-- =====================================================
-- 3. NGO Unblock History Table
-- =====================================================
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
