export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, limit = 20 } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username parameter required' });
  }

  const query = `query recentAcSubmissionList($username: String!, $limit: Int) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }`;

  try {
    const response = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        query,
        variables: { username, limit: Number(limit) }
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `LeetCode returned ${response.status}` });
    }

    const data = await response.json();
    const submissions = data?.data?.recentAcSubmissionList || [];

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');

    return res.status(200).json({ submission: submissions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
