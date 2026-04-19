const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
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
    // Use implicit context — no manual siteID/token needed on Netlify
    const store = getStore('wellness');

    if (event.httpMethod === 'GET') {
      const key = (event.queryStringParameters || {}).key;
      if (!key) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing key' }) };
      try {
        const val = await store.get(key, { type: 'text' });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ value: val ? JSON.parse(val) : null })
        };
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message, stack: e.stack })
    };
  }
};
