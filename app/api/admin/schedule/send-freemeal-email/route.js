import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendFreemealLogsEmailManually } from '@/lib/scheduler';

/**
 * POST /api/admin/schedule/send-freemeal-email
 * Manually trigger sending free meal logs email
 * Only accessible to admin, superadmin, and hr roles
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Only allow certain roles
    const allowedRoles = ['superadmin', 'admin', 'hr'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden - insufficient permissions' }, { status: 403 });
    }

    console.log(`[API] Manual email trigger initiated by ${session.user.email}`);

    const result = await sendFreemealLogsEmailManually();

    return NextResponse.json({
      success: true,
      message: 'Free meal logs email sent successfully',
      details: result
    });
  } catch (error) {
    console.error('[API] Failed to send free meal logs email:', error);
    return NextResponse.json(
      { error: 'Failed to send free meal logs email', details: error.message },
      { status: 500 }
    );
  }
}
