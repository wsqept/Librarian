import { describe, it, expect } from 'vitest';
import { search, filterByPublisher, filterByAuthor } from '../../pages/search.js';

const books = [
  { title: 'JavaScript高级程序设计', publisher: '人民邮电出版社', authors: ['Matt Frisbie'] },
  { title: '深入理解计算机系统', publisher: '机械工业出版社', authors: ['Randal E. Bryant', 'David O\'Hallaron'] },
  { title: 'JavaScript权威指南', publisher: '清华大学出版社', authors: ['David Flanagan'] },
];

describe('search', () => {
  it('finds books by title substring', () => {
    const result = search(books, 'JavaScript');
    expect(result).toHaveLength(2);
  });

  it('is case-insensitive', () => {
    const result = search(books, 'javascript');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no match', () => {
    const result = search(books, 'Python');
    expect(result).toHaveLength(0);
  });

  it('returns all books when query is empty', () => {
    const result = search(books, '');
    expect(result).toHaveLength(3);
  });
});

describe('filterByPublisher', () => {
  it('filters by exact publisher', () => {
    const result = filterByPublisher(books, '人民邮电出版社');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('JavaScript高级程序设计');
  });

  it('returns empty for unknown publisher', () => {
    const result = filterByPublisher(books, '不存在出版社');
    expect(result).toHaveLength(0);
  });
});

describe('filterByAuthor', () => {
  it('filters by author in array', () => {
    const result = filterByAuthor(books, 'David Flanagan');
    expect(result).toHaveLength(1);
  });

  it('matches any author in multi-author book', () => {
    const result = filterByAuthor(books, 'David O\'Hallaron');
    expect(result).toHaveLength(1);
  });

  it('returns empty for unknown author', () => {
    const result = filterByAuthor(books, 'Unknown Author');
    expect(result).toHaveLength(0);
  });
});
