const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Use implicit context — no manual siteID/token needed on Netlify
    const store = getStore('wellness');

    const body = JSON.parse(event.body || '{}');

    // Handle both Health Auto Export formats
    const metrics = body.data?.metrics || body.metrics || [];
    let stepsProcessed = 0;

    for (const metric of metrics) {
      const name = (metric.name || metric.metric || '').toLowerCase();

      if (name.includes('step')) {
        const entries = metric.data || metric.entries || [];
        for (const entry of entries) {
          const dateStr = (entry.date || entry.start || '').split(' ')[0].split('T')[0];
          if (!dateStr) continue;
          const steps = Math.round(entry.qty || entry.value || entry.count || 0);
          if (steps <= 0) continue;

          let existing = 0;
          try {
            const stored = await store.get('steps_' + dateStr, { type: 'text' });
            existing = stored ? JSON.parse(stored) : 0;
          } catch(e) { existing = 0; }

          if (steps > existing) {
            await store.set('steps_' + dateStr, JSON.stringify(steps));
            stepsProcessed++;
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, stepsProcessed })
    };

  } catch(e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message, stack: e.stack })
    };
  }
};
