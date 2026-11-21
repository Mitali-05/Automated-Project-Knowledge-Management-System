export default async function handler(req, res) {
  const pathParam = req.query.path;
  const pathStr = Array.isArray(pathParam) ? pathParam.join('/') : (pathParam || '');
  const queryString = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const targetUrl = `http://3.107.34.239:8080/api/${pathStr}${queryString}`;

  const headers = {};
  for (const [key, val] of Object.entries(req.headers || {})) {
    const lk = key.toLowerCase();
    if (lk !== 'host' && lk !== 'connection' && lk !== 'content-length') {
      headers[key] = val;
    }
  }

  try {
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
      if (!headers['content-type'] && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    const backendRes = await fetch(targetUrl, fetchOptions);

    res.status(backendRes.status);
    backendRes.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(lk)) {
        res.setHeader(key, value);
      }
    });

    const buffer = await backendRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(502).json({ error: 'Backend unreachable', message: err.message });
  }
}
