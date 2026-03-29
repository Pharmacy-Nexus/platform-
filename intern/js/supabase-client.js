(function () {
  'use strict';

  const SUPABASE_URL = 'PUT_YOUR_SUPABASE_URL_HERE';
  const SUPABASE_ANON_KEY = 'PUT_YOUR_SUPABASE_ANON_KEY_HERE';

  if (!window.supabase) {
    console.error('Supabase library is not loaded.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  window.InternSupabase = client;
})();
