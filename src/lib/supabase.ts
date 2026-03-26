// Supabase client - gracefully handles missing configuration
let supabaseInstance: any = null;

function createFallbackClient() {
  const noop = () => Promise.resolve({ data: null, error: new Error('Supabase not configured') });
  const queryBuilder = () => {
    const builder: any = {
      select: () => builder, from: () => builder, insert: () => builder, update: () => builder,
      delete: () => builder, eq: () => builder, neq: () => builder, ilike: () => builder,
      not: () => builder, in: () => builder, or: () => builder, order: () => builder,
      limit: () => builder, single: () => noop(), maybeSingle: () => noop(),
      then: (resolve: any) => resolve({ data: null, error: new Error('Supabase not configured') }),
    };
    return builder;
  };
  return {
    from: (table: string) => queryBuilder(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signIn: noop, signOut: noop, signUp: noop,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: { from: () => ({ upload: noop, getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
  };
}

function initSupabase() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || url === 'your_supabase_url' || !key || key === 'your_supabase_anon_key') {
    console.info('Supabase not configured - using local storage fallback');
    return createFallbackClient();
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(url, key);
  } catch {
    try {
      // ESM fallback
      const mod = { createClient: null as any };
      import('@supabase/supabase-js').then(m => { supabaseInstance = m.createClient(url, key); });
    } catch {}
    return createFallbackClient();
  }
}

export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance;
  supabaseInstance = initSupabase();
  return supabaseInstance;
})();
