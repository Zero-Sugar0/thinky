---
name: growth-engine
description: Use Growth Engine tools to access 4,100+ endpoints across 123+ providers for B2B leads, prospect discovery, email and phone enrichment, SEO, SERP rankings, backlinks, company signals, social profiles, and web data.
---

# Growth Engine Skill

Growth Engine connects your agent to over 4,100 API endpoints across 123+ providers for market intelligence, B2B lead generation, enrichment, and SEO.

## Available Tools

### 1. Dynamic Exploration Hub (Any Capability)
- **`growth_search`**: Search the tool catalog by the job you want done.
  - Examples: `"find leads by job title"`, `"google serp organic"`, `"verify email"`, `"backlinks for domain"`, `"tiktok profile"`.
- **`growth_inspect`**: Inspect an endpoint's schemas, parameters, pricing model, and ready-to-call examples.
- **`growth_call`**: Execute any tool endpoint across providers or routed capabilities (`treg.<job>`). Supports `awaitAsync` for asynchronous generation tasks, cost ceilings (`maxCostUsd`), `idempotencyKey`, routing controls (`stopOnFirstMiss`, `strictFilters`, `noCache`), and returns provider `advice` and `ignoredFilters`.
- **`growth_call_result`**: Recover the stored response of any previous successful catalog call by `callId` at zero cost without paying or re-querying.
- **`growth_review`**: Rate a tool call's usefulness (`useful`, `partly`, `not_useful`, `not_sure`) with optional feedback by `callId`.
- **`growth_request`**: Submit a feature request or feedback when a data capability is missing from the catalog.
- **`growth_balance`**: Check available credits and recent billing status.

### 2. Direct 1-Shot Action Tools (Instant Execution)
- **`growth_find_leads`**: Find B2B prospects by job titles, industry, company domains, seniority, or geography.
- **`growth_find_email`**: Find a verified business email by name and domain or LinkedIn URL.
- **`growth_find_phone`**: Find direct business or personal phone numbers for contacts.
- **`growth_verify_email`**: Verify deliverability and mailbox existence before conducting outreach.
- **`growth_enrich_company`**: Enrich company details (employee count, tech stack, funding, industry).
- **`growth_similar_companies`**: Find lookalike companies and competitor accounts given a company domain.
- **`growth_serp`**: Fetch live Google SERP organic rankings for any query and country.
- **`growth_web_extract`**: Cleanly extract markdown content and text from any public web page.

---

## The Workflow

### 1. For Standard Lookups
Use the direct 1-shot tools:
- Need leads? Use `growth_find_leads`.
- Need a work email? Use `growth_find_email`.
- Need a phone number? Use `growth_find_phone`.
- Need to check an address? Use `growth_verify_email`.
- Need company intel? Use `growth_enrich_company`.
- Need competitor or lookalike companies? Use `growth_similar_companies`.
- Need search rankings? Use `growth_serp`.
- Need page content or article text? Use `growth_web_extract`.

### 2. For Custom or Advanced Capabilities
Use the dynamic hub:
1. Search with `growth_search`: e.g. `{ "query": "reddit subreddit posts" }`
2. Inspect if needed with `growth_inspect`: e.g. `{ "toolId": "scrapecreators.reddit.subreddit.posts" }`
3. Execute with `growth_call`: e.g. `{ "toolId": "...", "query": { "subreddit": "saas" } }`

---

## Best Practices & Operating Rules

### 1. Prefer Routed Capabilities (`treg.<job>`)
For standard tasks, prefer routed capabilities:
- **People & Leads**: `treg.people.search`, `treg.people.email.find`, `treg.people.email.verify`, `treg.people.phone.find`
- **Companies**: `treg.companies.search`, `treg.companies.enrich`, `treg.companies.similar`
- **SEO & Search**: `treg.google.serp.organic`, `treg.google.serp.maps`, `treg.web.search`
- **Web Scraping**: `treg.web.extract`

Why? Routed capabilities try the team's key first, pick the cheapest and most reliable provider, handle automatic fallbacks on failure, and only bill when a valid result is returned.

### 2. Verify Contacts Before Recommending Outreach
- An email found by a provider is an algorithmic match, not guaranteed deliverability.
- If finding contacts, always run verification (`growth_verify_email` or `verifyEmail: true`) or inspect `domainMatch` to confirm the mailbox actually matches the target company domain.
- Check `advice`: when `growth_call` or `growth_find_phone` returns `advice`, heed the provider's instructions before using the contact info.

### 3. Filters and Waterfall Economy
- If strict filtering is required (e.g. specific industries or headcounts), set `strictFilters: true` so Treg returns an unbilled 422 if a provider cannot filter, rather than paying for misaligned records.
- For bulk queries where you want to minimize fallback charges, set `stopOnFirstMiss: true` to halt the waterfall at the first miss.
- When an answer contains `ignoredFilters`, inspect and apply those filter constraints client-side before returning rows to the user.

### 4. Cost & Budget Awareness
- Always report the cost returned in `costUsd` to maintain transparency.
- Before running large batch operations (e.g., enriching 50 prospects), estimate the cost and set `maxCostUsd` if appropriate.
- Failed calls from providers (4xx / 5xx) are not billed.
- If repeating a call due to a transient network timeout, supply `idempotencyKey` so treg can return the cached result for 24h at zero cost.
- If an earlier paid call's response was lost, retrieve it with `growth_call_result` using the `callId` rather than re-running the query.
- When a result asks for a review or you observe notable accuracy/inaccuracy, submit a review using `growth_review`.

### 4. Delegation to Specialists
- For deep prospect research, market segmentation, and contact building: delegate to the `growth` specialist subagent.
- For in-depth keyword analysis, competitor SERP ranking tracking, and backlink audits: delegate to the `seo` specialist subagent.
- Quick single-lookups can be handled directly by the main agent.
