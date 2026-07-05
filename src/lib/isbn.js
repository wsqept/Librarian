export async function fetchBookFromIsbn(isbn) {
  // Strip hyphens and spaces — Open Library uses clean ISBN
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  const url = `https://openlibrary.org/isbn/${encodeURIComponent(cleanIsbn)}.json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('请求超时，Open Library 可能无法访问');
    }
    // Network error — likely GFW / no internet
    throw new Error('无法连接 Open Library（可能需科学上网），请手动填写图书信息');
  }
  clearTimeout(timeout);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('未找到该书信息（ISBN 可能不在 Open Library 数据库中）');
    }
    throw new Error(`查询失败 (HTTP ${res.status})`);
  }

  const data = await res.json();

  // Fetch author names from the works API
  let authors = [];
  if (data.works) {
    try {
      const workKey = data.works[0].key;
      const workRes = await fetch(`https://openlibrary.org${workKey}.json`, { signal: controller.signal });
      if (workRes.ok) {
        const workData = await workRes.json();
        if (workData.authors) {
          authors = await Promise.all(
            workData.authors.map(async (a) => {
              try {
                const authorRes = await fetch(`https://openlibrary.org${a.author.key}.json`, { signal: controller.signal });
                if (authorRes.ok) {
                  const authorData = await authorRes.json();
                  return authorData.name;
                }
              } catch { /* skip */ }
              return null;
            })
          );
          authors = authors.filter(Boolean);
        }
      }
    } catch { /* skip authors, use empty */ }
  }

  // If no authors from works, try direct
  if (authors.length === 0 && data.authors) {
    authors = data.authors.map((a) => a.name || a).filter(Boolean);
  }

  const publishers = data.publishers || [];

  const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`;

  return {
    title: data.title || '',
    authors,
    publisher: publishers[0] || '',
    publishYear: data.publish_date ? parseInt(data.publish_date.match(/\d{4}/)?.[0]) || null : null,
    coverUrl,
  };
}
