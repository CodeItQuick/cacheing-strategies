# Caching Population Strategies — Web & API Use Cases

Five real-world web and API development use cases for each caching population strategy.

---

## Memoization
*Same inputs always return the cached output in-process*

All five are pure computational results where the same inputs always produce the same output and the function has no side effects — rendered HTML, compiled regex, resolved permission combinations, conversion factors, compiled templates. Memoization works here because the result is not just reusable but permanently correct for a given input; there is no staleness concern and no need to ever invalidate, only to evict when memory is needed.

1. **Markdown rendering** — a blog API converts raw markdown to HTML on request; the same post body always produces the same HTML, so the result is memoized by a hash of the content and skips re-parsing on subsequent calls
2. **Permission matrix evaluation** — an RBAC middleware computes whether a role can perform an action on a resource type (e.g. `canDo('editor', 'DELETE', 'post')`); the input set is small and deterministic, so every resolved combination is memoized for the lifetime of the process
3. **Route regex compilation** — an API router compiles path patterns like `/users/:id/posts` into regex objects on first match; the compiled regex is memoized by pattern string so it is never recompiled across requests
4. **Currency conversion factor** — a pricing API applies a conversion multiplier from a fixed exchange rate table; the calculation for a given `(fromCurrency, toCurrency)` pair is memoized since the rate table is loaded once at startup
5. **Template rendering** — a server-side HTML templating engine memoizes the compiled form of each template file by its path so repeated requests to the same page skip the parse-and-compile step

---

## TTL (Time To Live)
*Entries expire after a fixed duration, forcing a fresh fetch*

All five are cases where the data changes occasionally but not constantly, and a bounded period of staleness is an acceptable trade-off for the performance gain. The TTL length in each case is chosen to match the natural change cadence of the data — minutes for a user profile, seconds for a feature flag, hours for a country lookup — making expiry the primary consistency mechanism rather than an active invalidation signal.

1. **User profile data** — an API caches user name, avatar, and bio for 5 minutes; most reads hit cache, and the worst-case staleness (a recently updated bio not showing) is acceptable for low-sensitivity display data
2. **Feature flags** — a feature flag service response is cached with a 30-second TTL; the app tolerates a brief delay before picking up a newly toggled flag, avoiding a remote call on every request
3. **Third-party API responses** — a weather widget on a dashboard caches the external weather API response for 10 minutes; it stays within the third-party rate limit while keeping data reasonably fresh
4. **Search autocomplete suggestions** — popular search terms and their completions are cached with a 1-minute TTL; suggestions feel instant and the index only needs to be queried when the cache expires
5. **Country/region lookup** — an API resolves a user's IP address to a country on login and caches the result with a 24-hour TTL; the data is stable enough that near-permanent caching is safe with a long TTL as the safety net

---

## Refresh-Ahead
*Cache proactively refreshes entries before they expire so no caller ever waits*

All five are high-traffic or latency-sensitive reads where even a single cache miss at the wrong moment is unacceptable — a key rotation stalling token validation, a product query blocking a checkout, a billing roundtrip during a feature gate check. Refresh-ahead is the right choice here because the data does need to stay fresh (ruling out memoization) but the cost of a miss is too high to leave to chance (ruling out TTL alone).

1. **Auth token validation** — a gateway caches the public keys from an OAuth provider's JWKS endpoint; a background job refreshes the key set a few seconds before the cached response expires, so token validation never stalls on a key rotation
2. **Product catalogue** — a high-traffic e-commerce API caches the full product list; a background refresh fires when the entry is 80% through its TTL, so inventory counts and prices are almost always current without any request ever waiting on a database query
3. **Configuration from a remote config service** — a microservice fetches its runtime config (feature toggles, rate limits, tier rules) from a central config service; refresh-ahead keeps the in-memory copy current without any request ever triggering a remote call
4. **Sports or election results feed** — a media API caches the latest scores or vote counts from an upstream aggregator and pre-fetches before expiry during peak traffic, ensuring zero-latency reads during the busiest moments
5. **Session-adjacent user entitlements** — a subscription API caches a user's current plan and feature entitlements; a background refresh fires as the TTL approaches so feature gate checks always resolve from memory without a billing system roundtrip

---

## Cache-Aside (Lazy Loading)
*App checks cache first; on a miss the app fetches and stores the result manually*

All five are cases where only a fraction of the possible key space is ever actually requested, so pre-populating the cache would waste memory and the miss penalty on first access is tolerable. Cache-aside naturally prioritises itself around real usage — hot sessions, popular products, common filter combinations — without the application ever needing to know the full set of possible keys upfront.

1. **User session data** — an API checks Redis for a session object by token; on a miss it queries the database, stores the result with a TTL, and serves the response — hot sessions stay in cache, stale ones are never loaded
2. **Product detail pages** — a `GET /products/:id` handler checks cache before hitting the database; the product is only cached after the first request for it, so cold products never consume cache space
3. **Paginated query results** — a list endpoint caches the result set for a specific page/filter combination by its query fingerprint; the cache is only populated on actual requests, naturally prioritising the most-used filter combinations
4. **Computed analytics summaries** — a dashboard endpoint aggregates rows from a reporting database into a summary object; the first request pays the full query cost and warms the cache, subsequent requests within the TTL window are instant
5. **Translated content** — a localisation middleware checks cache for a `(key, locale)` pair before calling the translation service; only requested translations are ever loaded, keeping memory usage proportional to actual usage patterns

---

## Read-Through
*Cache sits in front of a backing store; on a miss the cache fetches and populates itself automatically*

All five are cases where the calling code should have no awareness of whether it is reading from cache or from the backing store — the cache is an infrastructure concern, not an application concern. Read-through works here because the miss-and-populate logic is identical every time, belongs to the data access layer, and would be noise if scattered across every call site in the application.

1. **ORM second-level cache** — a data access layer wraps all entity reads through a cache; the application calls `repo.find(id)` without knowing whether the result comes from memory or the database — the cache layer owns the miss-and-populate logic entirely
2. **CDN for API responses** — a CDN like CloudFront sits in front of a REST API and caches GET responses by URL; the origin server is only hit on a cache miss, and the CDN automatically serves subsequent requests from its edge cache
3. **Distributed session store** — a session middleware transparently fetches session data from Redis on a miss, populates the local in-memory cache, and serves subsequent reads from memory — the caller just calls `session.get(key)` with no branching logic
4. **Media metadata** — a media API wraps all calls to an external metadata provider (IMDB, Spotify) behind a read-through cache keyed by content ID; the API client never calls the provider directly, and the cache self-populates on first access
5. **Geolocation enrichment** — a request enrichment middleware resolves IP-to-location through a read-through cache backed by a MaxMind database; every handler receives `req.geo` without knowing whether it was a cache hit or a live lookup

---

## Write-Through
*Every write goes to the cache and the backing store simultaneously*

All five are cases where a write made by one part of the system must be immediately visible to reads from any other part — a preferences update visible on the next GET, a stock decrement visible on the next product page load, a rate limit increment visible before the next request arrives. Write-through is the right choice when the cost of serving a stale read after a write is higher than the cost of the synchronous dual-write.

1. **User preferences** — a `PATCH /users/:id/preferences` endpoint writes to both the database and the cache atomically; any subsequent GET sees the updated preferences immediately without a stale read window
2. **Inventory quantity** — an order API decrements stock count in the database and cache in the same write operation; a product page reading stock always reflects the latest deduction without a cache invalidation step
3. **Shopping cart** — a cart API writes item additions and removals to both a database and a cache simultaneously; cart reads are always consistent and fast even under high concurrency
4. **DNS record management** — a DNS management API writes a new A record to both the authoritative store and a local resolution cache simultaneously; internal services picking up the new hostname see it immediately without waiting for propagation
5. **Rate limit counters** — an API gateway increments a per-user request counter in both an in-memory cache and a persistent store on every request; this means the accurate count survives a process restart without the gateway needing a warm-up period after a deploy

---

## Write-Through + TTL
*Write-through for server-initiated changes; TTL catches changes the server didn't cause*

All five involve two distinct sources of change: writes the server controls (a token being issued, a suspension being applied, a price override being set) and changes that happen outside the API layer (a token expiring by time, a compliance job updating status, a promotion ending on a schedule). Write-through alone handles the first; TTL is the safety net for the second. The combination is necessary precisely because neither mechanism is sufficient on its own.

1. **OAuth access tokens** — an auth server writes a newly issued token to both the token store and the cache on issue; the TTL matches the token's expiry so the cache self-invalidates when the token becomes invalid, even if the client never explicitly revokes it
2. **User account status** — an admin API writes account suspensions to both the database and cache immediately so enforcement is instant; the TTL covers the edge case where a user's status changes via a background compliance job that bypasses the API layer
3. **Price overrides** — a pricing API writes a promotional price to cache and the database simultaneously so every request sees the sale price instantly; the TTL ensures the override self-expires at the promotion end time even if the scheduled cleanup job fails
4. **CMS published content** — a headless CMS writes a newly published article to cache and the backing store at publish time; the TTL catches the case where an author edits a draft directly in the database without going through the publish API
5. **Device pairing status** — a mobile API writes a confirmed device pairing to cache and the database immediately; the TTL ensures a stale pairing is re-verified after a period even if the device never explicitly calls an unpair endpoint

---

## Event-Driven Invalidation
*Cache is updated reactively by push events from the source*

All five are cases where the source of truth for a piece of data lives in a different service or system than the one caching it, and that source emits change events. TTL would either be too slow (a revoked permission still being honoured for minutes) or too aggressive (flushing valid cached data unnecessarily). Event-driven invalidation is the right fit when the change cadence is unpredictable, the staleness window must be near-zero, and the owning system can reliably publish what changed.

1. **Microservice data ownership** — a user service publishes a `user.updated` event to a message bus whenever a profile changes; downstream services (billing, notifications, recommendations) each hold a local cache of user data and subscribe to the event to invalidate or refresh their copy
2. **Inventory across warehouses** — a warehouse management system emits a `stock.adjusted` event whenever a fulfilment centre updates a quantity; the product API's cache entry for that SKU is invalidated immediately rather than waiting for a TTL to expire
3. **WebSocket-connected dashboards** — an analytics dashboard holds cached metric summaries in memory; a Kafka consumer listens for `metric.updated` events and pushes invalidations to the in-process cache so the next read fetches fresh aggregates from the database
4. **Permission changes** — an identity service emits a `role.revoked` event when an admin removes a user's access; API gateways and resource servers subscribe and immediately drop the cached permission set for that user, rather than waiting up to a TTL for the change to take effect
5. **Search index freshness** — an e-commerce search layer caches query results; a `product.updated` event from the catalogue service triggers targeted invalidation of any cached query whose result set includes that product ID, keeping search results accurate without polling

---

## Write-Behind (Write-Back)
*Writes go to cache immediately; the backing store is updated asynchronously in batches*

All five are high-frequency write scenarios where acknowledging every individual write synchronously to the database would either be prohibitively slow or wasteful — view counts, leaderboard scores, reaction counters, audit events. The common thread is that the write volume far exceeds what the database can absorb one row at a time, but the data does not need to be durable at the instant it is written; losing the last few seconds of counts or events in a crash is an acceptable trade-off for the throughput gain.

1. **Click and view tracking** — a content API increments view counts in-memory immediately so analytics feel real-time; a background job flushes accumulated counts to the database in batches every few seconds, turning millions of individual increments into a handful of bulk updates
2. **Real-time leaderboards** — a gaming API updates a player's score in cache on every game event so the leaderboard reads are always instant; the database is updated asynchronously in batches, avoiding a write-per-event at high throughput
3. **Like and reaction counts** — a social API acknowledges a like immediately from cache; the actual database row is updated in a batched flush every few seconds, collapsing hundreds of concurrent reactions into a single `UPDATE counter = counter + N` statement
4. **Audit log ingestion** — an API writes audit events (logins, permission checks, data access) to an in-memory buffer immediately so the request path is never blocked by a slow audit database; a background worker drains the buffer to a write-optimised append-only log store periodically
5. **Shopping cart auto-save** — a cart API acknowledges every item change from cache instantly so the UI feels responsive; the database is only updated when the user checks out or a write-behind flush fires, avoiding a round-trip to the database on every drag-and-drop
