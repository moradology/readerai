# ReaderAI RTK Frontend

A modern React frontend for the ReaderAI educational reading application, built with Redux Toolkit (RTK), TypeScript, and a provider-based architecture for maximum flexibility.

## 🏗️ Architecture Overview

This frontend implements a layered architecture designed for scalability, testability, and developer experience:

```
┌─────────────────────────────────────────────────────────┐
│                    UI Components                         │
├─────────────────────────────────────────────────────────┤
│                  Redux Store (RTK)                       │
├─────────────────────────────────────────────────────────┤
│              Provider Abstraction Layer                  │
├─────────────────────────────────────────────────────────┤
│   TTS Provider │ Audio Provider │ Session Provider      │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── app/                    # Application-wide setup
│   ├── store.ts           # Redux store configuration
│   ├── hooks.ts           # Typed Redux hooks
│   ├── middleware.ts      # Custom Redux middleware
│   └── providers.tsx      # React context providers
│
├── features/              # Feature-based modules
│   └── reading/          # Reading feature
│       ├── api/          # RTK Query API definitions
│       ├── components/   # React components
│       └── store/        # Redux slices
│
├── providers/            # Swappable service providers
│   ├── types.ts         # Provider interfaces
│   ├── tts/             # Text-to-speech providers
│   ├── audio/           # Audio player providers
│   └── session/         # Reading session providers
│
├── shared/              # Shared utilities and components
│   ├── api/            # Base API configuration
│   ├── components/     # Reusable components
│   └── utils/          # Utility functions
│
└── styles/             # Global styles and themes
```

## 🔄 Redux Architecture

### Store Configuration

The Redux store is configured with RTK's `configureStore`, providing:

- Redux DevTools integration
- RTK Query for data fetching
- Custom middleware for logging, analytics, and WebSocket coordination
- Type-safe hooks (`useAppSelector`, `useAppDispatch`)

```typescript
// Example: Using typed hooks
import { useAppSelector, useAppDispatch } from "@app/hooks";

function MyComponent() {
  const dispatch = useAppDispatch();
  const readingStatus = useAppSelector(selectReadingStatus);

  const handlePlay = () => {
    dispatch(play());
  };
}
```

### Feature Slices

Each feature has its own slice with:

- **State**: Strongly typed state interface
- **Reducers**: Synchronous state updates
- **Thunks**: Async operations
- **Selectors**: Memoized state derivations

```typescript
// features/reading/store/readingSlice.ts
const readingSlice = createSlice({
  name: "reading",
  initialState,
  reducers: {
    play: (state) => {
      state.status = "playing";
    },
    pause: (state) => {
      state.status = "paused";
    },
  },
});
```

### RTK Query Integration

API calls are managed through RTK Query, providing:

- Automatic caching and cache invalidation
- Loading and error states
- Optimistic updates
- Request deduplication

```typescript
// features/reading/api/readingApi.ts
export const readingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPassage: builder.query<Passage, string>({
      query: (id) => `/passages/${id}`,
      providesTags: ["Passage"],
    }),
  }),
});

// Usage in components
const { data, isLoading, error } = useGetPassageQuery(passageId);
```

## 🔌 Provider System

The provider system allows swapping implementations without changing application code:

### Provider Types

1. **TTS Provider**: Text-to-speech synthesis
2. **Audio Player Provider**: Audio playback control
3. **Reading Session Provider**: Session state management
4. **Analytics Provider**: Event tracking

### Implementation Modes

- **Demo**: In-memory mock implementations for development
- **Real**: Production implementations using actual services
- **Offline**: Local-storage backed implementations

### Using Providers

```typescript
import { useTTSProvider, useAudioPlayerProvider } from "@providers";

function ReadingComponent() {
  const tts = useTTSProvider();
  const audioPlayer = useAudioPlayerProvider();

  const handleStartReading = async (text: string) => {
    // Generate audio from text
    const { audioUrl, wordTimings } = await tts.synthesize(text);

    // Load and play audio
    await audioPlayer.load(audioUrl);
    await audioPlayer.play();
  };
}
```

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development

```bash
# Start with mock API (recommended for development)
npm run dev:mock

# Start with real API
npm run dev

# Start with production API
npm run dev:prod-api
```

### Environment Variables

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

# Feature Flags
VITE_MOCK_API=true           # Use mock service worker
VITE_OFFLINE_MODE=false      # Use offline providers
VITE_FEATURE_ANALYTICS=true  # Enable analytics
VITE_LOG_LEVEL=debug        # Logging level
```

## 🧪 Testing Strategy

### Unit Tests

- Provider implementations
- Redux reducers and selectors
- Utility functions

### Integration Tests

- Provider + Redux integration
- API mocking with MSW
- Component behavior

### E2E Tests

- Complete reading flows
- Interruption handling
- Progress persistence

## 📊 State Management Patterns

### Local Component State

Use for UI-only state that doesn't need to be shared:

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
```

### Redux State

Use for:

- Shared state between components
- State that needs to persist
- Complex state logic
- Server cache (via RTK Query)

### Provider State

Providers maintain their own internal state for:

- Audio playback position
- Session timers
- Connection status

## 🔧 Middleware

Custom middleware handles cross-cutting concerns:

1. **Error Logging**: Catches and reports failed actions
2. **Action Logging**: Development-only action logger
3. **Analytics**: Tracks user interactions
4. **WebSocket Coordination**: Manages real-time connections

## 🎨 Component Patterns

### Container/Presentational Split

- **Container**: Connected to Redux, handles logic
- **Presentational**: Pure UI components, receive props

### Provider Hooks

- Must be used within `ProviderContextProvider`
- Throw errors if providers aren't ready
- Provide type-safe access to services

### Error Boundaries

- Wrap major UI sections
- Provide fallback UI
- Report errors to monitoring

## 🚦 Data Flow

1. **User Action** → Component Event Handler
2. **Dispatch Action** → Redux Store or Provider Method
3. **State Update** → Reducers update state / Providers update internal state
4. **Re-render** → Selectors provide new data to components
5. **UI Update** → React re-renders with new state

## 🔐 Security Considerations

- API tokens stored in memory only
- Automatic token refresh with mutex protection
- CORS configured for API requests
- Content Security Policy headers

## 📈 Performance Optimizations

- RTK Query request deduplication
- Memoized selectors with Reselect
- Code splitting by route
- Vendor chunk separation
- React.memo for expensive components

## 🛠️ Development Tools

- **Redux DevTools**: Time-travel debugging
- **React Developer Tools**: Component inspection
- **TypeScript**: Full type safety
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent formatting

## 📝 Best Practices

1. **Always use typed hooks** (`useAppSelector`, `useAppDispatch`)
2. **Colocate related code** (slice, types, selectors in same file)
3. **Normalize state shape** (entities by ID, arrays of IDs)
4. **Use RTK Query** for all API calls
5. **Leverage providers** for swappable implementations
6. **Write tests** for critical business logic

## 🚧 Roadmap

- [ ] WebSocket integration for real-time updates
- [ ] Offline support with service workers
- [ ] Advanced audio features (pitch control, voice selection)
- [ ] Session recording and playback
- [ ] Multi-language support
- [ ] Accessibility improvements

## 🤝 Contributing

1. Follow the established patterns
2. Add tests for new features
3. Update types when changing APIs
4. Use conventional commits
5. Run `npm run validate` before pushing

---

Built with ❤️ using React, Redux Toolkit, and TypeScript
