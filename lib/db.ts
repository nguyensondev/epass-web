// Re-export Supabase functions for backward compatibility
export {
  getAllUsers as getUsers,
  getUser,
  saveUser,
  updateUserTelegram,
  removeUserTelegram,
  getSettings,
  isPhoneWhitelisted,
  addWhitelistedPhone,
  removeWhitelistedPhone,
  updateLastCheckedTimestamp,
  getEpassTokens,
  setEpassTokens,
  supabase,
  type User,
  type Settings,
} from './db-supabase';
