import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendSuccess } from '../utils/response';
import { query, queryOne, update, insert } from '../config/mysql';
const SUPPORTED_TEMPLATE_TYPES = [
  'OTP_REGISTRATION',
  'OTP_PASSWORD_RESET',
  'OTP_EMAIL_CHANGE',
  'OTP_ADMIN_REGISTRATION',
  'NGO_DONATION_RECEIVED',
  'DONOR_DONATION_CONFIRMATION',
  'NGO_UNBLOCK',
  'NGO_BLOCK'
] as const;

type TemplateType = typeof SUPPORTED_TEMPLATE_TYPES[number];
function getDefaultTemplate(templateType: TemplateType): { subject: string; bodyHtml: string } {
  switch (templateType) {
    case 'NGO_UNBLOCK':
      return getDefaultNgoUnblockTemplate();
    case 'NGO_BLOCK':
      return getDefaultNgoBlockTemplate();
    case 'OTP_REGISTRATION':
      return getDefaultOTPRegistrationTemplate();
    case 'OTP_PASSWORD_RESET':
      return getDefaultOTPPasswordResetTemplate();
    case 'OTP_EMAIL_CHANGE':
      return getDefaultOTPEmailChangeTemplate();
    case 'OTP_ADMIN_REGISTRATION':
      return getDefaultOTPAdminRegistrationTemplate();
    case 'NGO_DONATION_RECEIVED':
      return getDefaultNgoDonationReceivedTemplate();
    case 'DONOR_DONATION_CONFIRMATION':
      return getDefaultDonorDonationConfirmationTemplate();
    default:
      throw new Error(`No default template for type: ${templateType}`);
  }
}
function getDefaultNgoUnblockTemplate() {
  return {
    subject: 'NGO Account Unblocked - Donation & Charity Portal',
    bodyHtml: `<!DOCTYPE html>
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
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}
export const getEmailTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { templateType } = req.params;

    if (!SUPPORTED_TEMPLATE_TYPES.includes(templateType as TemplateType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template type. Supported types: ${SUPPORTED_TEMPLATE_TYPES.join(', ')}`,
      });
    }
    const template = await queryOne<any>(
      'SELECT id, template_type, subject, body_html, is_default, updated_at FROM email_templates WHERE template_type = ?',
      [templateType]
    );
    if (!template) {
      const defaultTemplate = getDefaultTemplate(templateType as TemplateType);
      return sendSuccess(
        res,
        {
          templateType,
          subject: defaultTemplate.subject,
          bodyHtml: defaultTemplate.bodyHtml,
          isDefault: true,
        },
        'Default template returned'
      );
    }

    return sendSuccess(
      res,
      {
        templateType: template.template_type,
        subject: template.subject,
        bodyHtml: template.body_html,
        isDefault: template.is_default === 1,
        updatedAt: template.updated_at,
      },
      'Template fetched successfully'
    );
  } catch (error: any) {
    console.error('Error fetching email template:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch email template',
    });
  }
};
export const updateEmailTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { templateType } = req.params;
    const { subject, bodyHtml } = req.body;

    if (!SUPPORTED_TEMPLATE_TYPES.includes(templateType as TemplateType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template type. Supported types: ${SUPPORTED_TEMPLATE_TYPES.join(', ')}`,
      });
    }

    if (!subject || !bodyHtml) {
      return res.status(400).json({
        success: false,
        message: 'Subject and bodyHtml are required',
      });
    }
    const existing = await queryOne<any>(
      'SELECT id FROM email_templates WHERE template_type = ?',
      [templateType]
    );

    if (existing) {
      await update(
        'UPDATE email_templates SET subject = ?, body_html = ?, is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE template_type = ?',
        [subject.trim(), bodyHtml.trim(), templateType]
      );
    } else {
      await insert(
        'INSERT INTO email_templates (template_type, subject, body_html, is_default) VALUES (?, ?, ?, FALSE)',
        [templateType, subject.trim(), bodyHtml.trim()]
      );
    }

    const updatedTemplate = await queryOne<any>(
      'SELECT template_type, subject, body_html, is_default, updated_at FROM email_templates WHERE template_type = ?',
      [templateType]
    );

    return sendSuccess(
      res,
      {
        templateType: updatedTemplate.template_type,
        subject: updatedTemplate.subject,
        bodyHtml: updatedTemplate.body_html,
        isDefault: updatedTemplate.is_default === 1,
        updatedAt: updatedTemplate.updated_at,
      },
      'Template updated successfully'
    );
  } catch (error: any) {
    console.error('Error updating email template:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update email template',
    });
  }
};
export const restoreDefaultTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { templateType } = req.params;

    if (!SUPPORTED_TEMPLATE_TYPES.includes(templateType as TemplateType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid template type. Supported types: ${SUPPORTED_TEMPLATE_TYPES.join(', ')}`,
      });
    }

    const defaultTemplate = getDefaultTemplate(templateType as TemplateType);
    const existing = await queryOne<any>(
      'SELECT id FROM email_templates WHERE template_type = ?',
      [templateType]
    );

    if (existing) {
      await update(
        'UPDATE email_templates SET subject = ?, body_html = ?, is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE template_type = ?',
        [defaultTemplate.subject, defaultTemplate.bodyHtml, templateType]
      );
    } else {
      await insert(
        'INSERT INTO email_templates (template_type, subject, body_html, is_default) VALUES (?, ?, ?, TRUE)',
        [templateType, defaultTemplate.subject, defaultTemplate.bodyHtml]
      );
    }

    return sendSuccess(
      res,
      {
        templateType,
        subject: defaultTemplate.subject,
        bodyHtml: defaultTemplate.bodyHtml,
        isDefault: true,
      },
      'Default template restored successfully'
    );
  } catch (error: any) {
    console.error('Error restoring default template:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to restore default template',
    });
  }
};
function getDefaultNgoBlockTemplate() {
  return {
    subject: 'NGO Account Blocked - Donation & Charity Portal',
    bodyHtml: `<!DOCTYPE html>
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
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}
function getDefaultOTPRegistrationTemplate() {
  return {
    subject: 'Registration - OTP Verification Code',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Donation & Charity Portal</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Registration - OTP Verification</h2>
    
    <p style="font-size: 16px; color: #64748b;">Hello,</p>
    
    <p style="font-size: 16px; color: #0f172a;">You have requested to register your account. Please use the following OTP code to verify your email address:</p>
    
    <div style="background: white; border: 2px dashed #1976d2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <div style="font-size: 36px; font-weight: bold; color: #1976d2; letter-spacing: 8px; font-family: 'Courier New', monospace;">
        {{OTP_CODE}}
      </div>
    </div>
    
    <p style="font-size: 14px; color: #64748b; text-align: center;">
      This code will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      If you did not request this code, please ignore this email or contact support if you have concerns.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}
function getDefaultOTPPasswordResetTemplate() {
  return {
    subject: 'Password Reset - OTP Verification Code',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Donation & Charity Portal</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Password Reset - OTP Verification</h2>
    
    <p style="font-size: 16px; color: #64748b;">Hello,</p>
    
    <p style="font-size: 16px; color: #0f172a;">You have requested to reset your password. Please use the following OTP code to verify your email address:</p>
    
    <div style="background: white; border: 2px dashed #1976d2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <div style="font-size: 36px; font-weight: bold; color: #1976d2; letter-spacing: 8px; font-family: 'Courier New', monospace;">
        {{OTP_CODE}}
      </div>
    </div>
    
    <p style="font-size: 14px; color: #64748b; text-align: center;">
      This code will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      If you did not request a password reset, please ignore this email or contact support immediately.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}
function getDefaultOTPEmailChangeTemplate() {
  return {
    subject: 'Email Change - OTP Verification Code',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Donation & Charity Portal</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Email Change - OTP Verification</h2>
    
    <p style="font-size: 16px; color: #64748b;">Hello,</p>
    
    <p style="font-size: 16px; color: #0f172a;">You have requested to change your email address. Please use the following OTP code to verify your new email address:</p>
    
    <div style="background: white; border: 2px dashed #1976d2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <div style="font-size: 36px; font-weight: bold; color: #1976d2; letter-spacing: 8px; font-family: 'Courier New', monospace;">
        {{OTP_CODE}}
      </div>
    </div>
    
    <p style="font-size: 14px; color: #64748b; text-align: center;">
      This code will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      If you did not request an email change, please ignore this email or contact support immediately.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}
function getDefaultOTPAdminRegistrationTemplate() {
  return {
    subject: 'Admin Registration - OTP Verification Code',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OTP Verification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Donation & Charity Portal</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <h2 style="color: #0f172a; margin-top: 0;">Admin Registration - OTP Verification</h2>
    
    <p style="font-size: 16px; color: #64748b;">Hello,</p>
    
    <p style="font-size: 16px; color: #0f172a;">You have requested to register as an Admin. Please use the following OTP code to verify your email address:</p>
    
    <div style="background: white; border: 2px dashed #1976d2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
      <div style="font-size: 36px; font-weight: bold; color: #1976d2; letter-spacing: 8px; font-family: 'Courier New', monospace;">
        {{OTP_CODE}}
      </div>
    </div>
    
    <p style="font-size: 14px; color: #64748b; text-align: center;">
      This code will expire in <strong>10 minutes</strong>. Please do not share this code with anyone.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      If you did not request this code, please ignore this email or contact support if you have concerns.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}
function getDefaultNgoDonationReceivedTemplate() {
  return {
    subject: 'New Donation Received from {{DONOR_NAME}}',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Donation Received</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">💰 New Donation Received</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #0f172a;">Dear {{NGO_NAME}},</p>
    
    <p style="font-size: 16px; color: #0f172a;">
      Great news! You have received a new donation:
    </p>
    
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #0f172a; margin-top: 0;">Donation Details:</h3>
      <p style="margin: 10px 0;"><strong>Donor:</strong> {{DONOR_NAME}} ({{DONOR_EMAIL}})</p>
      <p style="margin: 10px 0;"><strong>Type:</strong> {{DONATION_TYPE}}</p>
      <p style="margin: 10px 0;"><strong>Amount/Quantity:</strong> {{AMOUNT_OR_QUANTITY}}</p>
    </div>
    
    <p style="font-size: 16px; color: #0f172a;">
      Please check your dashboard for more details and to manage this donation.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      Thank you for using our platform!
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}
function getDefaultDonorDonationConfirmationTemplate() {
  return {
    subject: 'Thank You for Your Donation to {{NGO_NAME}}',
    bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Donation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1976d2 0%, #2196f3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🙏 Thank You for Your Generous Donation!</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
    <p style="font-size: 16px; color: #0f172a;">Dear {{DONOR_NAME}},</p>
    
    <p style="font-size: 16px; color: #0f172a;">
      We are grateful for your contribution! Your donation has been received and is currently under review by the NGO team.
    </p>
    
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #0f172a; margin-top: 0;">Contribution Details:</h3>
      <p style="margin: 10px 0;"><strong>NGO:</strong> {{NGO_NAME}}</p>
      <p style="margin: 10px 0;"><strong>Type:</strong> {{DONATION_TYPE}}</p>
      <p style="margin: 10px 0;"><strong>Amount/Quantity:</strong> {{AMOUNT_OR_QUANTITY}}</p>
      <p style="margin: 10px 0;"><strong>Status:</strong> <span style="color: #f59e0b; font-weight: bold;">UNDER REVIEW</span></p>
    </div>
    
    <p style="font-size: 16px; color: #0f172a;">
      Our team will review your contribution and you will receive an update via email once the review is complete.
    </p>
    
    <p style="font-size: 16px; color: #0f172a; margin-top: 30px;">
      Your donation will make a significant impact. Thank you for your generosity!
    </p>
    
    <p style="font-size: 16px; color: #0f172a;">
      You can view your donation history in your dashboard.
    </p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
      This is an automated email. Please do not reply to this message.<br>
      © ${new Date().getFullYear()} Donation & Charity Management Portal
    </p>
  </div>
</body>
</html>`,
  };
}

