import https from 'node:https';
import { URLSearchParams } from 'node:url';
import zlib from 'node:zlib';
import { promisify } from 'node:util';

const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
];

export class Brave {
  uaIndex = 0;
  lastRequest = 0;

  async _fetch(url: string): Promise<string> {
    const wait = 1200 - (Date.now() - this.lastRequest);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastRequest = Date.now();

    return new Promise((resolve, reject) => {
      const req = https.request(url, {
        headers: {
          'User-Agent': USER_AGENTS[this.uaIndex % USER_AGENTS.length],
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Cache-Control': 'max-age=0'
        },
        timeout: 15000,
        rejectUnauthorized: false
      }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', c => chunks.push(c));
        res.on('end', async () => {
          try {
            const raw = Buffer.concat(chunks);
            const enc = (res.headers['content-encoding'] || '').toLowerCase();
            let body;
            if (enc.includes('br')) body = await brotliDecompress(raw);
            else if (enc.includes('gzip')) body = await gunzip(raw);
            else if (enc.includes('deflate')) body = await inflate(raw);
            else body = raw;
            resolve(body.toString('utf-8'));
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TIMEOUT'));
      });
      req.end();
    });
  }

  _strip(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .replace(/<[^>]+>/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/\s+/g, ' ').trim();
  }

  _parseWeb(html: string) {
    const results = [];
    const tagRe = /<div[^>]*\bdata-pos="(\d+)"[^>]*\bdata-type="web"[^>]*>/gi;
    const positions: { index: number, pos: number }[] = [];
    let m;
    while ((m = tagRe.exec(html)) !== null) {
      positions.push({
        index: m.index,
        pos: parseInt(m[1])
      });
    }
    for (let i = 0; i < positions.length; i++) {
        // Use ?? operator to handle undefined when i+1 is out of bounds
        const chunk = html.slice(positions[i].index, positions[i + 1]?.index ?? html.length);

        const url = (
            chunk.match(/class="[^"]*\bl1\b[^"]*"[^>]*\bhref="(https?:\/\/[^"]+)"/i) ||
            chunk.match(/\bhref="(https?:\/\/[^"]+)"[^>]*class="[^"]*\bl1\b[^"]*"/i)
        )?.[1] ?? '';

        const title = this._strip(
            (chunk.match(/class="[^"]*search-snippet-title[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                chunk.match(/class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i))?.[1] ?? ''
        );

        const displayUrl = this._strip(
            chunk.match(/<cite[^>]*class="[^"]*snippet-url[^"]*"[^>]*>([\s\S]*?)<\/cite>/i)?.[1] ?? ''
        );

        const description = this._strip(
            (chunk.match(/class="[^"]*\bcontent\b[^"]*line-clamp-dynamic[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                chunk.match(/class="[^"]*generic-snippet[^"]*"[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i))?.[1] ?? ''
        );

        const ageMatch = chunk.match(/<span[^>]*class="[^"]*\bt-secondary\b[^"]*"[^>]*>([^<]*(?:ago|yesterday|hour|min|sec)[^<]*)<\/span>/i);
        const age = ageMatch ? ageMatch[1].replace(/-$/, '').trim() : null;

        results.push({
            title,
            url,
            displayUrl,
            description,
            age,
            position: positions[i].pos
        });
    }
    return results;
  }

  _parseFaq(html: string) {
    const results = [];
    const re = /<details[^>]*>[\s\S]*?<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const question = this._strip(m[1]);
      const answer = this._strip(m[2]);
      if (question && answer && question.length < 300) {
        results.push({
          question,
          answer
        });
      }
    }
    return results;
  }

  async search(query: string, opts: { offset?: number; count?: number } = {}) {
    const params = new URLSearchParams({
      q: query,
      source: 'web'
    });
    if (opts.offset) params.set('offset', opts.offset.toString());
    if (opts.count) params.set('count', opts.count.toString());
    const html = await this._fetch(`https://search.brave.com/search?${params}`);
    return {
      web: this._parseWeb(html),
      faq: this._parseFaq(html)
    };
  }
}
