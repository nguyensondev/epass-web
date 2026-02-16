/**
 * Background job to check for new transactions and send Telegram notifications
 *
 * This can be run via:
 * - Vercel Cron Jobs (recommended)
 * - GitHub Actions
 * - Any Node.js runtime
 *
 * Example cron schedule: every 5 minutes (using cron syntax)
 */

import { fetchTransactions } from '../lib/epass-api';
import { getSettings, getUsers, updateLastCheckedTimestamp } from '../lib/db';
import { sendTransactionNotification } from '../lib/telegram';

interface Transaction {
  id: string;
  timestampIn: string;
  stationInName: string;
  ticketTypeName: string;
  price: number;
}

export async function checkNewTransactions() {
  console.log('🔍 Checking for new transactions...');

  try {
    const settings = await getSettings();
    const users = await getUsers();

    if (Object.keys(users).length === 0) {
      console.log('No users found, skipping.');
      return;
    }

    // Calculate date range for checking
    // Check last 24 hours for new transactions
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setHours(startDate.getHours() - 24);

    // Fetch transactions
    const transactions = await fetchTransactions(startDate, endDate);

    console.log(`Fetched ${transactions.length} transactions from the last 24 hours`);

    // Get the last checked timestamp
    const lastChecked = settings.lastCheckedTimestamp
      ? new Date(settings.lastCheckedTimestamp)
      : new Date(0); // Epoch if never checked

    // Filter for new transactions
    const newTransactions = transactions.filter((t) => {
      const txDate = new Date(t.timestampIn);
      return txDate > lastChecked;
    });

    console.log(`Found ${newTransactions.length} new transactions`);

    if (newTransactions.length > 0) {
      // Send notifications to users with linked Telegram
      let notificationsSent = 0;

      for (const user of Object.values(users)) {
        if (user.telegramChatId) {
          for (const tx of newTransactions) {
            const success = await sendTransactionNotification(user.telegramChatId, tx);
            if (success) {
              notificationsSent++;
            }
          }
        }
      }

      console.log(`✅ Sent ${notificationsSent} Telegram notifications`);
    }

    // Update last checked timestamp to now
    await updateLastCheckedTimestamp(endDate.toISOString());

    console.log('✅ Transaction check completed');
  } catch (error) {
    console.error('❌ Error checking transactions:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  checkNewTransactions()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
