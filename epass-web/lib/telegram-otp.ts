import { sendTelegramMessage } from './telegram';
import { getUser } from './db';

// Send OTP via Telegram
export async function sendTelegramOTP(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user by phone number
    const user = await getUser(phoneNumber);

    if (!user) {
      return {
        success: false,
        error: 'Phone number not registered. Please link your Telegram account first.',
      };
    }

    if (!user.telegram_chat_id) {
      return {
        success: false,
        error: 'Telegram account not linked. Please start the bot and link your account first.',
      };
    }

    // Send OTP via Telegram
    const message = `
🔐 <b>ePass Toll Manager - Verification Code</b>

Your verification code is: <code>${otp}</code>

⏱ This code will expire in 5 minutes.

If you didn't request this code, please ignore this message.
    `.trim();

    const sent = await sendTelegramMessage({
      chatId: user.telegram_chat_id,
      text: message,
      parseMode: 'HTML',
    });

    if (!sent) {
      return {
        success: false,
        error: 'Failed to send OTP via Telegram. Please try again.',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Telegram OTP error:', error);
    return {
      success: false,
      error: 'Failed to send OTP. Please try again.',
    };
  }
}

// Check if user can receive Telegram OTP
export async function canReceiveTelegramOTP(phoneNumber: string): Promise<boolean> {
  const user = await getUser(phoneNumber);
  return user?.telegram_chat_id !== undefined && user?.telegram_chat_id !== null;
}
