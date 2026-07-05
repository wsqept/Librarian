import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Set up env vars for tests
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-key';

import { loadBooks, loadBook, saveBook } from '../data.js';

beforeEach(() => {
  vi.clearAllMocks();

  // Default chain: .from().select().order()
  mockOrder.mockReturnValue(Promise.resolve({ data: null, error: null }));
  mockSelect.mockReturnValue({ order: mockOrder });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSingle.mockReturnValue(Promise.resolve({ data: null, error: null }));
  mockFrom.mockReturnValue({ select: mockSelect });

  // Reset getSupabase singleton
  vi.resetModules();
});

describe('loadBooks', () => {
  it('returns book array on success', async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        { isbn: '123', title: 'Test Book', authors: ['Author'], publisher: 'Pub' },
        { isbn: '456', title: 'Another Book', authors: ['A2'], publisher: 'Pub2' },
      ],
      error: null,
    });

    // Re-import to get fresh singleton with our mock
    const { loadBooks } = await import('../data.js');
    const books = await loadBooks();

    expect(books).toHaveLength(2);
    expect(books[0].title).toBe('Test Book');
    expect(mockFrom).toHaveBeenCalledWith('books');
    expect(mockSelect).toHaveBeenCalledWith('*');
  });

  it('throws on error', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const { loadBooks } = await import('../data.js');
    await expect(loadBooks()).rejects.toEqual({ message: 'Database error' });
  });
});

describe('loadBook', () => {
  it('returns single book on success', async () => {
    const selectWithEq = vi.fn();
    selectWithEq.mockReturnValue({
      eq: () => ({ single: () => Promise.resolve({ data: { isbn: '123', title: 'Test' }, error: null }) }),
    });
    mockFrom.mockReturnValue({ select: selectWithEq });

    const { loadBook } = await import('../data.js');
    const book = await loadBook('123');

    expect(book.title).toBe('Test');
  });

  it('returns null for not found (PGRST116)', async () => {
    const selectWithEq = vi.fn();
    selectWithEq.mockReturnValue({
      eq: () => ({ single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }) }),
    });
    mockFrom.mockReturnValue({ select: selectWithEq });

    const { loadBook } = await import('../data.js');
    const book = await loadBook('nonexistent');
    expect(book).toBeNull();
  });
});
