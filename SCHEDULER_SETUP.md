# Automated Email Scheduler Setup Guide

This document explains how to set up and use the automated email scheduler for sending free meal logs every Monday at 12:00 noon.

## Overview

The system includes an automated scheduler that sends free meal logs reports via email every Monday at 12:00 PM noon. This is powered by:

- **node-cron**: For scheduling tasks
- **nodemailer**: For sending emails
- **Next.js API Routes**: For managing scheduler triggers

## Features

✅ Automatically sends weekly free meal reports every Monday at 12:00 noon
✅ Resets employee meal counts to 7 after sending the report
✅ Manual trigger capability for admins to test or send on-demand
✅ Comprehensive error handling and logging
✅ Email with CSV attachment
✅ Fallback error handling

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env.local` file:

```env
# SMTP Configuration (required for email sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
FROM_NAME=PANTRY
FROM_EMAIL=your-email@gmail.com

# Scheduler Email Configuration (optional - uses defaults if not set)
FREEMEAL_EMAIL_RECIPIENT=recipient@example.com
FREEMEAL_EMAIL_CC=optional-cc@example.com
```

### 2. Gmail Setup (Recommended)

If using Gmail as your SMTP provider:

1. **Enable 2-Factor Authentication** on your Google Account
2. **Create an App Password**:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification
   - Generate an "App password" for Mail
   - Use this app password for `SMTP_PASS`

### 3. Verify Installation

The system will automatically initialize the scheduler when your app starts. To verify:

1. Start your development server: `npm run dev`
2. **Check your terminal logs** for: `[Scheduler] Initialized - Free meal logs will be sent every Monday at 12:00 noon`
3. Optional: Visit `http://localhost:3000/api/health` to check scheduler status
4. You should see: `{"status":"ok","scheduler":"initialized"}`

**That's it!** The scheduler is now running automatically.

## Usage

### Automatic Sending

The scheduler runs automatically every Monday at 12:00 noon:

- Current time is checked by the server (based on server timezone)
- Sends to the configured `FREEMEAL_EMAIL_RECIPIENT`
- Includes previous week's (Monday-Sunday) free meal logs
- Resets employee meal counts to 7
- Email includes a CSV attachment with all logs

### Manual Trigger (Admin Only)

Admins can manually trigger the email send via:

**API Endpoint**: `POST /api/admin/schedule/send-freemeal-email`

**Requirements**:

- Must be logged in as: superadmin, admin, or hr
- Authentication via NextAuth session

**Example Usage** (JavaScript):

```javascript
const response = await fetch('/api/admin/schedule/send-freemeal-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

const data = await response.json();
console.log(data); // { success: true, message: '...' }
```

**Using the Hook** (React Component):

```javascript
import { useFreemealLogsManager } from '@/hooks/useFreemealLogsManager';

function MyComponent() {
  const { handleManualScheduledEmailSend, emailSending } = useFreemealLogsManager();

  return (
    <button onClick={handleManualScheduledEmailSend} disabled={emailSending}>
      {emailSending ? 'Sending...' : 'Send Scheduled Email Now'}
    </button>
  );
}
```

## File Structure

The scheduler implementation consists of:

- **`lib/scheduler.js`**: Core scheduler logic and email sending
- **`lib/scheduler-init.js`**: Automatic initialization module (imported at app startup)
- **`app/api/health/route.js`**: Health check endpoint
- **`app/api/init/scheduler/route.js`**: Scheduler status endpoint
- **`app/api/admin/schedule/send-freemeal-email/route.js`**: Manual trigger endpoint
- **`hooks/useFreemealLogsManager.js`**: React hook with manual trigger function

## Logging

The scheduler logs important information:

```
[Scheduler] Initialized - Free meal logs will be sent every Monday at 12:00 noon
[Scheduler] Running Monday 12:00 noon task - Sending free meal logs email...
[Email Scheduler] Email sent successfully to jcarlos@eastwestbpo.com
[Email Scheduler] Meal counts reset to 7 for all employees
```

To see these logs:

- **Development**: Check your terminal/console
- **Production**: Check your application logs

## Troubleshooting

### Scheduler not starting?

```
Solution: Check your terminal logs when starting the app with 'npm run dev'
Look for: [Scheduler] Initialized - Free meal logs will be sent every Monday at 12:00 noon

If you don't see this message:
1. Make sure npm dependencies are installed: npm install
2. Check for any errors in the console output
3. Verify .env.local file configuration
```

### Emails not sending?

- Verify SMTP credentials in `.env.local`
- Check Gmail app password is correct (not regular password)
- Ensure 2FA is enabled on Gmail account
- Check firewall/proxy settings allowing SMTP connections

### Timezone issues?

- The cron schedule uses server time (typically UTC)
- Adjust schedule time if needed: `/lib/scheduler.js` line 19
- Format: `0 12 * * 1` = minute hour dayOfMonth month dayOfWeek
- Change `0 12` to desired time (e.g., `0 14` for 2 PM)

### Meal counts not resetting?

- Check database connection is working
- Verify database permissions for UPDATE
- Check logs for error messages

## Advanced Configuration

### Changing Schedule Time

Edit `/lib/scheduler.js` line 19:

```javascript
// Current: Every Monday at 12:00 (0 12 * * 1)
cron.schedule('0 12 * * 1', async () => {

// Examples:
// Every day at 9 AM: '0 9 * * *'
// Every Friday at 5 PM: '0 17 * * 5'
// Every Monday and Friday at 10 AM: '0 10 * * 1,5'
```

### Changing Email Recipients

Edit `sendFreemealLogsEmail()` in `/lib/scheduler.js`:

```javascript
const recipient = process.env.FREEMEAL_EMAIL_RECIPIENT || 'default@example.com';

// Or
const recipients = [
  'email1@example.com',
  'email2@example.com'
];
```

### Custom Email Template

Edit the `html` template in `/lib/scheduler.js` to customize the email content.

## Testing

### Test Scheduler Initialization

```bash
curl http://localhost:3000/api/health
```

### Test Manual Email Send

```bash
curl -X POST http://localhost:3000/api/admin/schedule/send-freemeal-email -H "Content-Type: application/json"
```

### View Database After Email Send

```sql
SELECT * FROM employees LIMIT 5;  -- Should show meal_count = 7
```

## Security Considerations

- Sensitive credentials (SMTP password) are only in `.env.local` (never committed)
- Email sending requires proper authentication (superadmin, admin, hr roles)
- API endpoints have role-based access control
- Session-based security for web requests

## Support

For issues or questions:

1. Check the logs in your terminal
2. Verify `.env.local` configuration
3. Test SMTP connection separately
4. Check firewall and network settings
