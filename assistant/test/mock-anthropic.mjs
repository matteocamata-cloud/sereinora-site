// Stand-in for the Anthropic Messages API, for local tests without a key or cost.
// Streams a fixed answer and records the last request to mock-last-request.json.
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
const port = Number(process.argv[2] || 8787 + 100);
const reply = process.argv[3] || 'The Venue Music Audit costs $495 per venue and is delivered in 5 business days. See https://sereinora.com/audit/.';
createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    writeFileSync(new URL('./mock-last-request.json', import.meta.url), JSON.stringify({ url: req.url, headers: req.headers, body: JSON.parse(body || '{}') }, null, 1));
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    ev('message_start', { message: { id: 'msg_mock', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, usage: { input_tokens: 10, output_tokens: 0 } } });
    ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
    for (const part of reply.match(/.{1,20}/gs)) ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: part } });
    ev('content_block_stop', { index: 0 });
    ev('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 30 } });
    ev('message_stop', {});
    res.end();
  });
}).listen(port, () => console.log('mock on', port));
