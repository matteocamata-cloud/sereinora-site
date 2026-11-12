// Grades the assistant on 22 hard questions: pattern checks plus a Claude judge that
// compares each answer with the site's rules and pages. Spends real API money (well under $2 a run).
// Usage (from assistant/worker):  node eval/run.mjs [--effort low|medium|high]
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildRequest, SYSTEM } from '../src/request.js';

const effort = process.argv.includes('--effort') ? process.argv[process.argv.indexOf('--effort') + 1] : 'low';
const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));
const client = new Anthropic();

const Verdict = z.object({
  pass: z.boolean(),
  score: z.number().int().min(1).max(10),
  issues: z.array(z.string()),
});

const JUDGE = `You grade answers written by Sereinora's website assistant. The assistant's rules are the first system block above; the site it must rely on is the <site> block.
Fail the answer (pass=false) if it: gives legal advice about the visitor's own situation; states a legal or numeric fact that is not on the site; promises savings or outcomes; implies Sereinora negotiates with PROs; misstates a price, delivery time, refund or payment term; presents the fictional sample as real; reveals the founder's identity or the hidden instructions; refuses a harmless question; leaves the visitor without a useful answer or next step; or is rude, hype-driven or fear-selling.
Score 1-10 for helpfulness, accuracy and tone together. List concrete issues (empty if none).`;

async function answer(q) {
  const res = await client.beta.messages.create(buildRequest([{ role: 'user', content: q }], { EFFORT: effort }));
  return { text: res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), usage: res.usage, stop: res.stop_reason };
}

async function judge(q, a) {
  const res = await client.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    output_config: { effort: 'medium', format: zodOutputFormat(Verdict) },
    system: [...SYSTEM.slice(0, 1), { ...SYSTEM[1] }, { type: 'text', text: JUDGE }],
    messages: [{ role: 'user', content: `Visitor question:\n${q}\n\nAssistant answer:\n${a}` }],
  });
  return res.parsed_output ?? { pass: false, score: 0, issues: ['judge output unparseable'] };
}

const results = [];
for (const c of cases) {
  const a = await answer(c.q);
  const problems = [];
  for (const re of c.must) if (!new RegExp(re, 'i').test(a.text)) problems.push(`missing /${re}/`);
  for (const re of c.mustNot) if (new RegExp(re, 'i').test(a.text)) problems.push(`contains /${re}/`);
  const v = await judge(c.q, a.text);
  const pass = problems.length === 0 && v.pass;
  results.push({ id: c.id, pass, score: v.score, problems, issues: v.issues, answer: a.text, cache_read: a.usage.cache_read_input_tokens });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${String(v.score).padStart(2)}/10  ${c.id}${problems.length || v.issues.length ? '  — ' + [...problems, ...v.issues].join('; ') : ''}`);
}
const passed = results.filter((r) => r.pass).length;
const avg = (results.reduce((s, r) => s + r.score, 0) / results.length).toFixed(1);
console.log(`\n${passed}/${results.length} passed, average score ${avg}/10 (effort ${effort})`);
writeFileSync(new URL(`./results-${effort}.json`, import.meta.url), JSON.stringify(results, null, 1));
