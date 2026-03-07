# Buffering Strategies by Write Behaviour — Web & API Use Cases

Five real-world web and API development use cases for each write behaviour strategy.

---

## Write Buffer / Write Coalescing
*Batches multiple small writes into one larger write — reduces I/O syscall overhead*

All five are scenarios where individual writes arrive far more frequently than the backing store can or should absorb them one at a time, and where the content of multiple writes can be legitimately merged into a single operation without changing the observable outcome. The cost being eliminated is the per-write overhead — network round-trips, syscalls, transaction starts — not the data itself, which is all eventually written.

1. **Structured log aggregation** — a Node.js API accumulates individual log lines in a write buffer as requests are handled; the buffer is flushed as a single bulk payload to a log aggregator (Datadog, Splunk) every few seconds, turning thousands of per-request write calls into a handful of batched network sends
2. **Time-series metric writes** — a metrics collection agent receives counter and gauge updates from instrumented code on every function call; the agent coalesces all updates for the same metric key within a flush window into a single aggregated data point before writing to InfluxDB or Prometheus, collapsing many increments into one
3. **DOM patch batching** — a server-side rendering API accumulates virtual DOM mutations triggered by state changes and coalesces them into a single patch before serialising the updated HTML; applying all mutations in one pass avoids recalculating layout for each individual change
4. **Database update coalescing** — an API receives frequent partial updates to the same row (a `lastSeen` timestamp, an `updatedAt` field, a running total); a write buffer deduplicates by primary key and flushes only the final state of each row, turning N updates to the same record into a single `UPDATE` statement
5. **Outbound HTTP request batching** — a microservice calls a downstream analytics API with individual event objects as they are generated; a write-coalescing buffer accumulates events and issues a single `POST` with an array payload every 500ms, reducing the number of HTTP connections by an order of magnitude at high throughput

---

## Write-Back Buffer
*Writes are acknowledged immediately from the buffer; the actual write to the backing store happens later*

All five are cases where the write path is on the critical latency path of the user experience — a keypress, a checkout acknowledgement, a reaction button, a score update — and the caller cannot be made to wait for the backing store. The defining trade-off in each case is explicit: immediate acknowledgement is worth the risk of losing the last few seconds of writes in a crash, because the alternative (a slow or blocking write) is worse for the product.

1. **Note-taking auto-save** — a collaborative notes API acknowledges every keystroke immediately from an in-memory write-back buffer so the UI never lags; the actual disk or database write happens asynchronously in the background on a flush interval, keeping the editing experience instant even when the persistence layer is slow
2. **Shopping cart persistence** — a cart API confirms every item add, remove, and quantity change instantly from the buffer so the UI stays responsive during rapid interactions; the database row is only updated when the user proceeds to checkout or the write-back flush fires, avoiding a round-trip per drag-and-drop
3. **Like and reaction counter** — a social API acknowledges a like or emoji reaction immediately from a counter held in the write-back buffer so the UI increments without a round-trip; the database `UPDATE reactions = reactions + N` is issued asynchronously in a batched flush, collapsing burst interactions into a single write
4. **Player score update** — a gaming API posts a score change to an in-memory write-back buffer and responds to the client instantly so the game loop is never blocked by a database write; the leaderboard database is updated asynchronously, and the in-memory value is always authoritative for reads until the flush completes
5. **Search index bookmark** — a search API records a user's saved search or bookmarked result in a write-back buffer and returns a success response immediately; the bookmark is persisted to the database asynchronously, keeping the perceived save latency near zero even when the database is under load

---

## Copy-on-Write Buffer
*Buffer is shared until a write occurs, at which point a private copy is made — avoids upfront copying*

All five are cases where a resource is read far more often than it is written, and making a full copy upfront for every consumer would be wasteful when most consumers never modify their copy. The copy is deferred to the moment it is actually needed, so the common read-only path pays nothing, and only the rare write path pays the copy cost.

1. **Process forking for request isolation** — a Node.js API server forks a child process to handle an untrusted or resource-intensive request; the parent and child initially share the same memory pages for their configuration, module cache, and read-only data — the OS copies only the pages the child actually writes to, avoiding a full upfront clone of the process heap
2. **Snapshot isolation for concurrent reads** — a database query cache serves the same in-memory result object to multiple concurrent API requests; if a background refresh needs to update the cached object it writes to a private copy while in-flight readers continue reading the original, eliminating read/write contention without a lock
3. **Configuration hot-reload** — a microservice holds its runtime configuration as a shared reference; when a config change arrives the reload handler makes a private copy of the config object, applies the changes to the copy, and then atomically swaps the reference — requests in-flight against the old config continue reading it undisturbed
4. **Immutable API response assembly** — a GraphQL API assembles a base response object shared across multiple concurrent field resolvers; each resolver that needs to annotate or extend the response works on its own copy, leaving the shared base untouched and avoiding defensive copying in resolvers that only read
5. **Git-style branch buffer** — a feature flag management API holds the current flag state as a shared baseline; when an operator previews a change, the preview session receives a copy-on-write fork of the flag set and can modify flags freely without affecting the live state seen by other API consumers until the change is explicitly committed

---

## Journaling Buffer
*Writes are logged to a sequential buffer first for crash recovery before being applied to the target*

All five are cases where durability of intent matters more than durability of the final state — the system needs to be able to reconstruct what was supposed to happen even if it crashes mid-operation. The journal is the source of truth for uncommitted work; the target store is a derived materialisation. Recovery means replaying the journal from the last checkpoint, not inspecting the target store.

1. **Write-ahead log for a database API** — a database API appends every `INSERT`, `UPDATE`, and `DELETE` operation to an on-disk journal before applying it to the table files; on restart after a crash, the journal is replayed from the last checkpoint to re-apply any operations that were logged but not yet reflected in the table — the journal guarantees no committed write is silently lost
2. **Distributed transaction coordinator** — a two-phase commit coordinator journals its `PREPARE`, `COMMIT`, and `ABORT` decisions before sending them to participants; if the coordinator crashes between phases, it recovers its intent from the journal on restart and re-sends the correct message to each participant rather than leaving the transaction in an ambiguous state
3. **File system metadata journal** — an API that manages a virtual file system journals every rename, create, and delete operation before updating the directory tree; a crash during a rename that left the old and new names both present is resolved on recovery by replaying the journal entry, completing or rolling back the operation to a consistent state
4. **Event sourcing command log** — a CQRS API appends every validated command (e.g. `TransferFunds`, `PlaceOrder`) to an append-only journal before projecting its effects onto the read model; if the read model becomes corrupted or needs to be rebuilt, the journal is replayed from the beginning to reconstruct the full state from first principles
5. **Configuration change audit trail** — a config management API appends every proposed change to a journal before applying it to the live config store; an operator can checkpoint once a change has been validated in production, and a failed or partial apply is recovered by replaying the journal from the last checkpoint rather than attempting to diff the live state against a desired state
