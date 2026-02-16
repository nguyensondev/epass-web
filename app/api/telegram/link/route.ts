import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { getUser, updateUserTelegram } from '@/lib/db';

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

    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Update user's Telegram chat ID
    await updateUserTelegram(payload.phoneNumber, chatId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Link Telegram error:', error);
    return NextResponse.json({ error: 'Failed to link Telegram' }, { status: 500 });
  }
}
