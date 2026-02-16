import { setOTP as setOTPSupabase, getOTP as getOTPSupabase, deleteOTP as deleteOTPSupabase } from './db-supabase';

interface OTPEntry {
  code: string;
  expiresAt: number;
}

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize phone number
function normalizePhone(phone: string): string {
  return phone.replace(/\+84|^0/, '').replace(/\s/g, '');
}

// Store OTP for a phone number (using Supabase)
async function setOTP(phoneNumber: string, code: string, expiresAt: number): Promise<void> {
  await setOTPSupabase(phoneNumber, code, expiresAt);
}

// Get OTP for a phone number (using Supabase)
async function getOTP(phoneNumber: string): Promise<OTPEntry | null> {
  const result = await getOTPSupabase(phoneNumber);
  if (!result) return null;
  return { code: result.code, expiresAt: result.expires_at };
}

// Delete OTP for a phone number (using Supabase)
async function deleteOTP(phoneNumber: string): Promise<void> {
  await deleteOTPSupabase(phoneNumber);
}

// Clean up expired OTPs (Supabase handles this via the cleanup function)
async function cleanupExpiredOTPs(): Promise<void> {
  // This is now handled by the Supabase cleanup_expired_otps() function
  // You can call it via RPC or set up a cron job in Supabase
  try {
    const { supabase } = await import('./db-supabase');
    await supabase.rpc('cleanup_expired_otps');
  } catch (error) {
    console.error('Failed to cleanup expired OTPs:', error);
  }
}

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(cleanupExpiredOTPs, 5 * 60 * 1000);
}

export { generateOTP, normalizePhone, setOTP, getOTP, deleteOTP };
