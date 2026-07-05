import { describe, it, expect } from 'vitest';

// Test the route matching logic in isolation
function matchRoute(routes, hash) {
  const path = hash || '#/';

  for (const { pattern, handler } of routes) {
    const regexStr = pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)');
    const regex = new RegExp(`^${regexStr}$`);
    const match = path.match(regex);

    if (match) {
      const params = match.groups || {};
      return { handler, params };
    }
  }
  return null;
}

describe('Router matching', () => {
  const routes = [
    { pattern: '#/', handler: 'home' },
    { pattern: '#/book/:isbn', handler: 'book-detail' },
    { pattern: '#/admin', handler: 'admin' },
    { pattern: '#/admin/add-book', handler: 'add-book' },
    { pattern: '#/login', handler: 'login' },
  ];

  it('matches root path', () => {
    const result = matchRoute(routes, '#/');
    expect(result.handler).toBe('home');
    expect(result.params).toEqual({});
  });

  it('matches book detail with isbn param', () => {
    const result = matchRoute(routes, '#/book/978-7-115-48232-2');
    expect(result.handler).toBe('book-detail');
    expect(result.params.isbn).toBe('978-7-115-48232-2');
  });

  it('matches admin path exactly', () => {
    const result = matchRoute(routes, '#/admin');
    expect(result.handler).toBe('admin');
  });

  it('matches admin/add-book (longer path takes precedence)', () => {
    const result = matchRoute(routes, '#/admin/add-book');
    expect(result.handler).toBe('add-book');
  });

  it('matches login page', () => {
    const result = matchRoute(routes, '#/login');
    expect(result.handler).toBe('login');
  });

  it('returns null for unknown path', () => {
    const result = matchRoute(routes, '#/nonexistent');
    expect(result).toBeNull();
  });

  it('handles empty hash as root', () => {
    const result = matchRoute(routes, '');
    expect(result.handler).toBe('home');
  });
});
