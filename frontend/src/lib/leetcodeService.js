const API_BASE = 'https://alfa-leetcode-api.onrender.com';

/**
 * Fetch recent accepted submissions for a LeetCode username.
 * Uses the open-source alfa-leetcode-api proxy to avoid CORS issues.
 * @param {string} username - Public LeetCode username
 * @param {number} limit - Max submissions to fetch (default 20)
 * @returns {Promise<Array<{title: string, titleSlug: string, timestamp: number}>>}
 */
export const fetchRecentAC = async (username, limit = 20) => {
  const res = await fetch(`${API_BASE}/${username}/acSubmission?limit=${limit}`);

  if (!res.ok) {
    if (res.status === 404) throw new Error(`LeetCode user "${username}" not found.`);
    throw new Error(`LeetCode API error (${res.status})`);
  }

  const data = await res.json();
  return data.submission || [];
};

/**
 * Filter submissions to only those accepted today (local timezone).
 * @param {Array} submissions - Raw submissions from fetchRecentAC
 * @returns {Array} - Submissions from today only
 */
export const filterTodaySubmissions = (submissions) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
  const todayEnd = todayStart + 86400; // +24h in seconds

  return submissions.filter(s => {
    const ts = Number(s.timestamp);
    return ts >= todayStart && ts < todayEnd;
  });
};

/**
 * De-duplicate submissions by titleSlug (keep only latest per problem).
 * @param {Array} submissions
 * @returns {Array}
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
