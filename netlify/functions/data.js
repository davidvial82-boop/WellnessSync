const { getStore } = require('@netlify/blobs');

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Use Netlify's built-in token from context - no extra env vars needed
    const store = getStore({   name: 'wellness',   siteID: process.env.NETLIFY_SITE_ID,   token: process.env.NETLIFY_TOKEN });

    if (event.httpMethod === 'GET') {
      const key = (event.queryStringParameters || {}).key;
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing key' }) };
      try {
        const val = await store.get(key);
        return { statusCode: 200, headers, body: JSON.stringify({ value: val ? JSON.parse(val) : null }) };
      } catch(e) {
        return { statusCode: 200, headers, body: JSON.stringify({ value: null }) };
      }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing key' }) };
      await store.set(body.key, JSON.stringify(body.value));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch(e) {
    console.error('Blob error:', e);
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
