import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { getBotInfo } from '@/lib/telegram';

export async function GET(request: NextRequest) {
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

    // Get bot info
    const botInfo = await getBotInfo();

    if (!botInfo) {
      return NextResponse.json({ error: 'Failed to get bot info' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: botInfo,
    });
  } catch (error) {
    console.error('Get bot info error:', error);
    return NextResponse.json({ error: 'Failed to get bot info' }, { status: 500 });
  }
}
