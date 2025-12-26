"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreDefaultTemplate = exports.updateEmailTemplate = exports.getEmailTemplate = void 0;
const response_1 = require("../utils/response");
const mysql_1 = require("../config/mysql");
/**
 * Get default NGO unblock email template
 */
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
/**
 * Get email template by type
 * GET /api/admin/email-templates/:templateType
 */
const getEmailTemplate = async (req, res) => {
    try {
        const { templateType } = req.params;
        if (templateType !== 'NGO_UNBLOCK') {
            return res.status(400).json({
                success: false,
                message: 'Invalid template type. Supported types: NGO_UNBLOCK',
            });
        }
        // Try to get from database
        const template = await (0, mysql_1.queryOne)('SELECT id, template_type, subject, body_html, is_default, updated_at FROM email_templates WHERE template_type = ?', [templateType]);
        // If not found in DB, return default
        if (!template) {
            const defaultTemplate = getDefaultNgoUnblockTemplate();
            return (0, response_1.sendSuccess)(res, {
                templateType,
                subject: defaultTemplate.subject,
                bodyHtml: defaultTemplate.bodyHtml,
                isDefault: true,
            }, 'Default template returned');
        }
        return (0, response_1.sendSuccess)(res, {
            templateType: template.template_type,
            subject: template.subject,
            bodyHtml: template.body_html,
            isDefault: template.is_default === 1,
            updatedAt: template.updated_at,
        }, 'Template fetched successfully');
    }
    catch (error) {
        console.error('Error fetching email template:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch email template',
        });
    }
};
exports.getEmailTemplate = getEmailTemplate;
/**
 * Update email template
 * PUT /api/admin/email-templates/:templateType
 */
const updateEmailTemplate = async (req, res) => {
    try {
        const { templateType } = req.params;
        const { subject, bodyHtml } = req.body;
        if (templateType !== 'NGO_UNBLOCK') {
            return res.status(400).json({
                success: false,
                message: 'Invalid template type. Supported types: NGO_UNBLOCK',
            });
        }
        if (!subject || !bodyHtml) {
            return res.status(400).json({
                success: false,
                message: 'Subject and bodyHtml are required',
            });
        }
        // Check if template exists
        const existing = await (0, mysql_1.queryOne)('SELECT id FROM email_templates WHERE template_type = ?', [templateType]);
        if (existing) {
            // Update existing
            await (0, mysql_1.update)('UPDATE email_templates SET subject = ?, body_html = ?, is_default = FALSE, updated_at = CURRENT_TIMESTAMP WHERE template_type = ?', [subject.trim(), bodyHtml.trim(), templateType]);
        }
        else {
            // Insert new
            await (0, mysql_1.update)('INSERT INTO email_templates (template_type, subject, body_html, is_default) VALUES (?, ?, ?, FALSE)', [templateType, subject.trim(), bodyHtml.trim()]);
        }
        const updatedTemplate = await (0, mysql_1.queryOne)('SELECT template_type, subject, body_html, is_default, updated_at FROM email_templates WHERE template_type = ?', [templateType]);
        return (0, response_1.sendSuccess)(res, {
            templateType: updatedTemplate.template_type,
            subject: updatedTemplate.subject,
            bodyHtml: updatedTemplate.body_html,
            isDefault: updatedTemplate.is_default === 1,
            updatedAt: updatedTemplate.updated_at,
        }, 'Template updated successfully');
    }
    catch (error) {
        console.error('Error updating email template:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update email template',
        });
    }
};
exports.updateEmailTemplate = updateEmailTemplate;
/**
 * Restore default template
 * POST /api/admin/email-templates/:templateType/restore-default
 */
const restoreDefaultTemplate = async (req, res) => {
    try {
        const { templateType } = req.params;
        if (templateType !== 'NGO_UNBLOCK') {
            return res.status(400).json({
                success: false,
                message: 'Invalid template type. Supported types: NGO_UNBLOCK',
            });
        }
        const defaultTemplate = getDefaultNgoUnblockTemplate();
        // Check if template exists
        const existing = await (0, mysql_1.queryOne)('SELECT id FROM email_templates WHERE template_type = ?', [templateType]);
        if (existing) {
            // Update to default
            await (0, mysql_1.update)('UPDATE email_templates SET subject = ?, body_html = ?, is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE template_type = ?', [defaultTemplate.subject, defaultTemplate.bodyHtml, templateType]);
        }
        else {
            // Insert default
            await (0, mysql_1.update)('INSERT INTO email_templates (template_type, subject, body_html, is_default) VALUES (?, ?, ?, TRUE)', [templateType, defaultTemplate.subject, defaultTemplate.bodyHtml]);
        }
        return (0, response_1.sendSuccess)(res, {
            templateType,
            subject: defaultTemplate.subject,
            bodyHtml: defaultTemplate.bodyHtml,
            isDefault: true,
        }, 'Default template restored successfully');
    }
    catch (error) {
        console.error('Error restoring default template:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to restore default template',
        });
    }
};
exports.restoreDefaultTemplate = restoreDefaultTemplate;
