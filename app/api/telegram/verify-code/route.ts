import { NextRequest, NextResponse } from 'next/server';
import { saveUser, isPhoneWhitelisted } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import { pendingLinksStore } from '@/lib/telegram-links';

// Verify link code and complete linking
export async function POST(request: NextRequest) {
  try {
    const { code, phoneNumber } = await request.json();

    if (!code || !phoneNumber) {
      return NextResponse.json({ error: 'Code and phone number are required' }, { status: 400 });
    }

    const pending = pendingLinksStore.get(code);

    if (!pending) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    if (Date.now() > pending.expiresAt) {
      pendingLinksStore.delete(code);
      return NextResponse.json({ error: 'Code expired' }, { status: 400 });
    }

    // Check if phone is whitelisted
    const isWhitelisted = await isPhoneWhitelisted(phoneNumber);
    if (!isWhitelisted) {
      return NextResponse.json(
        { error: 'Số điện thoại không được phép truy cập. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }

    // Link the account
    await saveUser(phoneNumber, {
      phone_number: phoneNumber,
      telegram_chat_id: pending.chatId,
    });

    // Delete the used code
    pendingLinksStore.delete(code);

    // Send confirmation to Telegram
    if (pending.chatId) {
      await sendTelegramMessage({
        chatId: pending.chatId,
        text: `✅ Your account has been successfully linked!\n\nPhone: ${phoneNumber}\n\nYou can now login to receive OTP codes.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Account linked successfully',
    });
  } catch (error) {
    console.error('Verify link code error:', error);
    return NextResponse.json({ error: 'Failed to verify link code' }, { status: 500 });
  }
}
