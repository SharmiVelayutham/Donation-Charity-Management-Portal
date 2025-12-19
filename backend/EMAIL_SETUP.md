# Email Configuration Guide

This guide explains how to configure SMTP email for OTP delivery in the Donation & Charity Management Portal.

## Quick Setup

1. Copy environment variables to your `.env` file
2. Configure SMTP settings based on your email provider
3. Restart the backend server

## Environment Variables Required

Add these to your `.env` file:

```env
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Donation Portal <your-email@gmail.com>
```

## Gmail Setup (Recommended for Development)

### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification"

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Enter "Donation Portal" as the name
4. Click "Generate"
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### Step 3: Configure .env
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop  # Use the 16-char app password (remove spaces)
SMTP_FROM=Donation Portal <your-email@gmail.com>
```

**Important:** Use the App Password, NOT your regular Gmail password!

## Outlook/Office 365 Setup

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-outlook-password
SMTP_FROM=Donation Portal <your-email@outlook.com>
```

## Custom SMTP Server

```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=Donation Portal <noreply@yourdomain.com>
```

## Testing Email Configuration

1. Start the backend server
2. Check console for: `✅ Email service configured and ready`
3. Register a new NGO user
4. Check the email inbox (and spam folder) for OTP

## Troubleshooting

### Email not received?
1. Check spam/junk folder
2. Verify SMTP credentials are correct
3. Check server logs for email errors
4. For Gmail: Ensure App Password is used (not regular password)
5. Verify firewall/network allows SMTP connections

### SMTP Connection Errors?
- Check `SMTP_HOST` and `SMTP_PORT` are correct
- Verify `SMTP_SECURE` matches port (true for 465, false for 587)
- Check if your network blocks SMTP ports
- For Gmail: Make sure "Less secure app access" is enabled OR use App Password

### OTP in Console but not Email?
- SMTP configuration is missing or incorrect
- Check `.env` file has all SMTP variables set
- Restart server after updating `.env`

## Security Best Practices

1. **Never commit `.env` file** to version control
2. Use **App Passwords** for Gmail (not regular passwords)
3. Use **environment-specific** SMTP accounts for production
4. Rotate SMTP passwords regularly
5. Monitor email sending logs for suspicious activity

## Production Recommendations

For production, consider:
- **SendGrid** (free tier: 100 emails/day)
- **AWS SES** (very cost-effective)
- **Mailgun** (developer-friendly)
- **Postmark** (transactional emails)

These services provide better deliverability and analytics than SMTP.

