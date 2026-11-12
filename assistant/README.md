# Sereinora assistant

The "Ask a question" button on every page. Two modes:

- **Built-in answers** (live as soon as the site is published, free): curated answers for the key questions (prices, delivery, refund, payment, letters, lawsuits, TVs, damages, what we need), then a search over every section of the site (`assets/assistant-index.json`). Basic Spanish and French keywords work, and other languages are pointed to the language button. Everything runs in the visitor's browser.
- **Page-aware:** suggested questions and a one-time, dismissible prompt match the page the visitor is reading. The prompt appears after 25 seconds or once most of the page is read, never opens the chat by itself, and shows once per visit.
- **Leads:** after the first answer, the visitor gets one-tap buttons for the free check, audits and prices, and "Email this conversation", which opens their email app with the conversation already written out.
- **AI mode** (after setup below): Claude Opus 5.5 answers any question, in any language. It is grounded only in the published pages: `build-knowledge.mjs` copies them into the Worker. It falls back to the built-in answers whenever the AI service is unavailable, so a visitor always gets an answer.

## Files
- `assets/assistant.js`, `assets/assistant.css`: button and chat panel. `AI_ENDPOINT` at the top switches AI mode on.
- `assistant/worker/`: Cloudflare Worker that calls the Anthropic API. The rules are in `src/prompt.js` and the request in `src/request.js`.
- `assistant/build-knowledge.mjs`: rebuilds `worker/src/knowledge.js` from the pages. Run it after any page change, then redeploy.
- `assistant/worker/eval/`: 22 hard test questions and a grader. Run with `cd assistant/worker && node eval/run.mjs` (costs well under $2 per run).
- `assistant/test/mock-anthropic.mjs`: a local stand-in for the API, for tests without a key.

## One-time setup (founder)
1. **Anthropic account:** console.anthropic.com. Add a payment method and a monthly spend limit (for example $50), then create an API key named `sereinora-site`.
2. **Cloudflare account** (free): dash.cloudflare.com. Go to My Profile, then API Tokens, then Create Token, and use the template "Edit Cloudflare Workers".
3. Give both to Claude through the secure form (never in chat). Claude deploys the Worker and runs the eval.
4. In Cloudflare, go to Workers, then `sereinora-assistant`, then Settings, then Variables and Secrets. Add a **secret** named `ANTHROPIC_API_KEY` and paste the Anthropic key.
5. Claude sets `AI_ENDPOINT` to the Worker's `/chat` URL and publishes.

## Safety and cost
- No content is logged (Worker observability is off). Only error status codes are logged.
- Limits: 8 messages a minute and 40 an hour per visitor (best effort), 12 turns per conversation, 1,500 characters per message. Add a Cloudflare rate-limiting rule on `/chat` for a hard limit.
- The site text is cached for an hour, so repeat questions cost a fraction of the first. The Anthropic spend limit is the hard ceiling.
