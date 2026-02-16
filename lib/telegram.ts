import axios from 'axios';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export interface TelegramMessage {
  chatId: string;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
}

// Send a message to a Telegram chat
export async function sendTelegramMessage({ chatId, text, parseMode }: TelegramMessage): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured');
    return false;
  }

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: parseMode || 'HTML',
    });

    return true;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return false;
  }
}

// Send notification about new transaction
export async function sendTransactionNotification(
  chatId: string,
  transaction: {
    timestampIn: string;
    stationInName: string;
    ticketTypeName: string;
    price: number;
  }
): Promise<boolean> {
  const text = `
🔔 <b>Thông báo trạm thu phí mới</b>

📍 Trạm: ${transaction.stationInName}
🕐 Thời gian: ${transaction.timestampIn}
🎫 Loại vé: ${transaction.ticketTypeName}
💰 Phí: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(transaction.price)}
  `.trim();

  return sendTelegramMessage({ chatId, text, parseMode: 'HTML' });
}

// Get bot info
export async function getBotInfo(): Promise<{ id: number; username: string } | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  try {
    const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    return {
      id: response.data.result.id,
      username: response.data.result.username,
    };
  } catch (error) {
    console.error('Failed to get bot info:', error);
    return null;
  }
}
