import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import { getOTP, deleteOTP } from '@/lib/otp-store';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, otp } = await request.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json({ error: 'Phone number and OTP are required' }, { status: 400 });
    }

    // Get stored OTP
    const storedOTP = await getOTP(phoneNumber);

    if (!storedOTP) {
      return NextResponse.json({ error: 'OTP not found or expired' }, { status: 400 });
    }

    if (Date.now() > storedOTP.expiresAt) {
      await deleteOTP(phoneNumber);
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    if (storedOTP.code !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // OTP is valid, generate token
    const token = await signToken({ phoneNumber });

    // Delete OTP after successful verification
    await deleteOTP(phoneNumber);

    return NextResponse.json({
      success: true,
      token,
      user: { phoneNumber },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
