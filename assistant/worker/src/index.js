// Sereinora assistant: a Cloudflare Worker that answers visitor questions with Claude,
// grounded only in the published pages of sereinora.com.
//
// POST /chat  body: {"messages":[{"role":"user","content":"..."}, ...]}
// Response: text/event-stream of  data: {"t":"<text>"}  ...  data: {"done":true}
//           (or data: {"error":"<message for the visitor>"})
//
// Secrets / vars (set in Cloudflare, never in this file):
//   ANTHROPIC_API_KEY  secret
//   ALLOWED_ORIGINS    comma-separated, e.g. "https://sereinora.com,https://www.sereinora.com"
//   MODEL              optional, default claude-opus-5-5
//   EFFORT             optional, default "low" (fast replies; raise if quality needs it)
//   ANTHROPIC_BASE_URL optional, local testing only (points the SDK at a mock server)
import Anthropic from '@anthropic-ai/sdk';
import { buildRequest } from './request.js';

const LIMITS = { turns: 12, charsPerMessage: 1500, totalChars: 12000 };
const RATE = { perMinute: 8, perHour: 40 };
const FALLBACK_MSG = 'The assistant is unavailable right now. Please email contact@sereinora.com and we will reply in writing.';

// Best-effort per-isolate rate limit. For hard limits add a Cloudflare rate-limiting
// rule on /chat and a monthly spend limit in the Anthropic Console (see assistant/README.md).
const hits = new Map();
function rateLimited(ip, now) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.filter((t) => now - t < 60_000).length > RATE.perMinute || recent.length > RATE.perHour;
}

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || 'https://sereinora.com').split(',').map((s) => s.trim());
  const ok = allowed.includes(origin);
  return {
    ok,
    headers: {
      'Access-Control-Allow-Origin': ok ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}

// Returns a clean, alternating user/assistant history or an error string.
export function validate(body) {
  const msgs = body && Array.isArray(body.messages) ? body.messages : null;
  if (!msgs || msgs.length === 0) return 'No message.';
  if (msgs.length > LIMITS.turns * 2 - 1) return 'This conversation is long. Please email contact@sereinora.com to continue.';
  let total = 0;
  const clean = [];
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    const role = i % 2 === 0 ? 'user' : 'assistant';
    if (!m || m.role !== role || typeof m.content !== 'string') return 'Invalid conversation.';
    const content = m.content.trim();
    if (!content) return 'Empty message.';
    if (role === 'user' && content.length > LIMITS.charsPerMessage) return `Please keep messages under ${LIMITS.charsPerMessage} characters.`;
    if (role === 'user') total += content.length;
    clean.push({ role, content: content.slice(0, 6000) });
  }
  if (total > LIMITS.totalChars) return 'This conversation is long. Please email contact@sereinora.com to continue.';
  if (clean[clean.length - 1].role !== 'user') return 'Invalid conversation.';
  return clean;
}

const sse = (obj) => `data: ${JSON.stringify(obj)}\n\n`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const { ok, headers } = cors(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: ok ? 204 : 403, headers });
    if (url.pathname === '/health') return new Response('ok', { headers });
    if (url.pathname !== '/chat' || request.method !== 'POST') return new Response('Not found', { status: 404, headers });
    if (!ok) return new Response('Forbidden', { status: 403, headers });

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const json = (obj, status) => new Response(sse(obj), { status, headers: { ...headers, 'Content-Type': 'text/event-stream' } });
    if (rateLimited(ip, Date.now())) return json({ error: 'Too many messages in a short time. Please wait a minute, or email contact@sereinora.com.' }, 429);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
    const messages = validate(body);
    if (typeof messages === 'string') return json({ error: messages }, 400);

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 2, timeout: 60_000 });
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const enc = new TextEncoder();
    const send = (obj) => writer.write(enc.encode(sse(obj)));

    ctx.waitUntil((async () => {
      try {
        const stream = client.beta.messages.stream(buildRequest(messages, env));
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') await send({ t: event.delta.text });
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === 'refusal') await send({ t: '\n\nI can’t help with that here. For anything about your venue, please email contact@sereinora.com.' });
        if (final.stop_reason === 'max_tokens') await send({ t: '…\n\nFor more detail, please email contact@sereinora.com.' });
        await send({ done: true });
      } catch (err) {
        // Never expose provider errors to visitors; log status only (no message content).
        console.log('assistant error', err instanceof Anthropic.APIError ? err.status : 'network');
        await send({ error: FALLBACK_MSG });
      } finally {
        await writer.close();
      }
    })());

    return new Response(readable, {
      headers: { ...headers, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  },
};
