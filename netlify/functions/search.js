exports.handler = async function(event) {
  const query = event.queryStringParameters.q;
  if (!query) return { statusCode: 400, body: 'Missing query' };
  
  const url = 'https://fetch('/.netlify/functions/search?q='+encodeURIComponent(query))?search_terms=' + 
    encodeURIComponent(query) + 
    '&search_simple=1&action=process&json=1&page_size=8&fields=product_name,brands,nutriments,serving_size,code';
  
  const response = await fetch(url, {
    headers: { 'User-Agent': 'WellnessSync/1.0 (david.vial82@gmail.com)' }
  });
  
  const data = await response.json();
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
