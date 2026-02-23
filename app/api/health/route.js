import { NextResponse } from 'next/server';
import '@/lib/scheduler-init'; // Import to ensure scheduler is initialized

/**
 * GET /api/health
 * Health check endpoint
 * Scheduler is automatically initialized on app startup
 */
export async function GET(req) {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      scheduler: 'initialized',
      message: 'Scheduler initialized automatically on app startup'
    });
  } catch (error) {
    console.error('[Health Check] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message
      },
      { status: 500 }
    );
  }
}
