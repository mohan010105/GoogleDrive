import { createClient } from '@supabase/supabase-js';

const URL = 'https://fisxtmajwhicwgankyzc.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpc3h0bWFqd2hpY3dnYW5reXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NDcyMDIsImV4cCI6MjA4NDUyMzIwMn0.H2rcgGW5WLix_eXYl7w9egjfmfOkcRjDHt9kvuDEXbc';

const supabase = createClient(URL, ANON);

const run = async () => {
  const email = `temp+${Date.now()}@example.com`;
  const password = 'TestPass!1234';
  console.log('Testing signUp for', email);

  try {
    const { data: signData, error: signError } = await supabase.auth.signUp({ email, password });
    console.log('signUp error:', signError);
    console.log('signUp data:', signData);

    // Attempt to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    console.log('signIn error:', signInError);
    console.log('signIn data:', signInData);
  } catch (e) {
    console.error('Unexpected error', e);
  }
};

run();
