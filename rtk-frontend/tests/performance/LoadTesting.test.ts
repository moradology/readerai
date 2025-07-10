/**
 * Load Testing Performance Behaviors
 *
 * Performance Behaviors to Guarantee:
 *
 * RESPONSE TIMES:
 * - Initial page load < 3 seconds on 3G
 * - Time to first word highlight < 2 seconds
 * - Checkpoint questions appear < 500ms
 * - Interruption responses < 3 seconds
 * - UI interactions respond < 100ms
 *
 * CONCURRENT USERS:
 * - 100 simultaneous users supported
 * - No degradation up to 50 users
 * - Graceful degradation 50-100 users
 * - Clear messaging beyond capacity
 * - Auto-scaling triggers appropriately
 *
 * RESOURCE USAGE:
 * - Memory usage stable over 1-hour sessions
 * - No memory leaks during normal usage
 * - CPU usage remains below 50% average
 * - Network bandwidth is used efficiently
 * - Battery drain is reasonable on mobile
 *
 * LONG SESSIONS:
 * - 2-hour sessions work without issues
 * - Performance doesn't degrade over time
 * - Audio buffering remains smooth
 * - WebSocket connections stay stable
 * - Progress saves work throughout
 *
 * STRESS SCENARIOS:
 * - Rapid pause/resume doesn't break
 * - Quick passage switching works
 * - Many interruptions are handled
 * - Network throttling is tolerated
 * - System recovers from overload
 *
 * SCALABILITY:
 * - Database queries use indexes properly
 * - Caching reduces redundant calls
 * - CDN serves static assets
 * - API responses are appropriately sized
 * - Background jobs don't impact users
 */
