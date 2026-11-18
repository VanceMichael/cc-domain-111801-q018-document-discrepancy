export class SourceError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

export class SourceClient {
  constructor(base, { timeoutMs = 3000, attempts = 2, maxBytes = 1048576 } = {}) {
    this.base = new URL(base);
    if (!['http:', 'https:'].includes(this.base.protocol)) throw new Error('来源协议无效');
    this.timeoutMs = timeoutMs;
    this.attempts = attempts;
    this.maxBytes = maxBytes;
  }

  async get(path) {
    const url = new URL(path, this.base);
    if (url.origin !== this.base.origin) throw new SourceError('来源链接越过配置边界');
    for (let attempt = 0; attempt < this.attempts; attempt += 1) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs), redirect: 'error' });
        if (!response.ok) throw new SourceError('来源请求未成功', response.status);
        const parts = [];
        let size = 0;
        for await (const part of response.body) {
          size += part.length;
          if (size > this.maxBytes) throw new SourceError('来源正文超过配置限制', 413);
          parts.push(part);
        }
        const bytes = Buffer.concat(parts);
        const raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        return { raw, bytes, location: url.href, mediaType: response.headers.get('content-type') ?? '', observedAt: new Date().toISOString() };
      } catch (error) {
        const retryable = !(error instanceof SourceError) || error.status === 429 || error.status >= 500;
        if (!retryable || attempt + 1 >= this.attempts) throw error;
      }
    }
    throw new SourceError('来源尝试次数无效');
  }
}
