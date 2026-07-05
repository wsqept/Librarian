import { getSupabase } from './supabase.js';

const supabase = () => getSupabase();

// ─── Books ────────────────────────────────────

export async function loadBooks() {
  const { data, error } = await supabase()
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function loadBook(isbn) {
  const { data, error } = await supabase()
    .from('books')
    .select('*')
    .eq('isbn', isbn)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}

export async function saveBook(book) {
  const { data, error } = await supabase()
    .from('books')
    .insert(book)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBook(isbn, updates) {
  const { data, error } = await supabase()
    .from('books')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('isbn', isbn)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBook(isbn) {
  const { error } = await supabase()
    .from('books')
    .delete()
    .eq('isbn', isbn);

  if (error) throw error;
}

// ─── Borrow Records ──────────────────────────

export async function loadBorrowRecords(bookIsbn) {
  const { data, error } = await supabase()
    .from('borrow_records')
    .select('*')
    .eq('book_isbn', bookIsbn)
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function loadCurrentBorrowStatus(bookIsbn) {
  const { data, error } = await supabase()
    .from('borrow_records')
    .select('*')
    .eq('book_isbn', bookIsbn)
    .in('status', ['borrow_requested', 'borrowed', 'return_requested'])
    .order('requested_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

export async function loadPendingRequests() {
  const { data, error } = await supabase()
    .from('borrow_records')
    .select('*, books(title)')
    .in('status', ['borrow_requested', 'return_requested'])
    .order('requested_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function loadActiveBorrows() {
  const { data, error } = await supabase()
    .from('borrow_records')
    .select('*, books(title)')
    .eq('status', 'borrowed')
    .order('borrowed_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createBorrowRequest({ bookIsbn, memberName, memberStudentId }) {
  const { data, error } = await supabase()
    .from('borrow_records')
    .insert({
      book_isbn: bookIsbn,
      member_name: memberName,
      member_student_id: memberStudentId,
      status: 'borrow_requested',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function requestReturn(recordId) {
  const { data, error } = await supabase()
    .from('borrow_records')
    .update({
      status: 'return_requested',
      return_requested_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function confirmBorrow(recordId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from('borrow_records')
    .update({
      status: 'borrowed',
      confirmed_at: now,
      borrowed_at: now,
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function confirmReturn(recordId) {
  const now = new Date().toISOString();
  const { data, error } = await supabase()
    .from('borrow_records')
    .update({
      status: 'returned',
      returned_at: now,
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function rejectRequest(recordId, currentStatus) {
  const now = new Date().toISOString();

  if (currentStatus === 'return_requested') {
    // Reject return → go back to borrowed
    const { data, error } = await supabase()
      .from('borrow_records')
      .update({
        status: 'borrowed',
        return_requested_at: null,
      })
      .eq('id', recordId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Reject borrow request → set to returned (effectively closed, book available)
  const { data, error } = await supabase()
    .from('borrow_records')
    .update({
      status: 'returned',
      returned_at: now,
    })
    .eq('id', recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Realtime Subscription ──────────────────

export function subscribeBorrowRequests(onInsert) {
  return supabase()
    .channel('borrow-requests')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'borrow_records' },
      (payload) => onInsert(payload.new)
    )
    .subscribe();
}
