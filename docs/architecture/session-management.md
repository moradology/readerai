# Session Management in ReaderAI

## Core Principle: Independent Student Sessions

**IMPORTANT**: Each student reads independently. They may be:

- Reading different books
- At different times
- At different paces
- In different locations
- With different comprehension levels

There is NO shared state between students. Each WebSocket connection represents one student's private reading session.

## Session Architecture

```mermaid
graph TD
    Student1[Student A] -->|WebSocket 1| Session1[Session: Alice reading "Cat in Hat"]
    Student2[Student B] -->|WebSocket 2| Session2[Session: Bob reading "Green Eggs"]
    Student3[Student C] -->|WebSocket 3| Session3[Session: Carol reading "Cat in Hat"]

    Session1 --> Backend1[Isolated Session State 1]
    Session2 --> Backend2[Isolated Session State 2]
    Session3 --> Backend3[Isolated Session State 3]

    Backend1 --> LLM[Shared LLM Service]
    Backend2 --> LLM
    Backend3 --> LLM
```

## Key Points

### 1. Session Isolation

- Each WebSocket connection = One student's private session
- No cross-session communication
- No shared reading state
- No synchronization between students

### 2. What's Private Per Session

- Current book/passage
- Reading position (word index)
- Audio playback state
- Question history
- Comprehension scores
- Reading speed
- Interruption context

### 3. What's Shared (Infrastructure Only)

- LLM service (but responses are contextualized per student)
- Audio files (but playback is independent)
- Book library (but selection is independent)
- Server infrastructure

## WebSocket Message Flow

Each student's WebSocket connection is completely isolated:

```typescript
// Student A reading "The Cat in the Hat" at word 150
StudentA → {
  type: 'STUDENT_INTERRUPTION',
  sessionId: 'session-alice-123',
  payload: {
    questionText: "What does 'mischievous' mean?",
    context: {
      book: 'cat-in-hat',
      currentWordIndex: 150,
      currentSentence: 'The cat was being mischievous...'
    }
  }
}

// Student B reading "Green Eggs and Ham" at word 45
StudentB → {
  type: 'STUDENT_INTERRUPTION',
  sessionId: 'session-bob-456',
  payload: {
    questionText: "Why doesn't he like green eggs?",
    context: {
      book: 'green-eggs-ham',
      currentWordIndex: 45,
      currentSentence: 'I do not like green eggs and ham...'
    }
  }
}
```

## Session Lifecycle

### 1. Session Creation

```typescript
// Each student gets their own session when they start reading
POST /api/sessions
{
  studentId: 'alice-123',
  bookId: 'cat-in-hat',
  startTime: '2024-01-10T10:30:00Z'
}

Response:
{
  sessionId: 'session-alice-123',
  websocketUrl: 'wss://api.readerai.com/ws/session-alice-123',
  book: { ... },
  startPosition: 0
}
```

### 2. Session State

Each session maintains its own state:

```typescript
interface SessionState {
  sessionId: string;
  studentId: string;
  bookId: string;
  currentPosition: {
    wordIndex: number;
    paragraphIndex: number;
    audioTimestamp: number;
  };
  interruptions: Array<{
    timestamp: Date;
    question: string;
    response: string;
    wordIndex: number;
  }>;
  comprehensionScores: Array<{
    checkpointId: string;
    score: number;
    timestamp: Date;
  }>;
  startTime: Date;
  lastActiveTime: Date;
  totalReadingTime: number;
  status: "active" | "paused" | "completed";
}
```

### 3. Session Independence Examples

**Scenario 1**: Two students reading the same book

- Alice is on page 5, reading about the Cat causing chaos
- Bob just started page 1, meeting the Cat
- Their sessions are completely independent
- Alice's questions about "chaos" don't affect Bob
- Bob can read at his own pace

**Scenario 2**: Same student, multiple sessions

- Alice reads "Cat in Hat" Monday morning
- Alice reads "Green Eggs" Monday afternoon
- These are two separate sessions
- Progress in one doesn't affect the other
- Questions are contextualized to each book

**Scenario 3**: Classroom of 30 students

- 30 independent WebSocket connections
- Some reading the same book, others different books
- Each at their own pace
- Teacher can monitor individually
- No student affects another's experience

## Implementation Guidelines

### Frontend

```typescript
// Each student's app instance
const session = await createReadingSession(studentId, bookId);
const ws = new WebSocket(session.websocketUrl);

// All messages include session context
ws.send({
  type: 'STUDENT_INTERRUPTION',
  sessionId: session.id,  // Always include session ID
  payload: { ... }
});
```

### Backend

```python
# Each WebSocket connection is bound to a session
class ReadingSessionHandler:
    def __init__(self, session_id: str):
        self.session = load_session(session_id)
        self.student = load_student(self.session.student_id)
        self.book = load_book(self.session.book_id)

    async def handle_interruption(self, message):
        # Context is specific to THIS student's session
        response = await llm.answer_question(
            question=message.question,
            book_context=self.book,
            student_reading_level=self.student.level,
            current_position=self.session.position
        )
        return response
```

## Common Misconceptions

❌ **WRONG**: "Students take turns reading"
✅ **RIGHT**: Each student reads independently whenever they want

❌ **WRONG**: "Students can see each other's progress"
✅ **RIGHT**: Each student's session is private

❌ **WRONG**: "If one student pauses, others are affected"
✅ **RIGHT**: Each student controls only their own playback

❌ **WRONG**: "Students must read the same book"
✅ **RIGHT**: Each student can read any book in the library

❌ **WRONG**: "WebSocket broadcasts to all students"
✅ **RIGHT**: WebSocket messages are private to each session

## Scalability Considerations

### Horizontal Scaling

- Sessions can be distributed across servers
- Use session ID for routing (sticky sessions)
- No inter-session communication needed

### Resource Isolation

- Each session has its own:
  - Memory allocation
  - CPU quota for audio processing
  - WebSocket connection
  - Database connection pool slot

### Session Limits

- Max concurrent sessions per server
- Session timeout after inactivity
- Resource cleanup on disconnect

## Privacy and Security

### Data Isolation

- Session data is encrypted with session-specific keys
- No cross-session data access
- Student can only access their own sessions

### Audit Trail

- Each session maintains its own log
- Questions and responses are tied to session ID
- Progress tracking is per-session

### Teacher Monitoring

- Teachers can view their students' sessions
- But cannot modify or interfere
- Real-time dashboard shows individual progress

## Summary

ReaderAI is designed for **independent, asynchronous reading**:

- Each student has their own private session
- No shared state between students
- Complete freedom to read what, when, and how they want
- WebSockets provide real-time interaction within each private session
- The system scales horizontally by adding more session handlers
