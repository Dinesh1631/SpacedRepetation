/**
 * Fetch recent accepted submissions via our own Vercel serverless proxy.
 * This avoids all CORS issues since the call is server-to-server.
 */
export const fetchRecentAC = async (username, limit = 20) => {
  const res = await fetch(`/api/leetcode?username=${encodeURIComponent(username)}&limit=${limit}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 404 || body.error?.includes('not found')) {
      throw new Error(`LeetCode user "${username}" not found.`);
    }
    throw new Error(body.error || `Sync failed (${res.status})`);
  }

  const data = await res.json();
  return data.submission || [];
};

/**
 * Filter submissions to only those accepted today (local timezone).
 */
export const filterTodaySubmissions = (submissions) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const todayEnd = todayStart + 86400;

  return submissions.filter(s => {
    const ts = Number(s.timestamp);
    return ts >= todayStart && ts < todayEnd;
  });
};

/**
 * De-duplicate submissions by titleSlug (keep only latest per problem).
 */
export const deduplicateBySlug = (submissions) => {
  const seen = new Map();
  for (const s of submissions) {
    if (!seen.has(s.titleSlug) || Number(s.timestamp) > Number(seen.get(s.titleSlug).timestamp)) {
      seen.set(s.titleSlug, s);
    }
  }
  return Array.from(seen.values());
};
