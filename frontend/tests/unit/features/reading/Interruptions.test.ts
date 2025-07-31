/**
 * Reading Interruptions Behavior Tests
 *
 * Critical Behaviors to Guarantee:
 *
 * INTERRUPTION FLOW:
 * - Users can interrupt reading at any time by clicking/tapping
 * - Interrupting should immediately pause audio playback
 * - The reading position should be preserved during interruption
 * - Multiple interruption types should be easily accessible
 * - Custom questions should be supported with text input
 *
 * CONTEXT PRESERVATION:
 * - Interruptions should capture surrounding word context
 * - The system should know which word triggered the interruption
 * - Context should include enough text for meaningful responses
 * - Returning from interruption should restore exact position
 *
 * RESPONSE HANDLING:
 * - Responses should appear quickly (< 3 seconds)
 * - Long responses should be readable and well-formatted
 * - Users should be able to dismiss responses easily
 * - Audio explanations should be playable when available
 * - Related learning resources should be accessible
 *
 * USER EXPERIENCE:
 * - Interruption UI should not block passage visibility
 * - Keyboard shortcuts should work for accessibility
 * - Touch gestures should feel natural on mobile
 * - Voice commands should trigger interruptions (when enabled)
 * - Previous interruptions should be reviewable
 *
 * EDGE CASES:
 * - Interrupting during the first/last word should work
 * - Rapid successive interruptions should be handled
 * - Interrupting during checkpoints should be managed
 * - Network failures during interruption should show offline help
 */
