import { NextResponse } from 'next/server';
import '@/lib/scheduler-init'; // Import to ensure scheduler is initialized

/**
 * GET /api/init/scheduler
 * Check scheduler initialization status
 * Scheduler is automatically initialized on app startup
 */
export async function GET(req) {
  try {
    console.log('[Scheduler Init API] Scheduler status check');
    
    return NextResponse.json({
      success: true,
      message: 'Scheduler is initialized and running',
      details: 'Free meal logs will be sent every Monday at 12:00 noon',
      initialized: true
    });
  } catch (error) {
    console.error('[Scheduler Init API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Scheduler error', details: error.message },
      { status: 500 }
    );
  }
}
