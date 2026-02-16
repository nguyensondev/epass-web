import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { removeUserTelegram } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Remove user's Telegram chat ID
    await removeUserTelegram(payload.phoneNumber);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unlink Telegram error:', error);
    return NextResponse.json({ error: 'Failed to unlink Telegram' }, { status: 500 });
  }
}
