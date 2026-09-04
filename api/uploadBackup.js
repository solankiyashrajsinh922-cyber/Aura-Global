const { createServer } = require('http');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { userId, zipBase64, filename } = req.body;

    if (!userId || !zipBase64 || !filename) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_OWNER = process.env.GITHUB_OWNER;
    const GITHUB_REPO = process.env.GITHUB_REPO;

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      console.error('GitHub env variables missing');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const path = `backups/${userId}/${filename}`;
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AuraGlobal-Backup'
      },
      body: JSON.stringify({
        message: `Backup from user ${userId}`,
        content: zipBase64,
        committer: {
          name: 'AuraGlobal Backup',
          email: 'backup@aura.global'
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({
        success: true,
        url: data.content.download_url,
        sha: data.content.sha
      });
    } else {
      console.error('GitHub API error:', data);
      res.status(response.status).json({ error: data.message || 'GitHub upload failed' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
