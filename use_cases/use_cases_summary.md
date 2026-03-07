# Use Cases Summary

## When to dig into each section

| Section | Dig in when… |
|---|---|
| **Buffering by Flush Trigger** | You have a producer adding items one at a time and a consumer that should receive them in batches — the open question is what causes the batch to go out |
| **Buffering by Structure** | The shape of memory itself is the constraint — you need overflow semantics, concurrent producer/consumer roles, or a non-destructive live view that a plain array cannot provide |
| **Buffering by Write Behaviour** | The question is what the act of writing means — what the caller is promised at write time, what is deferred, and what survives a failure |
| **Caching Eviction Policies** | Your cache has a bounded size and something must leave when it fills up — the question is which entry pays the price |
| **Caching Population Strategies** | You're asking about the full lifecycle of a cache entry — how it arrives, how it stays fresh, and what happens when it is written to |

---

## Buffering Strategies by Flush Trigger

**Size-Based Flush** — High-throughput ingestion scenarios where the cost being avoided is the per-item round-trip. The batch size is chosen to match the downstream system's sweet spot, not an arbitrary number.

**Time-Based Flush** — Scenarios where traffic can go quiet and a size threshold would never be reached. The interval cadence is tied to a meaningful downstream concern (scrape interval, session expiry, monitoring freshness) rather than being arbitrary.

**Threshold Flush** — Scenarios involving a hard capacity ceiling where overflow is genuinely harmful. The headroom is not just a nice-to-have — it is a correctness concern. This is what distinguishes threshold from size-based, where overflow is not a risk.

**Explicit / Manual Flush** — Cases where the caller has privileged knowledge about when flushing is correct: request lifecycle boundaries, transaction semantics, test teardown, graceful shutdown. An automatic trigger would either flush too early or at the wrong granularity.

**Event-Based Flush** — Stream-framing problems where the flush boundary is defined by the data itself — a `\n`, a chunk boundary, an end-of-message signal, a line ending. The trigger is semantic: it comes from the content of the stream, not from an external clock or a count of entries.

---

## Buffering Strategies by Structure

**Linear Buffer** — Straightforward accumulate-then-flush scenarios where the order of items matters and the full batch is always processed together. A plain array is the honest choice: items are collected sequentially and drained all at once, and anything more complex would be overhead for no benefit.

**Ring Buffer** — Continuous-stream scenarios where only the most recent N entries matter and dropping the oldest data when the buffer is full is the correct behaviour rather than an error condition. The fixed memory footprint is a deliberate requirement — the oldest data is always the least valuable.

**Double Buffer** — A producer and a consumer running at different speeds where neither can afford to wait for the other. A single shared buffer would require locking or force one side to stall; double buffering eliminates that by giving each role its own buffer at any moment, with the swap being the only synchronisation point.

**Triple Buffer** — Scenarios where the producer runs faster than the consumer and must never stall waiting for the consumer to finish reading. The third slot is the overflow valve — the producer can always write to it, and the consumer always picks up the latest completed result rather than a queued-up stale one.

**Sliding Window Buffer** — Time-series or sequence monitoring scenarios where only the most recent N entries are analytically meaningful and older entries are not just unneeded but actively wrong to include in calculations. Unlike a ring buffer, the window is read non-destructively — the semantics are about what is currently in view, not about what has been consumed.

---

## Buffering Strategies by Write Behaviour

**Write Buffer / Write Coalescing** — Scenarios where individual writes arrive far more frequently than the backing store can absorb them one at a time, and where the content of multiple writes can be legitimately merged without changing the observable outcome. The cost being eliminated is the per-write overhead — not the data itself, which is all eventually written.

**Write-Back Buffer** — Cases where the write path is on the critical latency path of the user experience and the caller cannot be made to wait for the backing store. The defining trade-off is explicit: immediate acknowledgement is worth the risk of losing the last few seconds of writes in a crash, because a slow or blocking write is worse for the product.

**Copy-on-Write Buffer** — Cases where a resource is read far more often than it is written, and making a full copy upfront for every consumer would be wasteful when most consumers never modify their copy. The copy is deferred to the moment it is actually needed, so the common read-only path pays nothing, and only the rare write path pays the copy cost.

**Journaling Buffer** — Cases where durability of intent matters more than durability of the final state. The journal is the source of truth for uncommitted work; the target store is a derived materialisation. Recovery means replaying the journal from the last checkpoint, not inspecting the target store.

---

## Caching Eviction Policies

**LRU (Least Recently Used)** — Naturally uneven access patterns where recent activity is a reliable proxy for future demand. The working set shifts with user behaviour and recency cleanly tracks that shift.

**LFU (Least Frequently Used)** — A stable, long-term popularity hierarchy where a small set of entries genuinely dominates access volume over time. Frequency is a more durable signal than recency — the hot entries are hot day after day, not just in the last few seconds, so evicting by count is more accurate than evicting by age.

**FIFO (First In, First Out)** — Cases where insertion order correlates directly with relevance — the oldest entry is also the least useful, so FIFO is correct by nature rather than just cheap. Age alone determines whether an entry still matters, making access frequency irrelevant to the eviction decision.

**Random Replacement** — Cases where the access distribution is genuinely flat or close to uniform. When no entry is meaningfully hotter than any other, the bookkeeping cost of tracking recency or frequency buys nothing, and random eviction is the honest choice rather than a shortcut.

**MRU (Most Recently Used)** — Single-pass sequential scan patterns where each entry is read exactly once and then never needed again. The most recently touched entry has just been fully consumed and is the safest thing to drop, while older entries still in cache are the ones yet to be processed.

---

## Caching Population Strategies

**Memoization** — Pure computational results where the same inputs always produce the same output and the function has no side effects. The result is not just reusable but permanently correct for a given input; there is no staleness concern and no need to ever invalidate, only to evict when memory is needed.

**TTL (Time To Live)** — Cases where data changes occasionally but not constantly, and a bounded period of staleness is an acceptable trade-off for the performance gain. The TTL length is chosen to match the natural change cadence of the data, making expiry the primary consistency mechanism rather than an active invalidation signal.

**Refresh-Ahead** — High-traffic or latency-sensitive reads where even a single cache miss at the wrong moment is unacceptable. The data does need to stay fresh (ruling out memoization) but the cost of a miss is too high to leave to chance (ruling out TTL alone).

**Cache-Aside (Lazy Loading)** — Cases where only a fraction of the possible key space is ever actually requested, so pre-populating the cache would waste memory and the miss penalty on first access is tolerable. The cache naturally prioritises itself around real usage without the application ever needing to know the full set of possible keys upfront.

**Read-Through** — Cases where the calling code should have no awareness of whether it is reading from cache or from the backing store. The miss-and-populate logic is identical every time, belongs to the data access layer, and would be noise if scattered across every call site in the application.

**Write-Through** — Cases where a write made by one part of the system must be immediately visible to reads from any other part. Write-through is the right choice when the cost of serving a stale read after a write is higher than the cost of the synchronous dual-write.

**Write-Through + TTL** — Cases involving two distinct sources of change: writes the server controls (handled by write-through) and changes that happen outside the API layer (handled by TTL). The combination is necessary precisely because neither mechanism is sufficient on its own.

**Event-Driven Invalidation** — Cases where the source of truth lives in a different service than the one caching it, and that source emits change events. TTL would either be too slow or too aggressive. Event-driven invalidation is the right fit when the change cadence is unpredictable, the staleness window must be near-zero, and the owning system can reliably publish what changed.

**Write-Behind (Write-Back)** — High-frequency write scenarios where acknowledging every individual write synchronously to the database would be prohibitively slow or wasteful. The write volume far exceeds what the database can absorb one row at a time, and the data does not need to be durable at the instant it is written; losing the last few seconds of writes in a crash is an acceptable trade-off for the throughput gain.
