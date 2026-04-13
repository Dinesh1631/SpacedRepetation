const PROXY_API = 'https://alfa-leetcode-api.onrender.com';

/**
 * Sleep helper for retry backoff
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry on 429 (rate limit) errors.
 */
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429 && attempt < maxRetries) {
      // Exponential backoff: 2s, 4s, 8s
      const waitMs = Math.pow(2, attempt + 1) * 1000;
      console.log(`Rate limited. Retrying in ${waitMs / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
      await sleep(waitMs);
      continue;
    }

    return res;
  }
};

/**
 * Try fetching from LeetCode's own GraphQL API directly (fallback).
 * This may or may not work depending on CORS, but worth trying.
 */
const fetchFromLeetCodeDirect = async (username, limit) => {
  const query = {
    query: `query recentAcSubmissionList($username: String!, $limit: Int) {
      recentAcSubmissionList(username: $username, limit: $limit) {
        id
        title
        titleSlug
        timestamp
      }
    }`,
    variables: { username, limit }
  };

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });

  if (!res.ok) throw new Error('Direct LeetCode API failed');

  const data = await res.json();
  return data?.data?.recentAcSubmissionList || [];
};

/**
 * Fetch recent accepted submissions for a LeetCode username.
 * Tries the proxy API first with retry, then falls back to direct GraphQL.
 * @param {string} username - Public LeetCode username
 * @param {number} limit - Max submissions to fetch (default 20)
 * @returns {Promise<Array<{title: string, titleSlug: string, timestamp: string}>>}
 */
export const fetchRecentAC = async (username, limit = 20) => {
  // Attempt 1: Proxy API with retry on 429
  try {
    const res = await fetchWithRetry(
      `${PROXY_API}/${username}/acSubmission?limit=${limit}`
    );

    if (res.ok) {
      const data = await res.json();
      return data.submission || [];
    }

    if (res.status === 404) {
      throw new Error(`LeetCode user "${username}" not found.`);
    }

    // If still 429 after retries, fall through to direct method
    if (res.status !== 429) {
      throw new Error(`LeetCode API error (${res.status})`);
    }

    console.log('Proxy exhausted. Trying direct LeetCode GraphQL...');
  } catch (err) {
    // If the error is a user-not-found, rethrow immediately
    if (err.message.includes('not found')) throw err;
    console.log('Proxy failed:', err.message, '— trying direct fallback...');
  }

  // Attempt 2: Direct LeetCode GraphQL (may fail due to CORS)
  try {
    return await fetchFromLeetCodeDirect(username, limit);
  } catch {
    throw new Error(
      'LeetCode sync is temporarily unavailable (rate limited). Please try again in a minute.'
    );
  }
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
