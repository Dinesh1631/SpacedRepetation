const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';
const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const GRAPHQL_QUERY = `query recentAcSubmissionList($username: String!, $limit: Int) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    id
    title
    titleSlug
    timestamp
  }
}`;

/**
 * Fetch recent accepted submissions by calling LeetCode GraphQL directly
 * through CORS proxies. No third-party API dependency.
 */
export const fetchRecentAC = async (username, limit = 20) => {
  const body = JSON.stringify({
    query: GRAPHQL_QUERY,
    variables: { username, limit }
  });

  const headers = { 'Content-Type': 'application/json' };

  // Attempt 1: Direct call (works in some environments)
  try {
    const res = await fetch(LEETCODE_GRAPHQL, {
      method: 'POST', headers, body
    });
    if (res.ok) {
      const json = await res.json();
      const list = json?.data?.recentAcSubmissionList;
      if (list) return list;
    }
  } catch { /* CORS blocked — expected, try proxies */ }

  // Attempt 2+: Try each CORS proxy
  for (const makeUrl of CORS_PROXIES) {
    try {
      const proxyUrl = makeUrl(LEETCODE_GRAPHQL);
      const res = await fetch(proxyUrl, {
        method: 'POST', headers, body
      });
      if (res.ok) {
        const json = await res.json();
        const list = json?.data?.recentAcSubmissionList;
        if (list) return list;
      }
    } catch {
      continue; // Try next proxy
    }
  }

  throw new Error(
    'Could not reach LeetCode. All connection methods failed. Please check your internet and try again.'
  );
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
