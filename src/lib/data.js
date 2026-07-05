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
    .not('borrowed_at', 'is', null)   // only confirmed borrows, not rejected
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
  // Check if this person already has an active borrow for this book
  const { data: existing } = await supabase()
    .from('borrow_records')
    .select('id')
    .eq('book_isbn', bookIsbn)
    .eq('member_name', memberName)
    .eq('member_student_id', memberStudentId)
    .in('status', ['borrow_requested', 'borrowed', 'return_requested'])
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error('你已有该书活跃的借阅记录，不能重复申请');
  }

  // Check available copies
  const { data: book } = await supabase()
    .from('books')
    .select('available_copies')
    .eq('isbn', bookIsbn)
    .single();

  if (!book || book.available_copies < 1) {
    throw new Error('该书已全部借出，暂时无法申请');
  }

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

export async function requestReturn(recordId, memberName, memberStudentId) {
  // Atomic update: only succeeds if status=borrowed AND identity matches
  const { data, error } = await supabase()
    .from('borrow_records')
    .update({
      status: 'return_requested',
      return_requested_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .eq('status', 'borrowed')
    .eq('member_name', memberName)
    .eq('member_student_id', memberStudentId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('身份验证失败或该书状态已变更，请刷新页面后重试');
    }
    throw error;
  }
  return data;
}

export async function confirmBorrow(recordId) {
  const now = new Date().toISOString();

  const { data: record } = await supabase()
    .from('borrow_records')
    .select('book_isbn')
    .eq('id', recordId)
    .single();

  if (!record) throw new Error('借阅记录不存在');

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

  // Atomically decrement available copies
  await supabase().rpc('decrement_copy', { book_isbn: record.book_isbn });

  return data;
}

export async function confirmReturn(recordId) {
  const now = new Date().toISOString();

  const { data: record } = await supabase()
    .from('borrow_records')
    .select('book_isbn')
    .eq('id', recordId)
    .single();

  if (!record) throw new Error('借阅记录不存在');

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

  // Atomically increment available copies
  await supabase().rpc('increment_copy', { book_isbn: record.book_isbn });

  return data;
}

export async function rejectRequest(recordId, currentStatus) {
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

  // Reject borrow request → mark as returned (borrowed_at stays null, hidden from history)
  const { data, error } = await supabase()
    .from('borrow_records')
    .update({
      status: 'returned',
    })
    .eq('id', recordId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Edit Borrow Record Info ────────────────

export async function updateBorrowRecordInfo(recordId, { memberName, memberStudentId }) {
  const { data, error } = await supabase()
    .from('borrow_records')
    .update({
      member_name: memberName,
      member_student_id: memberStudentId,
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
