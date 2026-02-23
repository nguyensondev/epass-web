import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { saveUser, isPhoneWhitelisted } from '@/lib/db';
import { pendingLinksStore, generateLinkCode } from '@/lib/telegram-links';

// Handle /start command
async function handleStart(chatId: string, firstName?: string) {
  const welcomeMessage = `
👋 <b>Welcome to ePass Toll Manager Bot!</b>

${firstName ? `Hello ${firstName}! ` : ''}I'll help you link your Telegram account to receive OTP verification codes.

<b>How to link your account:</b>
1️⃣ Send me your phone number (with country code)
   Example: +84912345678

2️⃣ I'll send you a verification code

3️⃣ Enter the code in the ePass web app

<b>Commands:</b>
/start - Show this message
/link - Link your phone number
/status - Check your link status
/help - Show help
  `.trim();

  await sendTelegramMessage({
    chatId,
    text: welcomeMessage,
    parseMode: 'HTML',
  });
}

// Handle /link command
async function handleLink(chatId: string) {
  // Generate a unique link code
  const code = generateLinkCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store the pending link
  pendingLinksStore.set(code, {
    chatId,
    expiresAt,
  });

  const message = `
🔗 <b>Link Your Account</b>

Your verification code is: <code>${code}</code>

<b>Steps:</b>
1. Go to the ePass web app
2. Click "Link Telegram" or enter your phone number
3. Enter this code when prompted

⏱ This code expires in 10 minutes.

💡 <b>Tip:</b> After linking, you'll receive OTP codes here for login!
  `.trim();

  await sendTelegramMessage({
    chatId,
    text: message,
    parseMode: 'HTML',
  });
}

// Handle /status command
async function handleStatus(chatId: string) {
  const message = `
ℹ️ <b>Account Status</b>

Your Telegram account is ready to receive OTP codes.

To check your link status, please try logging in at the ePass web app.
  `.trim();

  await sendTelegramMessage({
    chatId,
    text: message,
    parseMode: 'HTML',
  });
}

// Handle /help command
async function handleHelp(chatId: string) {
  const helpMessage = `
❓ <b>Help & Support</b>

<b>How to receive OTP via Telegram:</b>
1. Make sure your phone number is whitelisted
2. Link your Telegram account using /link
3. Login at the ePass web app
4. Enter your phone number
5. Receive OTP instantly here! 🎉

<b>Commands:</b>
/start - Start the bot
/link - Get link code
/status - Check status
/help - Show this help

<b>Need help?</b> Contact support.
  `.trim();

  await sendTelegramMessage({
    chatId,
    text: helpMessage,
    parseMode: 'HTML',
  });
}

// Handle phone number input
async function handlePhoneNumber(chatId: string, phoneNumber: string) {
  // Normalize phone number
  const normalizedPhone = phoneNumber.replace(/\s+/g, '');

  // Validate phone number format (basic check)
  if (!normalizedPhone.match(/^\+?\d{10,15}$/)) {
    await sendTelegramMessage({
      chatId,
      text: '❌ Invalid phone number format. Please use format: +84912345678',
    });
    return;
  }

  // Check if phone is whitelisted
  const isWhitelisted = await isPhoneWhitelisted(normalizedPhone);
  if (!isWhitelisted) {
    await sendTelegramMessage({
      chatId,
      text: '❌ Your phone number is not whitelisted. Please contact the administrator.',
    });
    return;
  }

  // Save user with Telegram chat ID
  await saveUser(normalizedPhone, {
    phone_number: normalizedPhone,
    telegram_chat_id: chatId,
  });

  await sendTelegramMessage({
    chatId,
    text: `✅ Your phone number ${normalizedPhone} has been linked!\n\nYou can now login at the ePass web app to receive OTP codes here.`,
  });
}

// POST handler for Telegram webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Telegram webhook structure
    const message = body.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id.toString();
    const text = message.text;
    const firstName = message.chat.first_name;

    console.log('Telegram message:', { chatId, text, firstName });

    // Handle commands
    if (text?.startsWith('/')) {
      const command = text.toLowerCase().split(' ')[0];

      switch (command) {
        case '/start':
          await handleStart(chatId, firstName);
          break;

        case '/link':
          await handleLink(chatId);
          break;

        case '/status':
          await handleStatus(chatId);
          break;

        case '/help':
          await handleHelp(chatId);
          break;

        default:
          await sendTelegramMessage({
            chatId,
            text: 'Unknown command. Send /help for available commands.',
          });
      }
    } else if (text?.startsWith('+')) {
      // Handle phone number input
      await handlePhoneNumber(chatId, text);
    } else {
      // Regular message
      await sendTelegramMessage({
        chatId,
        text: `You said: "${text}"\n\nSend /help to see available commands.`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

// GET handler for webhook verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hubMode = searchParams.get('hub.mode');
  const hubChallenge = searchParams.get('hub.challenge');
  const hubVerifyToken = searchParams.get('hub.verify_token');

  // For Telegram webhook setup
  if (hubMode === 'subscribe' && hubVerifyToken === process.env.TELEGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(hubChallenge, { status: 200 });
  }

  return NextResponse.json({ status: 'ok' });
}
