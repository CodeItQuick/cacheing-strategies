# Buffering Strategies by Structure — Web & API Use Cases

Five real-world web and API development use cases for each buffer structure.

---

## Linear Buffer
*Simple array or queue — fills from one end, drains from the other*

All five are straightforward accumulate-then-flush scenarios where the order of items matters and the full batch is always processed together. A plain array is the honest choice here: there is no need for pointer arithmetic, overwrite semantics, or concurrent access from two roles — items are collected sequentially and drained all at once, and anything more complex would be overhead for no benefit.

1. **Request audit log** — a middleware accumulates one audit entry per inbound request into a linear buffer throughout a request batch; at the end of each batch window the entire array is flushed as a single bulk insert to the audit database, preserving arrival order in the written log
2. **Email dispatch queue** — a notification service pushes outgoing email payloads into a linear buffer as user actions trigger them; at flush time the full array is handed to the email provider's batch send API in one call, keeping the order of notifications consistent with the order of the triggering events
3. **Outbound message accumulator** — a chat API collects messages destined for the same WebSocket connection into a linear buffer during a processing tick; the buffer is drained in a single `send()` call at the end of the tick, avoiding a separate write syscall per message
4. **ETL staging buffer** — a data pipeline reads rows from a source database and appends them to a linear buffer until the batch size target is met; the buffer is then flushed as a single bulk `INSERT` to the target warehouse, turning many row-level reads into one efficient write
5. **Server-sent event queue** — an SSE endpoint accumulates events emitted during a single server-side operation into a linear buffer; once the operation completes the buffer is flushed to the response stream in order, ensuring the client receives events in the same sequence they were generated

---

## Ring Buffer (Circular Buffer)
*Fixed-size structure where new data overwrites the oldest when full — used in logs and streams*

All five are continuous-stream scenarios where only the most recent N entries matter and dropping the oldest data when the buffer is full is the correct behaviour rather than an error condition. The fixed memory footprint is also a deliberate requirement in each case — the system cannot afford to let the buffer grow unboundedly, and the oldest data is always the least valuable.

1. **Rolling application log** — a Node.js API keeps the last 1,000 log lines in a ring buffer in memory; when an error occurs a support endpoint exposes the buffer contents as a diagnostic snapshot, giving the most recent context without ever writing to disk or growing without bound
2. **API request rate monitor** — an API gateway records the timestamp of each inbound request in a ring buffer of fixed size; a monitoring endpoint counts how many entries fall within the last 60 seconds to report a rolling requests-per-minute rate without allocating new memory per request
3. **Audio stream jitter buffer** — a WebRTC media server buffers incoming audio packets in a ring buffer sized to the jitter tolerance; if a burst of late packets would overflow the buffer, the oldest (already-played) packets are silently overwritten since they are no longer needed
4. **Debug trace circular log** — a background worker keeps a ring buffer of the last 500 operations it performed; in a stuck-process diagnostic the buffer is dumped to reveal exactly what the worker was doing before it stalled, with no risk of the trace log growing to fill the disk
5. **Sensor telemetry stream** — an IoT gateway buffers the last 60 seconds of temperature readings from a device in a ring buffer; a polling endpoint reads the snapshot to plot a live sparkline, and if the device sends faster than the consumer polls, only the freshest readings survive

---

## Double Buffer
*Two buffers alternate — one fills while the other is consumed, eliminating wait time*

All five involve a producer and a consumer running at different speeds or on different threads where neither can afford to wait for the other. A single shared buffer would require locking or would force one side to stall; double buffering eliminates that by giving each role its own buffer at any moment, with the swap being the only synchronisation point.

1. **Log batching with async flush** — a high-throughput API writes log lines to the back buffer on every request; a background flush worker drains the front buffer to the log aggregator without blocking the request path — when the flush completes, the buffers swap and the next batch begins accumulating immediately
2. **Database write coalescing** — an API accumulates pending SQL write operations in the back buffer during each time slice; a writer thread drains the front buffer in a single transaction while the API continues filling the back buffer, decoupling write acknowledgement latency from database commit latency
3. **WebSocket broadcast batch** — a real-time game server accumulates state update messages for all connected clients in the back buffer during each game tick; at the tick boundary the buffers swap and the network layer drains the front buffer to all sockets while the next tick's updates start accumulating
4. **Build pipeline output capture** — a CI runner captures stdout and stderr from a build process into the back buffer; a reporting thread drains the front buffer to the build log storage service, ensuring log lines are never dropped even when the build process outpaces the storage write speed
5. **HTTP response body assembly** — a streaming API assembles chunks of a large response body into the back buffer while the front buffer is being written to the socket; the swap ensures the socket writer always has a complete, stable chunk to send without competing with the assembler for the same memory

---

## Triple Buffer
*Extends double buffering with a third slot so the producer never has to wait for the consumer — common in GPU rendering*

All five are scenarios where the producer runs faster than the consumer and must never stall waiting for the consumer to finish reading. Double buffering would force the producer to block when the consumer is slow; the third slot is the overflow valve — the producer can always write to it, and the consumer always picks up the latest completed frame rather than a queued-up stale one.

1. **GPU frame rendering** — a graphics API submits draw calls to the write buffer every frame; `present()` makes the frame available without waiting for the display to finish consuming the previous one, so the renderer always runs at full speed and the display always picks up the most recent completed frame
2. **Live video encoder** — a video capture API writes raw frames into the write buffer as the camera produces them; the encoder consumes the ready buffer independently, and `present()` ensures the encoder always picks up the freshest unprocessed frame rather than an older queued one when it falls behind
3. **Real-time data visualisation** — a charting API continuously writes the latest computed data series into the write buffer; the renderer reads from the display buffer on each paint cycle, and the ready slot absorbs the difference in speed so neither the data writer nor the renderer ever blocks
4. **Telemetry frame assembly** — a high-frequency sensor API assembles telemetry snapshots into the write buffer at the sensor's full sample rate; a slower network transmitter consumes from the display buffer at its own pace, and `present()` ensures it always transmits the newest snapshot rather than a backlogged one
5. **Live auction price feed** — a financial API writes the latest bid/ask snapshot into the write buffer as ticks arrive from the exchange; a publishing worker reads from the display buffer to push updates to subscribers, and the ready slot ensures the publisher always dispatches the most recent price rather than one that was already superseded before it was sent

---

## Sliding Window Buffer
*Keeps a moving window of recent data — older data outside the window is discarded*

All five are time-series or sequence monitoring scenarios where only the most recent N entries are analytically meaningful and older entries outside the window are not just unneeded but actively wrong to include in calculations. Unlike a ring buffer, the window is read non-destructively — the same snapshot can be queried multiple times — and the semantics are about what is *currently in view*, not about what has been consumed.

1. **Rolling average response time** — an API performance monitor adds each request's latency to a sliding window of the last 100 requests; a health endpoint computes the moving average from `getWindow()` on every poll, giving a smoothed latency figure that reflects current performance rather than the lifetime average
2. **Anomaly detection threshold** — a fraud detection API maintains a sliding window of the last 50 transaction amounts per user; before authorising a new transaction it computes the mean and standard deviation of the window to detect whether the new amount is a statistical outlier relative to recent behaviour
3. **Network throughput monitor** — an API gateway tracks the packet count per second over a sliding window of the last 60 seconds; a rate-limiting policy reads the window to compute current throughput and trips a circuit breaker if the rolling total exceeds the threshold
4. **Recent search history** — a search API maintains a per-user sliding window of the last 10 queries; the autocomplete endpoint reads the window to bias suggestions toward terms the user has recently searched, without persisting a full search history to the database
5. **Live error rate dashboard** — a monitoring API tracks whether each of the last 200 requests resulted in a 5xx response in a sliding window of booleans; a status endpoint computes the error rate as `errors / windowSize` from the current snapshot to display a live rolling error percentage on the operations dashboard
