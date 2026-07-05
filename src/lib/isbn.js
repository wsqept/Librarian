export async function fetchBookFromIsbn(isbn) {
  const url = `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`;

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('未找到该书信息');
    }
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();

  // Fetch author names from the works API
  let authors = [];
  if (data.works) {
    try {
      const workKey = data.works[0].key;
      const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
      if (workRes.ok) {
        const workData = await workRes.json();
        if (workData.authors) {
          authors = await Promise.all(
            workData.authors.map(async (a) => {
              try {
                const authorRes = await fetch(`https://openlibrary.org${a.author.key}.json`);
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

  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

  return {
    title: data.title || '',
    authors,
    publisher: publishers[0] || '',
    publishYear: data.publish_date ? parseInt(data.publish_date.match(/\d{4}/)?.[0]) || null : null,
    coverUrl,
  };
}
