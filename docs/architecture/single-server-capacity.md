# Single Server Capacity Planning for ReaderAI

## Overview

How many concurrent students can one server handle? It depends on the server size and what the students are doing.

## Key Factors (FastAPI + External LLM)

### Per-Connection Resources

**Memory per WebSocket connection:**

- Base connection: ~20-50 KB (async is memory efficient)
- Session state: ~50-200 KB
- Message buffers: ~10-50 KB
- **Total: ~80-300 KB per active student**

**CPU usage with async FastAPI:**

- Idle connection: Near zero
- Active reading: Near zero (just routing messages)
- During interruption: Minimal (just forwarding to external LLM)
- Average: ~0.01-0.05% CPU per active student

**What the server actually does:**

- Routes WebSocket messages (microseconds)
- Updates session state in Redis/DB (milliseconds)
- Forwards questions to Google Cloud LLM (non-blocking)
- Streams responses back (non-blocking)
- **No heavy computation on server!**

## Single Server Capacity by Size

### Small Server (2 vCPU, 4 GB RAM)

Example: AWS t3.medium, $30/month

**Capacity with FastAPI:** 1,000-3,000 concurrent students

```
Memory limit: 4 GB / 200 KB = ~20,000 connections (theoretical)
CPU limit: Not a constraint with async (mostly I/O waiting)
Practical limit: ~2,000 students (leaving headroom)
```

**Good for:**

- Multiple schools
- Small district
- Regional deployment

### Medium Server (4 vCPU, 16 GB RAM)

Example: AWS c5.xlarge, $120/month

**Capacity with FastAPI:** 5,000-15,000 concurrent students

```
Memory limit: 16 GB / 200 KB = ~80,000 connections (theoretical)
CPU limit: Can handle 10,000+ with async
Practical limit: ~10,000 students (connection limits)
```

**Good for:**

- Large district
- Multiple districts
- State pilot program

### Large Server (8 vCPU, 32 GB RAM)

Example: AWS c5.2xlarge, $240/month

**Capacity with FastAPI:** 15,000-30,000 concurrent students

```
Memory limit: 32 GB / 200 KB = ~160,000 connections (theoretical)
File descriptor limit: Usually ~65,000 (can be increased)
Practical limit: ~20,000 students
```

**Good for:**

- Major metropolitan district
- Multi-district deployment
- Small state deployment

### Extra Large Server (16 vCPU, 64 GB RAM)

Example: AWS c5.4xlarge, $480/month

**Capacity with FastAPI:** 30,000-50,000 concurrent students

```
Memory limit: 64 GB / 200 KB = ~320,000 connections (theoretical)
Network stack limit: ~100,000 connections (tunable)
Practical limit: ~40,000 students
```

**Good for:**

- State-wide deployment
- Large educational network
- National pilot program

## Real-World Scenarios

### Scenario 1: Elementary School (500 students)

**Typical concurrent usage:** 20-30% = 100-150 students
**Peak usage:** 50% = 250 students
**Recommended:** Medium server (4 vCPU, 16 GB)

### Scenario 2: School District (5,000 students)

**Typical concurrent usage:** 15-25% = 750-1,250 students
**Peak usage:** 40% = 2,000 students
**Recommended:** Large server (8 vCPU, 32 GB) or 2 medium servers

### Scenario 3: Active Classroom (30 students)

**All reading simultaneously:** 30 students
**Frequent interruptions:** High CPU spikes
**Recommended:** Small server (2 vCPU, 4 GB) is plenty

## Performance Considerations

### What Kills Single-Server Performance

1. **Too many simultaneous interruptions**
   - Each LLM call needs CPU
   - Solution: Queue/rate-limit questions

2. **Memory leaks**
   - Long-running connections accumulate state
   - Solution: Periodic connection recycling

3. **Database bottlenecks**
   - Session state persistence
   - Solution: In-memory caching

4. **Network bandwidth**
   - Usually not the limiting factor
   - Unless serving audio directly

### Optimization Tips for Single Server

1. **Use connection pooling**

   ```python
   # Reuse database connections
   db_pool = create_pool(min_size=5, max_size=20)
   ```

2. **Implement intelligent caching**

   ```python
   # Cache common LLM responses
   @lru_cache(maxsize=1000)
   def get_vocabulary_definition(word: str):
       return llm_service.define(word)
   ```

3. **Rate limit expensive operations**

   ```python
   # Limit interruptions per student
   rate_limiter = RateLimiter(
       max_calls=10,
       time_window=300  # 5 minutes
   )
   ```

4. **Use efficient data structures**
   ```python
   # Store session state efficiently
   session_state = {
       'book_id': book_id,  # Just ID, not full book
       'word_idx': 1234,    # Integer, not string
       'audio_ts': 45.6     # Float seconds
   }
   ```

## When to Scale Beyond One Server

Consider multiple servers when:

1. **Concurrent users > 80% of capacity**
   - Regular performance degradation
   - Increased latency

2. **Geographic distribution**
   - Students across time zones
   - Latency > 100ms for many users

3. **Reliability requirements**
   - Need failover capability
   - Can't afford downtime

4. **Feature growth**
   - Adding video streaming
   - Real-time collaboration features
   - Advanced analytics

## Cost Comparison

| Setup            | Concurrent Students | Monthly Cost | Cost per Student |
| ---------------- | ------------------- | ------------ | ---------------- |
| Small server     | 150                 | $30          | $0.20            |
| Medium server    | 750                 | $120         | $0.16            |
| Large server     | 2,000               | $240         | $0.12            |
| XL server        | 4,000               | $480         | $0.12            |
| 2 Medium servers | 1,500               | $240         | $0.16            |

## Quick Reference

**Rule of thumb for concurrent connections:**

- 1 GB RAM ≈ 1,000-2,000 WebSocket connections
- 1 vCPU ≈ 200-400 active students
- Always leave 20-30% headroom

**For ReaderAI specifically:**

- Light usage (just reading): 2,000 students per 1 GB RAM
- Medium usage (some questions): 1,500 students per 1 GB RAM
- Heavy usage (many questions): 1,000 students per 1 GB RAM

## FastAPI + Async Architecture Benefits

```python
# FastAPI WebSocket handler - non-blocking everything!
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # Non-blocking Redis operations
    session = await redis.get(f"session:{session_id}")

    async for message in websocket.iter_json():
        if message["type"] == "STUDENT_INTERRUPTION":
            # Forward to Google Cloud LLM (non-blocking)
            asyncio.create_task(handle_question(session_id, message))

            # Immediate acknowledgment
            await websocket.send_json({
                "type": "INTERRUPTION_ACKNOWLEDGED"
            })

async def handle_question(session_id: str, message: dict):
    # Call Google Cloud LLM API (non-blocking)
    response = await llm_client.generate_response(
        question=message["payload"]["questionText"],
        context=message["payload"]["context"]
    )

    # Send response back through WebSocket
    await send_to_session(session_id, response)
```

**Why this scales so well:**

1. No blocking operations
2. LLM inference happens elsewhere
3. Server just routes messages
4. Minimal memory per connection
5. CPU mostly idle

## Summary

With FastAPI's async architecture and external LLM inference:

- **Small server (4GB/2vCPU)**: 1,000-3,000 students
- **Medium server (16GB/4vCPU)**: 5,000-15,000 students
- **Large server (32GB/8vCPU)**: 15,000-30,000 students
- **XL server (64GB/16vCPU)**: 30,000-50,000 students

A $30/month server can handle a small district. A $120/month server can handle most educational deployments. You'd only need multiple servers for truly massive scale or geographic distribution.
