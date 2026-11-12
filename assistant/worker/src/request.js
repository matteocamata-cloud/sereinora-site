// One place that defines the request the assistant sends, shared by the Worker and the eval.
import { RULES } from './prompt.js';
import { KNOWLEDGE } from './knowledge.js';

// The system prompt never changes between requests, so it is cached (1 hour).
export const SYSTEM = [
  { type: 'text', text: RULES },
  { type: 'text', text: `<site>\n${KNOWLEDGE}\n</site>`, cache_control: { type: 'ephemeral', ttl: '1h' } },
];

export function buildRequest(messages, env = {}) {
  return {
    model: env.MODEL || 'claude-opus-5-5',
    max_tokens: 2048,
    output_config: { effort: env.EFFORT || 'low' },
    // On a safety decline the API re-runs the request on a fallback model inside the same call.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages,
  };
}
