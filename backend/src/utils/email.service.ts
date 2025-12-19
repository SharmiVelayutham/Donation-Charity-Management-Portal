import nodemailer from 'nodemailer';
import { env } from '../config/env';

/**
 * Email Service for sending OTP and other emails
 * Uses Nodemailer with SMTP configuration
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create and configure nodemailer transporter
 */
function createTransporter() {
  // Check if SMTP is configured
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env file');
  }

  const transporterConfig: any = {
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure, // true for 465, false for other ports
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  };

  // For Gmail and most SMTP servers, TLS is required when secure=false
  if (!env.smtpSecure) {
    transporterConfig.tls = {
      // Do not fail on invalid certs (useful for development)
      rejectUnauthorized: false,
      ciphers: 'SSLv3',
    };
  }

  return nodemailer.createTransport(transporterConfig);
}

/**
 * Send email using nodemailer
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  let transporter;
  
  try {
    transporter = createTransporter();
  } catch (configError: any) {
    console.error('❌ SMTP Configuration Error:', configError.message);
    throw new Error('Email service is not configured. Please set SMTP settings in .env file. See EMAIL_SETUP.md for instructions.');
  }

  try {
    const mailOptions = {
      from: env.smtpFrom || env.smtpUser,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Plain text fallback
    };

    // Verify SMTP connection before sending
    await transporter.verify();
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('To:', options.to);
    // Do NOT log OTP in production logs
    
  } catch (error: any) {
    console.error('❌ Failed to send email to:', options.to);
    console.error('Error:', error.message);
    
    // Provide specific error messages for common issues
    if (error.code === 'EAUTH') {
      throw new Error('SMTP authentication failed. Please check SMTP_USER and SMTP_PASS in .env file. For Gmail, use App Password (not regular password).');
    } else if (error.code === 'ECONNECTION') {
      throw new Error(`Cannot connect to SMTP server ${env.smtpHost}:${env.smtpPort}. Please check SMTP_HOST and SMTP_PORT.`);
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('SMTP connection timed out. Please check your network connection and SMTP settings.');
    } else {
      console.error('SMTP Error Details:', {
        code: error.code,
        command: error.command,
        response: error.response,
      });
      throw new Error(`Failed to send email: ${error.message}. Please check SMTP configuration. See EMAIL_SETUP.md for help.`);
    }
  }
  // Note: transporter.close() is not needed - nodemailer manages connections automatically
}

/**
 * Send OTP email with professional template
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  purpose: 'REGISTRATION' | 'PASSWORD_RESET' | 'EMAIL_CHANGE' = 'REGISTRATION'
): Promise<void> {
  const purposeText = {
    REGISTRATION: 'NGO Registration',
    PASSWORD_RESET: 'Password Reset',
    EMAIL_CHANGE: 'Email Change',
  }[purpose];

  const subject = `${purposeText} - OTP Verification Code`;

  const html = `
    <!DOCTYPE html>
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
        <h2 style="color: #0f172a; margin-top: 0;">${purposeText} - OTP Verification</h2>
        
        <p style="font-size: 16px; color: #64748b;">Hello,</p>
        
        <p style="font-size: 16px; color: #0f172a;">You have requested to ${purpose.toLowerCase().replace('_', ' ')} your account. Please use the following OTP code to verify your email address:</p>
        
        <div style="background: white; border: 2px dashed #1976d2; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <div style="font-size: 36px; font-weight: bold; color: #1976d2; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${otp}
          </div>
        </div>
        
        <p style="font-size: 14px; color: #ef4444; font-weight: 600; background: #fee2e2; padding: 12px; border-radius: 6px; border-left: 4px solid #ef4444;">
          ⚠️ This OTP will expire in <strong>10 minutes</strong>. Please use it promptly.
        </p>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
          If you didn't request this OTP, please ignore this email or contact support if you have concerns.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
          This is an automated email. Please do not reply to this message.<br>
          © ${new Date().getFullYear()} Donation & Charity Management Portal
        </p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject,
    html,
  });
}

/**
 * Verify email configuration
 */
export function verifyEmailConfig(): boolean {
  try {
    if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
      console.warn('⚠️  SMTP configuration is incomplete. Email sending will fail.');
      console.warn('Please set SMTP_HOST, SMTP_USER, and SMTP_PASS in .env file');
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

