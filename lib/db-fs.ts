import fs from 'fs/promises';
import path from 'path';

// Simple file-based database (fallback)
const DB_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');

export interface User {
  phone_number: string;
  telegram_chat_id?: string;
  created_at: string;
}

export interface Settings {
  whitelisted_phones: string[];
  last_checked_timestamp?: string;
  epass_token?: string;
  epass_refresh_token?: string;
}

// Initialize database directory
async function initDb() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    // Create users file if not exists
    try {
      await fs.access(USERS_FILE);
    } catch {
      await fs.writeFile(USERS_FILE, JSON.stringify({}, null, 2));
    }
    // Create settings file if not exists
    try {
      await fs.access(SETTINGS_FILE);
    } catch {
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(
        {
          whitelisted_phones: ['+84912345678'],
          last_checked_timestamp: null,
        },
        null,
        2
      ));
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Users
export async function getUsers() {
  await initDb();
  const content = await fs.readFile(USERS_FILE, 'utf-8');
  const users = JSON.parse(content || '{}');
  return users;
}

export async function getUser(phoneNumber: string) {
  const users = await getUsers();
  return users[phone_number] || null;
}

export async function saveUser(phoneNumber: string, userData: Partial<User>) {
  await initDb();
  const users = await getUsers();
  users[phone_number] = {
    phone_number,
    created_at: userData.created_at || new Date().toISOString(),
    ...userData,
  };
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function updateUserTelegram(phoneNumber: string, chatId: string) {
  await saveUser(phoneNumber, { telegram_chat_id: chatId });
}

export async function removeUserTelegram(phoneNumber: string) {
  await saveUser(phoneNumber, { telegram_chat_id: null });
}

// Settings
export async function getSettings() {
  await initDb();
  const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
  const settings = JSON.parse(content || '{}');
  return settings as unknown as Settings;
}

export async function isPhoneWhitelisted(phoneNumber: string) {
  const settings = await getSettings();
  const phones = settings.whitelisted_phones || [];

  // Normalize phone number (remove +84, spaces, etc.)
  const normalizedPhone = phoneNumber.replace(/\+84|^0/, '').replace(/\s/g, '');

  return phones.some((phone: string) => {
    const normalized = phone.replace(/\+84|^0/, '').replace(/\s/g, '');
    return normalized === normalizedPhone;
  });
}

export async function addWhitelistedPhone(phoneNumber: string) {
  const settings = await getSettings();
  const phones = settings.whitelisted_phones || [];

  if (!phones.includes(phoneNumber)) {
    phones.push(phoneNumber);
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  }
}

export async function removeWhitelistedPhone(phoneNumber: string) {
  const settings = await getSettings();
  const phones = settings.whitelisted_phones || [];

  const filtered = phones.filter((p: string) => p !== phoneNumber);

  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// ==================================================
// EPASS TOKEN MANAGEMENT (fallback)
// ==================================================

export async function getEpassTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const settings = await getSettings();
  if (!settings?.epass_token || !settings?.epass_refresh_token) {
    return null;
  }
  return {
    accessToken: settings.epass_token,
    refreshToken: settings.epass_refresh_token,
  };
}

export async function setEpassTokens(accessToken: string, refreshToken: string): Promise<void> {
  await initDb();
  const settings = await getSettings();
  settings.epass_token = accessToken;
  settings.epass_refresh_token = refreshToken;
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
