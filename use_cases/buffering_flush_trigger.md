# Buffering Strategies by Flush Trigger — Web & API Use Cases

Five real-world web and API development use cases for each flush trigger strategy.

---

## Size-Based Flush
*Flushes when the buffer reaches a fixed number of entries*

All five use cases are high-throughput ingestion scenarios where the cost being avoided is the per-item round-trip: database inserts, webhooks, search indexing, email, analytics. The batch size in each case is chosen to match the downstream system's sweet spot, not an arbitrary number.

1. **Bulk database inserts** — an API receives a high volume of individual event records (clicks, sensor readings, form submissions); each record is added to an in-memory buffer and the buffer flushes a single `INSERT ... VALUES (...)` statement to the database once 500 rows have accumulated, reducing round-trips from one per event to one per 500
2. **Outbound webhook batching** — a platform buffers outgoing webhook payloads per destination URL; once 100 payloads are queued for the same endpoint the buffer flushes a single batched HTTP request, keeping the number of outbound connections bounded regardless of inbound event rate
3. **Search index document ingestion** — a content management API buffers newly published documents before sending them to a search engine like Elasticsearch; the buffer flushes a bulk index request once 50 documents have been staged, matching the search engine's preferred batch size for efficient segment creation
4. **Email queue batching** — a transactional email service buffers outgoing messages and flushes them to an SMTP relay or sending API (SendGrid, SES) in batches of 25; this keeps the number of API calls proportional to volume rather than issuing one call per message at high throughput
5. **Analytics event pipeline** — a client-side SDK buffers user interaction events (page views, clicks, conversions) in memory and flushes them to the analytics ingestion endpoint once 20 events have been collected, reducing the number of network requests from the browser while keeping payload sizes manageable

---

## Time-Based Flush
*Flushes on a fixed interval regardless of how full the buffer is*

All five are scenarios where traffic can go quiet and a size threshold would never be reached: log shipping, metrics reporting, health broadcasts, session heartbeats, cache warming. The interval cadence in each case is tied to a meaningful downstream concern (scrape interval, session expiry, monitoring freshness) rather than being arbitrary.

1. **Application log shipping** — a Node.js API buffers structured log lines in memory and flushes them to a log aggregator (Datadog, Splunk, CloudWatch) every 5 seconds; the interval ensures that logs are never silently stuck in memory during quiet periods when the size-based threshold would never be reached
2. **Metrics reporting** — a service buffers internal counters and gauges (request count, error rate, p99 latency) and flushes the aggregated snapshot to a time-series database (Prometheus pushgateway, InfluxDB) every 10 seconds, aligning the flush cadence with the scrape interval
3. **Database connection health broadcast** — a connection pool manager buffers health status updates (active connections, queue depth, wait time) and flushes the current state to a shared monitoring endpoint every 30 seconds so dashboards always reflect a recent snapshot without polling on every request
4. **Session activity heartbeat** — an API server buffers `lastSeen` timestamp updates for active sessions rather than writing to the database on every request; a time-based flush every 60 seconds persists the latest timestamp in bulk, reducing write pressure on the sessions table during high-concurrency periods
5. **Cache warming queue** — a background service buffers keys that have been observed as cache misses and flushes the list to a pre-warming job every 15 seconds; the interval ensures the warming job runs regularly even during traffic lulls when the miss count would never reach a size threshold

---

## Threshold Flush
*Flushes when a percentage of capacity is reached (e.g. 75% full)*

All five involve a hard capacity ceiling where overflow is genuinely harmful: packet loss, OS write buffer overflow, dropped rate limit events, a blocked Kafka producer thread. The headroom is not just a nice-to-have — it is a correctness concern. This is what distinguishes threshold from size-based, where overflow is not a risk.

1. **Network packet buffer** — an API gateway buffers outbound TCP packets for a downstream service and flushes at 75% capacity; the headroom absorbs sudden bursts without hitting the hard MTU limit, trading slightly smaller batches for a lower risk of packet loss under spike traffic
2. **Memory-mapped write buffer** — a high-throughput API writes to a fixed-size memory-mapped file buffer for durability; flushing at 80% capacity ensures the OS always has room to accept an unexpected burst of writes before the next flush completes, preventing buffer overflow under load
3. **Rate limiter token replenishment queue** — a distributed rate limiter buffers token replenishment operations per client before flushing them to Redis; flushing at 70% capacity provides a safety margin so a sudden wave of requests never causes the buffer to overflow and drop replenishment events
4. **Message broker producer buffer** — a Kafka producer SDK buffers outgoing messages before sending a batch to the broker; threshold-based flushing at 75% keeps average batch sizes large for throughput while leaving enough headroom that a brief broker slowdown does not cause the local buffer to fill and block the application thread
5. **Streaming response buffer** — an API endpoint streams a large JSON array to the client by buffering serialised chunks; flushing at 80% of the chunk buffer's capacity ensures the response stream flows steadily without stalling, while keeping the final flush small enough that the last write completes quickly

---

## Explicit / Manual Flush
*Caller decides when to flush — nothing automatic*

All five are cases where the caller has privileged knowledge about when flushing is correct: request lifecycle boundaries, transaction semantics, test teardown, graceful shutdown. An automatic trigger would either flush too early or at the wrong granularity.

1. **End-of-request log flush** — a web framework buffers all log lines emitted during a single request handler and flushes them as a single structured batch at the exact moment the response is sent; the caller (the request lifecycle hook) controls flush timing precisely, keeping all log lines for one request atomic in the output
2. **Database transaction boundary** — an ORM buffers all pending SQL statements for a unit of work and flushes (commits) them only when the caller explicitly calls `transaction.commit()`; nothing is written to the database until the caller is certain all operations in the transaction are correct
3. **Test teardown flush** — a test suite accumulates side-effect records (emails sent, audit events emitted, background jobs enqueued) in an in-memory buffer during each test; an explicit flush in the `afterEach` hook drains the buffer to an assertion-friendly array, giving the test full control over when to inspect and reset state
4. **CLI command output** — a command-line API tool buffers its output lines during a long-running operation and flushes them to stdout only when the user presses a key or the command reaches a natural checkpoint; this prevents interleaved output when multiple subcommands run concurrently while giving the caller control over display timing
5. **Graceful shutdown drain** — an API server buffers in-flight telemetry, audit events, and buffered writes during normal operation; on receiving `SIGTERM` the shutdown handler explicitly flushes all buffers before the process exits, guaranteeing no data is silently lost during a rolling deploy or container restart

---

## Event-Based Flush
*Flushes when a specific event occurs (e.g. newline character, end of request)*

All five are stream-framing problems where the flush boundary is defined by the data itself — a `\n`, a chunk boundary, an end-of-message signal, a line ending. The key distinction from the other strategies is that the trigger is semantic: it comes from the content of the stream, not from an external clock or a count of entries.

1. **Newline-delimited log streaming** — a log processing API accumulates incoming bytes from a TCP stream and flushes a complete log record to the parser each time a `\n` character is detected; this ensures the downstream parser always receives whole lines rather than arbitrary byte chunks split across TCP segments
2. **HTTP chunked response boundary** — an API proxying a slow upstream service buffers response bytes and flushes each chunk to the client when the upstream sends a chunk boundary marker; the client receives data progressively without the proxy buffering the entire response body in memory first
3. **WebSocket message framing** — a WebSocket server buffers outgoing data fragments and flushes a complete frame to the client when the application signals end-of-message; this allows large messages to be assembled from smaller application writes without sending an under-filled frame on every call
4. **CSV row detection** — a data import API buffers incoming bytes from a file upload stream and flushes one complete CSV row to the row processor each time a `\r\n` line ending is encountered; the processor always receives exactly one well-formed record regardless of how the upload stream segments the bytes
5. **End-of-request audit flush** — a middleware buffers all security-relevant events (auth checks, permission decisions, data access) that occur during a request and flushes the complete set to the audit log in a single write when the response is finalised; flushing on the request-end event keeps all audit entries for one request together as an atomic unit rather than writing them one by one mid-request
