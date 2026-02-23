import { fetchEPASS, EPASS_CONFIG } from './epass';

const PAGE_SIZE = 500;
const MAX_DAYS = 30;

export interface Transaction {
  id: string;
  timestampIn: string;
  stationInName: string;
  ticketTypeName: string;
  price: number;
}

export interface BalanceInfo {
  balance: number;
  accountNumber: string;
}

// Helper: Split date range into chunks (max 30 days each)
function splitDateRange(startDate: Date, endDate: Date, maxDays = 30): Array<{from: string; to: string}> {
  const ranges: Array<{from: string; to: string}> = [];
  let currentStart = new Date(startDate);
  const finalEnd = new Date(endDate);

  while (currentStart <= finalEnd) {
    let currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + (maxDays - 1));

    if (currentEnd > finalEnd) {
      currentEnd = finalEnd;
    }

    ranges.push({
      from: formatDate(currentStart),
      to: formatDate(currentEnd),
    });

    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return ranges;
}

// Format date to DD/MM/YYYY
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Fetch transactions for a specific date range
export async function fetchTransactions(startDate: Date, endDate: Date): Promise<Transaction[]> {
  const ranges = splitDateRange(startDate, endDate, MAX_DAYS);
  const allData: Transaction[] = [];

  // Fetch each range with pagination
  for (const range of ranges) {
    let startRecord = 0;
    let totalRecords = 0;

    do {
      const params = new URLSearchParams({
        pagesize: PAGE_SIZE.toString(),
        startrecord: startRecord.toString(),
        efficiencyId: '1',
        timestampInFrom: range.from,
        timestampInTo: range.to,
      });

      const response = await fetchEPASS(`/transactions-vehicles?${params.toString()}`);
      const data = await response.json();
      const result = data.data;
      const list: Transaction[] = result.listData || [];

      allData.push(...list);

      totalRecords = result.count;
      startRecord += PAGE_SIZE;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (startRecord < totalRecords);
  }

  // Deduplicate by ID
  const uniqueMap = new Map<string, Transaction>();
  allData.forEach(item => uniqueMap.set(item.id, item));

  return Array.from(uniqueMap.values());
}

// Fetch account balance
export async function fetchBalance(): Promise<BalanceInfo> {
  const response = await fetchEPASS(`${EPASS_CONFIG.crmBaseURL}/customers/${EPASS_CONFIG.customerId}/contracts/${EPASS_CONFIG.contractId}/ocsInfo`);
  const data = await response.json();

  if (data.mess?.code === 1 && data.data) {
    return {
      balance: data.data.balance || 0,
      accountNumber: data.data.contractNo || data.data.accountUser || '',
    };
  }

  throw new Error(data.mess?.description || 'Failed to fetch balance');
}
