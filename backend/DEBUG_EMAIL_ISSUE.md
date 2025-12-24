# Debugging NGO Unblock Email Issue

## Changes Made

1. **Enhanced Logging**: Added detailed console logs at each step of the email sending process
2. **Fixed Placeholder Replacement**: Improved regex escaping for template placeholders
3. **Better Error Handling**: More detailed error logging to identify issues

## How to Debug

When you unblock an NGO, check your backend terminal logs. You should see logs like:

```
[Unblock NGO] Fetching email template for NGO: [NGO Name] ([email])
[Email Template] Fetching template from database: NGO_UNBLOCK
[Email Template] Template found in database for NGO_UNBLOCK
[Unblock NGO] Template fetched. Subject: NGO Account Unblocked...
[Unblock NGO] Sending email to: [email]
[Template] Replaced {{NGO_NAME}} with: [NGO Name]...
[Template] Replaced {{UNBLOCK_DATE}} with: [Date]...
[Template] Replaced {{SUPPORT_EMAIL}} with: [Email]...
✅ Email sent successfully
✅ Unblock email sent successfully to [email]
```

## Common Issues to Check

### 1. Database Table Missing
**Symptom**: Logs show "No template found in database for NGO_UNBLOCK, using default"
**Solution**: Run the SQL migration file `backend/migrations/run_all_migrations.sql` in phpMyAdmin

### 2. SMTP Configuration Missing
**Symptom**: Error message "SMTP configuration is missing" or "Email service is not configured"
**Solution**: Check your `.env` file has:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_SECURE` (true/false)
- `SMTP_FROM` (optional)

### 3. SMTP Authentication Failed
**Symptom**: Error "SMTP authentication failed" or "EAUTH"
**Solution**: 
- For Gmail: Use App Password (not regular password)
- Check username and password are correct
- Ensure 2FA is enabled and app password is generated

### 4. Connection Error
**Symptom**: Error "Cannot connect to SMTP server" or "ECONNECTION"
**Solution**:
- Check SMTP_HOST and SMTP_PORT are correct
- Verify firewall/network allows SMTP connections
- For Gmail: Use `smtp.gmail.com` and port `587` (secure: false) or `465` (secure: true)

### 5. Email Template Error
**Symptom**: Template replacement fails
**Solution**: The code now uses default template if database query fails, so this should not be an issue

## Testing

1. **Check Backend Logs**: Unblock an NGO and watch the console output
2. **Check Email Inbox**: Look in spam/junk folder if email doesn't arrive
3. **Verify Email Address**: Ensure the NGO's email address is valid
4. **Test SMTP Connection**: The code verifies SMTP connection before sending

## Next Steps

1. Run the unblock action
2. Check backend terminal for the detailed logs
3. Share the error logs if email still doesn't send
4. Verify SMTP settings in `.env` file are correct

