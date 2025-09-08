(function(){
  'use strict';

  // Fill these with your Supabase project values
  var SUPABASE_URL = window.SUPABASE_URL || '';
  var SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

  if (!window.supabase) {
    console.warn('Supabase JS not loaded. Include https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2 first.');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY){
    console.warn('Supabase URL or anon key missing. Set window.SUPABASE_URL and window.SUPABASE_ANON_KEY.');
    return;
  }

  try{
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
  }catch(e){ console.error('Supabase init error:', e); }
})();


