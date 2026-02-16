import { NextRequest, NextResponse } from 'next/server';
import { isPhoneWhitelisted } from '@/lib/db';
import { generateOTP, setOTP } from '@/lib/otp-store';
import { sendTelegramOTP, canReceiveTelegramOTP } from '@/lib/telegram-otp';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Check if phone is whitelisted
    const isWhitelisted = await isPhoneWhitelisted(phoneNumber);
    if (!isWhitelisted) {
      return NextResponse.json(
        { error: 'Số điện thoại không được phép truy cập. Vui lòng liên hệ quản trị viên.' },
        { status: 403 }
      );
    }

    // Check if user has linked Telegram account
    const canReceiveOTP = await canReceiveTelegramOTP(phoneNumber);
    if (!canReceiveOTP) {
      return NextResponse.json(
        {
          error: 'Telegram account not linked. Please start the bot and link your account first.',
          needsTelegramLink: true,
        },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP in file
    await setOTP(phoneNumber, otp, expiresAt);

    // Send OTP via Telegram
    const result = await sendTelegramOTP(phoneNumber, otp);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send OTP' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Đã gửi mã OTP qua Telegram',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
