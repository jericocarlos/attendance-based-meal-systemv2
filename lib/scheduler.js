import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { generateFreemealCsv } from './reports';
import { executeQuery } from './db';

let schedulerStarted = false;

/**
 * Initialize the scheduled email task for free meal logs
 * Runs every Monday at 12:00 noon
 */
export async function initializeScheduler() {
  // Prevent duplicate scheduler initialization
  if (schedulerStarted) {
    console.log('[Scheduler] Already initialized');
    return;
  }

  try {
    // Schedule task: Every Monday at 12:00 (0 12 * * 1)
    cron.schedule('* 12 * * 1', async () => {
      console.log('[Scheduler] Running Monday 12:00 noon task - Sending free meal logs email...');
      await sendFreemealLogsEmail();
    });

    schedulerStarted = true;
    console.log('[Scheduler] Initialized - Free meal logs will be sent every Monday at 12:00 noon');
  } catch (error) {
    console.error('[Scheduler] Failed to initialize:', error);
  }
}

/**
 * Send free meal logs email for the previous week
 */
export async function sendFreemealLogsEmail() {
  try {
    console.log('[Email Scheduler] Starting email send process...');

    // Generate CSV for previous week
    const { csv, filename } = await generateFreemealCsv({ range: 'previous_week' });

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    const fromName = process.env.FROM_NAME || 'Free Meal System';
    const fromAddress = process.env.FROM_EMAIL 
      ? `${fromName} <${process.env.FROM_EMAIL}>` 
      : `${fromName} <no-reply@eastwestbpo.com>`;

    // Email recipient - can be configured in environment
    const recipient = process.env.FREEMEAL_EMAIL_RECIPIENT || 'jcarlos@eastwestbpo.com';

    // Send email
    await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      cc: process.env.FREEMEAL_EMAIL_CC || '',
      subject: `Weekly Free Meal Logs Report - ${new Date().toLocaleDateString()}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <p>Good Day Team,</p>

            <p>I hope this message finds you well.</p>

            <p>
              Attached is the <strong>Free Meal Logs CSV Report</strong> for the <strong>previous week 
              (Monday through Sunday)</strong>.
            </p>

            <p>
              This report is <strong>sent automatically every Monday at 12:00 noon</strong>.
            </p>

            <p>
              Please review the attached CSV file for detailed information on free meal claims made during this period.
            </p>

            <p>Thank you.</p>

            <p><i>Note: This is an auto-generated email. Please do not reply.</i></p>
          </body>
        </html>
      `,
      attachments: [
        { filename, content: csv, contentType: 'text/csv' }
      ]
    });

    console.log(`[Email Scheduler] Email sent successfully to ${recipient}`);

    // Reset meal counts to 7 for all employees after sending the report
    try {
      await executeQuery({
        query: 'UPDATE employees SET meal_count = 7',
        values: []
      });
      console.log('[Email Scheduler] Meal counts reset to 7 for all employees');
    } catch (resetError) {
      console.error('[Email Scheduler] Failed to reset meal counts:', resetError);
    }

    // Change log_type to FORFEITED for all unclaimed meals after sending the report
    // try {
    //   await executeQuery({
    //     query: 'UPDATE unclaimed_freemeal_logs SET log_type = "FORFEITED" WHERE log_type = "UNCLAIMED"',
    //     values: []
    //   });
    //   console.log('[Email Scheduler] Unclaimed meal log_type updated to FORFEITED');
    // } catch (resetError) {
    //   console.error('[Email Scheduler] Failed to update unclaimed meal logs:', resetError);
    // }

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('[Email Scheduler] Failed to send email:', error);
    throw error;
  }
}

/**
 * Manual trigger for testing - sends free meal logs immediately
 */
export async function sendFreemealLogsEmailManually() {
  try {
    console.log('[Email Scheduler] Manual trigger - Sending free meal logs email...');
    return await sendFreemealLogsEmail();
  } catch (error) {
    console.error('[Email Scheduler] Manual trigger failed:', error);
    throw error;
  }
}
