# Caching Strategies

Caching stores frequently accessed data closer to the consumer to reduce latency and repeated computation.

---

## Population Strategies

*How data gets into the cache and stays consistent.*

| Strategy | Description | Example Problem |
|---|---|---|
| **Memoization** | Function-level cache — same inputs always return the cached output in-process | [Fibonacci Calculator](src/fibonacci.js) — repeated `fib(n)` calls skip the 100ms delay on cache hits |
| **TTL (Time To Live)** | Entries expire after a fixed duration, forcing a fresh fetch | [Stock Price Feed](src/stockPrice.js) — cached price is served within the TTL window; expired entries re-fetch from the live feed |
| **Refresh-Ahead** | Cache proactively refreshes entries before they expire so no caller ever waits | [Sports Score Feed](src/sportsScore.js) — hockey score is served instantly near expiry while a background refresh quietly fetches the latest score |
| **Cache-Aside (Lazy Loading)** | App checks cache first; on a miss the app fetches and stores the result manually | [Fibonacci Calculator](src/fibonacci.js) — caller owns the check-fetch-store loop, and can choose not to cache based on the result |
| **Read-Through** | Cache sits in front of a backing store; on a miss the cache fetches and populates itself automatically | [Fibonacci Calculator](src/fibonacci.js) — caller only calls `cache.get(n)` and never interacts with the backing store directly |
| **Write-Through** | Every write goes to the cache and the backing store simultaneously | [IoT Device](src/iotDevice.js) — server status commands write to both cache and device; reads are always consistent without polling |
| **Write-Through + TTL** | Write-through keeps server writes immediately consistent; TTL catches device-initiated changes the server didn't cause | [IoT Device](src/iotDevice.js) — server writes reflect immediately; manual physical changes to the device are visible after TTL expiry |
| **Event-Driven Invalidation** | Cache is updated reactively by push events from the source rather than on a timer or server pull | [WiFi IoT Device](src/wifiDevice.js) — device pushes state changes over WiFi; mobile reads always hit cache; cache clears on disconnect so every request pays real latency |
| **Write-Behind (Write-Back)** | Writes go to cache immediately; the backing store is updated asynchronously in batches | 💡 *Suggested: Note-taking app — keystrokes accumulate in cache and flush to disk in batches, avoiding a write on every character* |

---

## Eviction Policies

*How data leaves the cache when it is full.*

| Policy | Description | Example Problem |
|---|---|---|
| **LRU (Least Recently Used)** | Evicts the entry that hasn't been accessed for the longest time | [Browser History](src/browserHistory.js) — recently visited pages reload instantly; pages not visited in a while are evicted when the cache fills |
| **LFU (Least Frequently Used)** | Evicts the entry accessed the fewest times; LRU used as a tiebreaker | [Fibonacci Calculator](src/fibonacci.js) — frequently requested values survive eviction over rarely requested ones |
| **FIFO (First In, First Out)** | Evicts the oldest inserted entry regardless of how often it was accessed | [Fibonacci Calculator](src/fibonacci.js) — entries are evicted in insertion order regardless of how frequently they are hit |
| **Random Replacement** | Evicts a randomly selected entry | [Fibonacci Calculator](src/fibonacci.js) — useful when all entries have equal access probability and eviction overhead should be minimal |
| **MRU (Most Recently Used)** | Evicts the most recently used entry — useful for sequential scan patterns | 💡 *Suggested: File scanner — when scanning thousands of files sequentially, the most recently read file is least likely to be needed again soon* |

---

## Cache Types by Location

*Where the cache lives in the system.*

| Type | Description | Example Problem |
|---|---|---|
| **In-Memory Cache** | Data stored in RAM within the application process | All strategies above use in-memory caches |
| **Browser Cache** | HTML, CSS, JS, and images stored locally in the browser | [Browser History](src/browserHistory.js) — simulates a fixed-capacity browser cache with LRU eviction |
| **Distributed Cache** | Cache shared across multiple nodes or servers (e.g. Redis Cluster) | 💡 *Suggested: Session store — multiple web server instances share a single cache so any node can serve a logged-in user's session* |
| **CDN Cache** | Static assets cached at edge nodes geographically close to users | 💡 *Suggested: Image server — profile images are cached at edge locations; a TTL or event-driven invalidation refreshes them when a user updates their photo* |
| **DNS Cache** | Resolved domain-to-IP mappings stored locally or at resolvers | 💡 *Suggested: Hostname resolver — cache `hostname → IP` lookups with a TTL that mirrors the DNS record's TTL; expired entries re-resolve* |
| **Disk Cache** | OS page cache; recently read disk blocks held in RAM | 💡 *Suggested: Config file reader — file contents cached in memory on first read; TTL or file-watcher invalidation triggers a re-read when the file changes* |
| **CPU / Hardware Cache** | L1, L2, L3 caches built into the processor | Not implementable in application code — managed by the CPU and OS |

---

## Buffering

Buffering temporarily holds data in transit to smooth out speed mismatches or batch operations.

| Type | Description | Example Problem |
|---|---|---|
| **Size-Based Flush** | Buffer flushes when it reaches a fixed number of entries | [Log Writer](src/logWriter.js) — log messages accumulate and flush to disk when the buffer reaches 5 entries |
| **Time-Based Flush** | Buffer flushes on a fixed timer regardless of how full it is | [Log Writer](src/logWriter.js) — a 2-second interval flushes any remaining messages so nothing is stuck in the buffer indefinitely |

---

## Key Difference: Cache vs Buffer

| | **Cache** | **Buffer** |
|---|---|---|
| **Purpose** | Speed up repeated access to the same data | Smooth speed mismatches between producer and consumer |
| **Data reuse** | Data is reused on hits | Data is typically consumed once |
| **Lifetime** | Persists until evicted or expired | Transient — cleared after flush |
| **Access pattern** | Random / key-based | Sequential / FIFO |
