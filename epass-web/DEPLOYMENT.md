# ePass Toll Manager - Deployment Guide

This guide will help you deploy the ePass Toll Manager application to Vercel with Supabase as the database.

## Prerequisites

- A Supabase account (free tier works)
- A Vercel account (free tier works)
- GitHub account for Vercel integration

## Step 1: Set Up Supabase

### 1.1 Create a New Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter project details:
   - **Name**: ePass Toll Manager
   - **Database Password**: (generate and save it)
   - **Region**: Choose a region close to your users (e.g., Singapore for Vietnam)

### 1.2 Run the SQL Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Run the SQL script

This will create:
- `users` table - stores user accounts and Telegram chat IDs
- `settings` table - stores whitelisted phone numbers
- `otps` table - stores OTP codes
- Row Level Security policies
- Cleanup function for expired OTPs

### 1.3 Get Your Supabase Credentials

1. Go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: `eyJxxxxx...`

## Step 2: Configure Environment Variables

### 2.1 For Local Development

Add these to your `.env.local` file:

```bash
# Supabase Database
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key

# ePass API Token
EPASS_TOKEN=your-epass-token

# ePass Refresh Token
EPASS_REFRESH_TOKEN=your-epass-refresh-token

# ePass Account Info
EPASS_CUSTOMER_ID=your-customer-id
EPASS_CONTRACT_ID=your-contract-id

# JWT Secret
JWT_SECRET=your-jwt-secret

# Telegram Bot Token
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 2.2 For Vercel Deployment

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add all the variables from above

## Step 3: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `epass-web`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
6. Add environment variables
7. Click "Deploy"

### Option B: Deploy via Vercel CLI

```bash
npm install -g vercel
vercel
```

## Step 4: Migrate Existing Data (Optional)

If you have existing data in `data/users.json` and `data/settings.json`, migrate it to Supabase:

### Migrate Settings

In Supabase SQL Editor:

```sql
UPDATE settings
SET whitelisted_phones = ARRAY['+84376586716', '+84YOUR_NUMBER'];
```

### Migrate Users

```sql
INSERT INTO users (phone_number, telegram_chat_id, created_at)
VALUES
  ('+84376586716', 'YOUR_TELEGRAM_CHAT_ID', '2024-01-01T00:00:00Z')
ON CONFLICT (phone_number) DO NOTHING;
```

## Step 5: Test Your Deployment

1. Visit your deployed URL
2. Test login with your phone number
3. Verify Telegram OTP is sent
4. Check the dashboard loads
5. Test Excel export

## Important Notes

### File Storage Removal

After deploying to Supabase:
- The `data/` folder is no longer needed
- You can safely delete `data/users.json` and `data/settings.json`
- All data is now stored in Supabase cloud database

### Whitelisted Phone Numbers

To add new whitelisted numbers:

**Option 1: Via Supabase Dashboard**
```sql
UPDATE settings
SET whitelisted_phones = array_append(whitelisted_phones, '+84NEW_NUMBER');
```

**Option 2: Via API** (if you build an admin panel)

### Telegram Webhook URL

After deployment, update your Telegram bot webhook:
```
https://your-vercel-app-url/api/telegram/webhook
```

## Troubleshooting

### "Database connection failed"

- Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct
- Check Supabase project is active

### "OTP not found or expired"

- Check `otps` table has records
- Verify RLS policies allow service_role access

### "Phone not whitelisted"

- Check `settings` table for your phone number
- Add your number if missing

## Production Checklist

- [ ] Supabase project created and SQL schema run
- [ ] Environment variables added to Vercel
- [ ] Whitelisted phone numbers configured
- [ ] Telegram bot webhook updated
- [ ] ePass API token is valid (check expiration)
- [ ] Test login and OTP flow
- [ ] Test dashboard and transaction loading
- [ ] Test Excel export
- [ ] Monitor Vercel logs for errors

## Cost Estimate (Free Tier)

| Service | Free Tier Limit | Cost After |
|---------|----------------|-------------|
| Vercel | 100GB bandwidth/month | Pay as you go |
| Supabase | 500MB database, 1GB file storage | $25/month after |
| Telegram Bot | Unlimited | Free |

The free tier should be sufficient for personal use or small deployments.

---

**Need Help?**
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
