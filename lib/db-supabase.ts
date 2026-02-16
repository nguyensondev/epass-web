import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set. Database features will not work.');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Helper function to ensure supabase is available
function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not initialized. Please check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  return supabase;
}

// Table interfaces
export interface User {
  phone_number: string;
  telegram_chat_id?: string;
  created_at: string;
}

export interface Settings {
  id: number;
  whitelisted_phones: string[];
  last_checked_timestamp?: string;
  epass_token?: string;
  epass_refresh_token?: string;
}

export interface OTPRecord {
  phone_number: string;
  code: string;
  expires_at: number;
}

// ==================================================
// USERS TABLE
// ==================================================

export async function getAllUsers(): Promise<Record<string, User>> {
  if (!supabase) {
    return {};
  }

  const client = requireSupabase();
  const { data, error } = await client
    .from('users')
    .select('*');

  if (error) {
    console.error('Error fetching users:', error);
    return {};
  }

  // Convert array to record keyed by phone_number
  const users: Record<string, User> = {};
  for (const user of data || []) {
    users[user.phone_number] = user;
  }
  return users;
}

export async function getUser(phoneNumber: string): Promise<User | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('users')
    .select('*')
    .eq('phone_number', phoneNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
}

export async function saveUser(phoneNumber: string, userData: Partial<User>): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('users')
    .upsert({
      phone_number: phoneNumber,
      created_at: new Date().toISOString(),
      ...userData,
    }, {
      onConflict: 'phone_number'
    });

  if (error) {
    console.error('Error saving user:', error);
    throw error;
  }
}

export async function updateUserTelegram(phoneNumber: string, chatId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('users')
    .update({ telegram_chat_id: chatId })
    .eq('phone_number', phoneNumber);

  if (error) {
    console.error('Error updating user Telegram:', error);
    throw error;
  }
}

export async function removeUserTelegram(phoneNumber: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('users')
    .update({ telegram_chat_id: null })
    .eq('phone_number', phoneNumber);

  if (error) {
    console.error('Error removing user Telegram:', error);
    throw error;
  }
}

// ==================================================
// SETTINGS TABLE
// ==================================================

export async function getSettings(): Promise<Settings | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching settings:', error);
    return null;
  }

  return data;
}

export async function initSettings(): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase client is not initialized');
  }

  const existing = await getSettings();
  if (!existing) {
    await supabase
      .from('settings')
      .insert({
        id: 1,
        whitelisted_phones: ['YOUR_PHONE_NUMBER'],
        last_checked_timestamp: null,
      });
  }
}

export async function isPhoneWhitelisted(phoneNumber: string): Promise<boolean> {
  const settings = await getSettings();
  console.log(settings)
  if (!settings) return false;
  
  const phones = settings.whitelisted_phones || [];

  // Normalize phone number (remove +84, spaces, etc.)
  const normalizedPhone = phoneNumber.replace(/\+84|^0/, '').replace(/\s/g, '');

  return phones.some((phone: string) => {
    const normalized = phone.replace(/\+84|^0/, '').replace(/\s/g, '');
    return normalized === normalizedPhone;
  });
}

export async function addWhitelistedPhone(phoneNumber: string): Promise<void> {
  const settings = await getSettings();
  if (!settings) {
    await initSettings();
  }

  const current = await getSettings();
  const phones = current?.whitelisted_phones || [];

  if (!phones.includes(phoneNumber)) {
    const client = requireSupabase();
  const { error } = await client
      .from('settings')
      .update({ whitelisted_phones: [...phones, phoneNumber] })
      .eq('id', 1);

    if (error) {
      console.error('Error adding whitelisted phone:', error);
      throw error;
    }
  }
}

export async function removeWhitelistedPhone(phoneNumber: string): Promise<void> {
  const settings = await getSettings();
  if (!settings) return;

  const client = requireSupabase();
  const { error } = await client
    .from('settings')
    .update({
      whitelisted_phones: settings.whitelisted_phones.filter(p => p !== phoneNumber)
    })
    .eq('id', 1);

  if (error) {
    console.error('Error removing whitelisted phone:', error);
    throw error;
  }
}

export async function updateLastCheckedTimestamp(timestamp: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('settings')
    .update({ last_checked_timestamp: timestamp })
    .eq('id', 1);

  if (error) {
    console.error('Error updating timestamp:', error);
    throw error;
  }
}

// ==================================================
// OTP TABLE
// ==================================================

export async function setOTP(phoneNumber: string, code: string, expiresAt: number): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('otps')
    .upsert({
      phone_number: phoneNumber,
      code,
      expires_at: expiresAt,
    }, {
      onConflict: 'phone_number'
    });

  if (error) {
    console.error('Error saving OTP:', error);
    throw error;
  }
}

export async function getOTP(phoneNumber: string): Promise<{ code: string; expires_at: number } | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('otps')
    .select('code, expires_at')
    .eq('phone_number', phoneNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching OTP:', error);
    return null;
  }

  return data;
}

export async function deleteOTP(phoneNumber: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('otps')
    .delete()
    .eq('phone_number', phoneNumber);

  if (error) {
    console.error('Error deleting OTP:', error);
  }
}

// ==================================================
// EPASS TOKEN MANAGEMENT
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
  const settings = await getSettings();
  if (!settings) {
    await initSettings();
  }

  const client = requireSupabase();
  const { error } = await client
    .from('settings')
    .update({
      epass_token: accessToken,
      epass_refresh_token: refreshToken,
    })
    .eq('id', 1);

  if (error) {
    console.error('Error saving ePass tokens:', error);
    throw error;
  }
}
