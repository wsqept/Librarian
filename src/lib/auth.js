import { getSupabase } from './supabase.js';

const supabase = () => getSupabase();

export async function login(email, password) {
  const { data, error } = await supabase().auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase().auth.signOut();
  if (error) throw error;
}

export function isAuthenticated() {
  return getSupabase().auth.getSession()
    .then(({ data }) => !!data.session);
}

export function getSessionSync() {
  // Best-effort synchronous check — for immediate UI state
  // Returns null if not yet loaded (use isAuthenticated for definite answer)
  return getSupabase().auth.getSession()
    .then(({ data }) => data.session);
}

export function onAuthStateChange(callback) {
  return getSupabase().auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export function getUser() {
  return getSupabase().auth.getUser()
    .then(({ data }) => data.user);
}
