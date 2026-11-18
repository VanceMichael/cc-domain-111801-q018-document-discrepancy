import { createServer } from 'node:http';

export async function fixtureSource(fixture) {
  const resources = structuredClone(fixture.resources);
  const accesses = [];
  const faults = new Map();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    accesses.push({ method: request.method, path: url.pathname, query: Object.fromEntries(url.searchParams) });
    const fault = faults.get(url.pathname);
    if (fault?.remaining > 0) {
      fault.remaining -= 1;
      response.writeHead(fault.status); response.end(JSON.stringify({ error: '来源暂时不可用' })); return;
    }
    if (request.method !== 'GET' || !Object.hasOwn(resources, url.pathname)) {
      response.writeHead(404); response.end(JSON.stringify({ error: '来源资料不存在' })); return;
    }
    const entry = resources[url.pathname];
    if (entry.delayMs) await new Promise(resolve => setTimeout(resolve, entry.delayMs));
    response.writeHead(entry.status ?? 200, { 'content-type': entry.mediaType ?? 'application/json; charset=utf-8', ...(entry.headers ?? {}) });
    response.end(entry.bytes ?? JSON.stringify(entry.body));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: 'http://127.0.0.1:' + server.address().port,
    accesses,
    replace(path, entry) { resources[path] = structuredClone(entry); },
    fail(path, status = 503, remaining = 1) { faults.set(path, { status, remaining }); },
    close() { return new Promise((resolve, reject) => { server.closeAllConnections(); server.close(error => error ? reject(error) : resolve()); }); },
  };
}
