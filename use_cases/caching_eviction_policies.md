# Caching Eviction Policies — Web & API Use Cases

Five real-world web and API development use cases for each caching eviction policy.

---

## LRU (Least Recently Used)
*Evicts the entry that hasn't been accessed for the longest time*

All five use cases share naturally uneven access patterns where recent activity is a reliable proxy for future demand: active sessions, live queries, current tokens, and pages being browsed right now are all likely to be needed again soon, while anything untouched for a while almost certainly is not. LRU works well here because the working set shifts with user behaviour and recency cleanly tracks that shift.

1. **API response cache** — a REST API caches the JSON responses for its most frequently hit endpoints; when the cache fills, the endpoint whose response hasn't been requested in the longest time is evicted first, naturally keeping the hot routes resident and the cold ones out
2. **Database query result cache** — an ORM caches the results of parameterised queries by their SQL fingerprint; LRU eviction ensures that the queries driving active user sessions stay warm while queries from abandoned or one-off requests age out
3. **Authentication token introspection** — an API gateway caches the decoded claims from validated JWTs so it doesn't re-verify the signature on every request; LRU eviction means tokens belonging to inactive users are displaced by tokens for users currently making requests
4. **Rendered server-side pages** — a Next.js-style SSR cache holds the pre-rendered HTML for each route/param combination; pages that haven't been visited recently are evicted to make room for freshly requested ones, keeping the working set aligned with current traffic patterns
5. **GraphQL field resolver cache** — a GraphQL server caches the resolved value of expensive field resolvers keyed by parent ID; LRU eviction ensures that nodes actively being queried stay in memory while nodes from old or completed queries fall out

---

## LFU (Least Frequently Used)
*Evicts the entry accessed the fewest times; LRU used as a tiebreaker*

All five use cases involve a stable, long-term popularity hierarchy where a small set of entries genuinely dominates access volume over time: shared dependencies, popular search prefixes, high-volume event types. LFU works well here because frequency is a more durable signal than recency — the hot entries are hot day after day, not just in the last few seconds, so evicting by count is more accurate than evicting by age.

1. **Product recommendation cache** — a recommendations API caches personalised lists keyed by user ID; LFU eviction keeps the lists for users who frequently browse or revisit recommendations resident while one-time visitors' lists are evicted first
2. **Static asset manifest cache** — a build server caches file content hashes for assets; LFU eviction naturally retains the hashes for shared dependencies (lodash, React) that appear in many bundles while evicting hashes for rarely built one-off assets
3. **Autocomplete index cache** — a search API caches the result set for each prefix query (e.g. `"app"`, `"appl"`, `"apple"`); LFU eviction keeps the most commonly typed prefixes warm and evicts rare or mistyped prefixes that were only queried once
4. **Pricing rule cache** — a checkout API caches evaluated pricing rules (discounts, tax bands, shipping tiers) keyed by rule ID; popular rules applied to thousands of orders per day survive eviction while rules for discontinued promotions with a single historical hit do not
5. **Webhook payload schema cache** — an event processing API caches the parsed JSON schema for each event type it validates; LFU eviction retains schemas for high-volume event types (e.g. `order.created`) and evicts schemas for rarely emitted internal events

---

## FIFO (First In, First Out)
*Evicts the oldest inserted entry regardless of how often it was accessed*

All five are cases where insertion order correlates directly with relevance — the oldest entry is also the least useful, so FIFO is correct by nature rather than just cheap. Rate limit windows, OTPs, delivery attempt logs, and build records are all time-sequenced data where age alone determines whether an entry still matters, making access frequency irrelevant to the eviction decision.

1. **Rate limit window cache** — an API gateway stores per-client request counts in fixed time windows; FIFO eviction simply drops the oldest window slot as new ones are added, which is correct because old windows are always less relevant than new ones regardless of access frequency
2. **Short-lived OTP cache** — an auth service caches one-time passwords keyed by user ID with a fixed capacity; FIFO ensures that the oldest issued OTPs are evicted first, aligning eviction order with expiry order since OTPs are issued sequentially
3. **Webhook delivery attempt log** — an outbound webhook service keeps a bounded in-memory log of recent delivery attempts per endpoint; FIFO eviction drops the earliest attempt records as new ones arrive, naturally maintaining a rolling window of the most recent attempts
4. **Build artifact metadata cache** — a CI/CD API caches build metadata (status, duration, commit SHA) for recent pipeline runs; FIFO eviction removes the oldest build entries first, keeping the cache aligned with a chronological view of recent builds
5. **Cursor-based pagination cache** — an API caches the resolved page of results for each pagination cursor; FIFO eviction removes the earliest-issued cursors first, which is appropriate since clients paginating sequentially are unlikely to return to the first page after advancing far through a result set

---

## Random Replacement
*Evicts a randomly selected entry*

All five are cases where the access distribution is genuinely flat or close to uniform — static asset chunks, A/B variant assignments, thumbnails in a grid, DNS lookups across many hosts, feature flag evaluations across a large user base. When no entry is meaningfully hotter than any other, the bookkeeping cost of tracking recency or frequency buys nothing, and random eviction is the honest choice rather than a shortcut.

1. **Uniform static asset cache** — a CDN edge node caches hundreds of similarly sized, similarly requested JS chunk files from a code-split SPA; since all chunks have roughly equal access probability, random eviction performs as well as LRU with none of the bookkeeping overhead at high throughput
2. **A/B test variant cache** — an experimentation API caches the resolved variant assignment for each `(userId, experimentId)` pair; assignments are accessed at roughly equal frequency across experiments, making random eviction a low-overhead choice that avoids biasing any experiment's cache hit rate over another's
3. **Thumbnail image cache** — a media API caches resized image thumbnails for a large catalogue where all images receive roughly uniform traffic from a grid view; random eviction avoids the metadata cost of tracking recency or frequency across millions of entries while maintaining an acceptable hit rate
4. **DNS response cache on a proxy** — a forward proxy caches DNS lookups for outbound API calls; the target hostnames are a wide, flat distribution of third-party endpoints each called infrequently, so the access pattern is close to uniform and random eviction is a practical fit without skewed hotspots
5. **Feature flag evaluation cache** — a flag evaluation service caches the resolved boolean for each `(userId, flagKey)` combination; with thousands of flags and millions of users the key space is enormous and access is broadly uniform, making random eviction a low-cost strategy that avoids complex frequency tracking

---

## MRU (Most Recently Used)
*Evicts the most recently used entry — useful for sequential scan patterns*

All five are single-pass sequential scan patterns where each entry is read exactly once and then never needed again: log streaming, export pipelines, report generation, video transcoding, search indexing. MRU is the correct choice here — not a curiosity — because the most recently touched entry has just been fully consumed and is the safest thing to drop, while older entries still in cache are the ones yet to be processed.

1. **Log file streaming API** — an API streams log lines from a rolling set of log files; each file is read once sequentially from top to bottom and then never requested again, so the most recently accessed file is the safest to evict — it has just been fully consumed
2. **Database backup export endpoint** — an admin API reads database table pages sequentially to produce an export; MRU eviction prevents the sequential scan from flooding the cache with pages that will never be re-read, protecting the working set of the normal application queries
3. **Report generation pipeline** — a reporting API iterates through all user records once to generate a monthly summary; MRU eviction ensures that each user record is dropped from cache as soon as it has been processed, keeping memory free for the records still to be scanned
4. **Media transcoding job cache** — a video processing API reads each source video frame exactly once during a transcoding pass; MRU eviction discards the most recently decoded frame after it has been encoded into the output stream, since it will never be needed again in a single-pass pipeline
5. **Search index build cache** — a search indexer reads every document in the corpus once to build an inverted index; MRU eviction drops the most recently read document immediately after its tokens have been extracted, since the build process never revisits a document it has already indexed
