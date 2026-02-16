import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSettings } from '@/lib/db-supabase';

export async function GET(request: NextRequest) {
  const results = {
    supabase: 'not_configured',
    tables: {},
    error: null as string | null,
  };

  try {
    // Check if Supabase is configured
    if (!supabase) {
      results.error = 'Supabase is not configured. Please check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.';
      return NextResponse.json(results, { status: 500 });
    }

    results.supabase = 'configured';

    // Test settings table
    try {
      const settings = await getSettings();
      results.tables.settings = settings ? {
        status: 'accessible',
        whitelisted_phones: settings.whitelisted_phones?.length || 0,
      } : {
        status: 'empty',
        message: 'No settings found. Run the SQL migration script.',
      };
    } catch (error: any) {
      results.tables.settings = {
        status: 'error',
        message: error.message,
      };
    }

    // Test users table
    try {
      const { data, error } = await supabase
        .from('users')
        .select('phone_number')
        .limit(1);

      if (error) {
        results.tables.users = {
          status: 'error',
          message: error.message,
          hint: 'Did you run the SQL migration? Make sure the users table exists.',
        };
      } else {
        results.tables.users = {
          status: 'accessible',
        };
      }
    } catch (error: any) {
      results.tables.users = {
        status: 'error',
        message: error.message,
      };
    }

    // Test otps table
    try {
      const { error } = await supabase
        .from('otps')
        .select('phone_number')
        .limit(1);

      if (error) {
        results.tables.otps = {
          status: 'error',
          message: error.message,
          hint: 'Did you run the SQL migration? Make sure the otps table exists.',
        };
      } else {
        results.tables.otps = {
          status: 'accessible',
        };
      }
    } catch (error: any) {
      results.tables.otps = {
        status: 'error',
        message: error.message,
      };
    }

    // Overall health check
    const allTablesAccessible = Object.values(results.tables).every(
      (t: any) => t.status === 'accessible'
    );

    return NextResponse.json({
      ...results,
      overall: allTablesAccessible ? 'healthy' : 'issues_found',
      instructions: allTablesAccessible ? null : {
        message: 'Some tables are not accessible. Please run the SQL migration in Supabase.',
        sqlFile: 'supabase/migrations/001_initial_schema.sql',
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      ...results,
      error: error.message,
      overall: 'error',
    }, { status: 500 });
  }
}
