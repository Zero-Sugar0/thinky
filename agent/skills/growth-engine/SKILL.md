---
name: growth-engine
description: Use Growth Engine tools (growth_search, growth_inspect, growth_call) to access 4,100+ endpoints across 123+ providers for B2B leads, prospect discovery, email and phone enrichment, SEO, SERP rankings, backlinks, company signals, social profiles, and web data.
---

# Growth Engine Skill

Growth Engine connects your agent to over 4,100 API endpoints across 123+ providers for market intelligence, B2B lead generation, enrichment, and SEO.

## Available Tools

1. **`growth_search`**: Search the tool catalog by the job you want done.
   - Example queries:
     - `"find leads by job title and company"`
     - `"google serp organic search"`
     - `"verify email address deliverability"`
     - `"find backlinks for domain"`
     - `"enrich company by domain"`
     - `"tiktok profile and trends"`
2. **`growth_inspect`**: Inspect an endpoint by its tool ID.
   - Returns input parameters, pricing model, required vs. optional fields, and ready-to-use call templates.
3. **`growth_call`**: Execute any tool endpoint.
   - Accepts `toolId`, `method`, `query`, `data` (JSON body), optional `maxCostUsd` ceiling, and `idempotencyKey`.
   - Returns execution data, HTTP status, provider info, and exact cost in USD (`costUsd`).

---

## The Workflow: Search, Inspect, Call

### Step 1: Search by the job, not the vendor
Do not assume who provides what data. Search by the job:
```json
{
  "query": "find email from name and company domain"
}
```

### Step 2: Inspect if inputs or prices are unfamiliar
Call `growth_inspect` with the endpoint ID:
```json
{
  "toolId": "treg.people.email.find"
}
```
This shows what fields are accepted (e.g. `{ "first_name": "...", "last_name": "...", "domain": "..." }`) and whether it is a routed capability.

### Step 3: Call the tool
Call `growth_call` with the appropriate parameters:
```json
{
  "toolId": "treg.people.email.find",
  "method": "POST",
  "data": {
    "first_name": "Satya",
    "last_name": "Nadella",
    "domain": "microsoft.com"
  }
}
```

---

## Best Practices & Operating Rules

### 1. Prefer Routed Capabilities (`treg.<job>`)
For standard tasks, prefer the routed capability over individual vendor endpoints:
- **People & Leads**: `treg.people.search`, `treg.people.email.find`, `treg.people.email.verify`, `treg.people.phone.find`
- **Companies**: `treg.companies.search`, `treg.companies.enrich`, `treg.companies.similar`
- **SEO & Search**: `treg.google.serp.organic`, `treg.google.serp.maps`, `treg.web.search`
- **Web Scraping**: `treg.web.extract`

Why? Routed capabilities try the team's key first, pick the cheapest and most reliable provider, handle automatic fallbacks on failure, and only bill when a valid result is returned.

### 2. Verify Contacts Before Recommending Outreach
- An email found by a provider is an algorithmic match, not guaranteed deliverability.
- If finding contacts, always run verification (`treg.people.email.verify`) or inspect `domainMatch` to confirm the mailbox actually matches the target company domain.

### 3. Cost & Budget Awareness
- Always report the cost returned in `costUsd` to maintain transparency.
- Before running large batch operations (e.g., enriching 50 prospects), estimate the cost and set `maxCostUsd` if appropriate.
- Failed calls from providers (4xx / 5xx) are not billed.
- If repeating a call due to a transient network timeout, supply `idempotencyKey` so treg can return the cached result for 24h at zero cost.

### 4. Delegation to Specialists
- For deep prospect research, market segmentation, and contact building: delegate to the `growth` specialist subagent.
- For in-depth keyword analysis, competitor SERP ranking tracking, and backlink audits: delegate to the `seo` specialist subagent.
- Quick single-lookups can be handled directly by the main agent.
