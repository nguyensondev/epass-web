declare module '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      users: 'public';
      settings: 'public';
    };
    };
  };
}

export type Tables = keyof Database.Tables;

export namespace Supabase {
  function from<T extends Tables>(table: T): SupabaseClient<T>;
}
