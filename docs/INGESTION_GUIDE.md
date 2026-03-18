# 📥 Ingestion Pipeline & Scheduling Guide

Welcome to the **Chumme API Ingestion Pipeline**. This document explains the architecture, mechanics, and flows that drive the automated downloading, tracking, and scoring of social media content.

---

## 🛠 Tech Stack & Utilities

The pipeline is built on top of a highly horizontal-scaled structure:

*   **🐇 RabbitMQ**: Message Broker. Distributes standard job pushes:
    *   `ingestion.discovery`: Pulls new media for a specific target profile.
    *   `ingestion.search`: Searches keywords to discover creators.
*   **🔴 Redis**: Holds temporary execution buffers:
    *   **Deduplication Keys**: Prevents downloading the same video multiple times in short periods.
    *   **Rate Limits**: Schedules backing-off triggers upon hitting platform quotas.
    *   **Sequential Counters**: Increments counters to track when steps complete.
*   **🔷 Prisma (Postgres)**: Stores the `SocialFeedItem` rows, targets, and snapshot metrics history templates securely.

---

## 🔄 Core Ingestion Workflows

There are **three main pathways** triggering network traffic down inside execution layers.

### 1. Scheduled Crawling (`processScheduledTasks`)
Periodically pulls content updates for explicitly known and saved channels.
1.  Loads row entries from **`SocialIngestionTarget`**.
2.  Validates interval eligibility (e.g., `hoursSinceLastCrawl >= target.interval`).
3.  Pushes a **`DISCOVERY`** job configuration bundle into RabbitMQ.

### 2. Keyword Scouting (`processScoutTasks`)
Searches content aggregators to discover new talent handles.
1.  Loads all `ChummeSubCategory` & `ChummeTopicCategory` that contain `discoveryKeywords`.
2.  Passes those values downstream as full dictionary payloads.
3.  Pushes a **`SEARCH`** job row configuration packet into RabbitMQ.

### 3. Sequential Chaining **(Advanced Mode)**
Forces platform synchronization to execute rigid sequentially instead of overlapping concurrent payloads to conserve rate boundaries.
1.  Checks Database for `CHAIN_ACTIVE` and `CRAWL_CHAIN` order array (e.g. `["YOUTUBE", "INSTAGRAM", "TIKTOK"]`).
2.  Sets a Redis variable tracking count for **Platform 1** queue depth.
3.  When indices hit `0` (decrementing via listener worker finalizers), advances to **Platform 2** sequentially.

---

## 🔌 Inside the Worker (`IngestionWorker`)

The background workers process queues asynchronously:

### A. Discovery Execution (`handleDiscoveryJob`)
1.  Resolves driver: `IngestionManager.getConnector(job.platform)`.
2.  Fetches media list from platform API using corresponding target profile handle.
3.  Loops through returning media feeds. 
4.  Updates or Creates `SocialFeedItem` records linking exact `SubCategory` and `TopicCategory` metadata forwarded along the payload.
    *   *💡 AI Note*: All raw video metadata (title, descriptions, tags, and stats) is saved into the `metaData` JSON column so that external AI agents can parse it later for search indexing and content analysis!

### B. Search Execution (`handleSearchJob`)
1.  Queries platform API search-endpoints using keyword lookup strings.
2.  Pulls the **Channel/Author ID** from the search nodes.
3.  **Registers a new record inside `SocialIngestionTarget`** linked to that category.
4.  *(Optional Feature)* immediately fires discovery triggers to load direct content.

---

## 📊 Live Monitoring & WebSockets

The backend emits dynamic Socket.io updates to keep dash-panels fully streamed in real-time without continuous SQL lookups:

*   **`chain:status`**: Broadcasts the current Platform execution index (e.g. `YOUTUBE`), and the exact counting payload left.
*   **Health Diagnostics**: Saves local aggregate runtime snapshot dictionaries into Redis memory blocks readable instantly over standard REST interfaces.

---

## 💡 Future Recommendations & Best Practices

To continue scaling the pipeline reliable and maintainable, consider implementing the following enhancements:

*   **Ensure Idempotency**: Add unique constraints on each social feed item using combination of (`platform` + `externalId`) so that duplicate records are never created even if multiple jobs target same content. *(Partially solved via Redis job deduplication)*.
*   **Implement Retry and Backoff**: Introduce retry logic with exponential backoff and a dead-letter queue in RabbitMQ to handle intermittent API failures or network drops without losing jobs.
*   **Control Discovery Explosion**: Limit the number of creators registered per keyword/scout search and filter them based on engagement or follower thresholds to prevent exponential target growth.
*   **Persist Sequential Chain State**: Mirror Redis counters into Postgres so sequential chain progress is fully safe if Redis restarts, providing a fully reliable source of truth.
*   **Prioritize Jobs**: Use RabbitMQ priority queues giving scheduled target crawls higher priority over search or backfill jobs. *(Partially implemented in target queues)*.
*   **Use Adaptive Crawling Intervals**: Dynamically adjust intervals based on account activity and content virality so highly active handles are crawled more frequently.
*   **Compute Scores During Ingestion**: Calculate engagement growth scores for each content item *as it is ingested* instead of during post-processing to support real-time feeds.
*   **Control Observability**: Track metrics like job duration and failure rates, and emit events for key actions to improve dashboard monitoring. *(Already enhanced with recent metric history updates)*.
*   **Version Connectors**: Tag platform connectors with version variables to safely roll out updates and handle changes in platform APIs without breaking backwards compatibility.
