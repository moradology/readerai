# ReaderAI Frontend Architecture Document

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Architecture Principles](#core-architecture-principles)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Key Abstractions & Interfaces](#key-abstractions--interfaces)
6. [Development Setup](#development-setup)
7. [Styling Strategy](#styling-strategy)
8. [Static Analysis & Code Quality](#static-analysis--code-quality)
9. [Testing Strategy](#testing-strategy)
10. [Build & Deployment](#build--deployment)
11. [Provider Implementation Guide](#provider-implementation-guide)
12. [Migration Strategy](#migration-strategy)

---

## Project Overview

ReaderAI is an interactive educational reading application designed with **provider-based architecture** to enable seamless swapping of core functionality. The frontend is built to support:

- **Multiple TTS Providers**: Demo, Google Cloud TTS, Amazon Polly, Azure Speech
- **Various Audio Players**: HTML5 Audio, Web Audio API, custom streaming
- **Different Highlighting Strategies**: Time-based, confidence-based, predictive
- **Flexible State Management**: RTK Query for data, Redux for UI state, services for external integrations

### Design Philosophy

1. **Interface-First Development**: Define contracts before implementations
2. **Provider Pattern**: All external services hidden behind interfaces
3. **Feature Flags**: Runtime configuration of providers and features
4. **Type Safety**: Full TypeScript coverage with strict mode
5. **Testability**: Every component testable in isolation

---

## Core Architecture Principles

### 1. Separation of Concerns

```
UI Components → Hooks → Redux/RTK Query → Services → Providers → External APIs
```

### 2. Dependency Inversion

- Components depend on abstractions, not implementations
- Providers implement interfaces, not the other way around
- Services orchestrate providers without knowing their internals

### 3. Configuration-Driven Behavior

- Provider selection via environment variables
- Feature toggles for experimental features
- Runtime provider switching for A/B testing

---

## Technology Stack

### Core Dependencies

```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^2.0.0", // State management
    "react": "^18.3.0", // UI framework
    "react-dom": "^18.3.0",
    "react-redux": "^9.1.0", // Redux bindings
    "axios": "^1.7.0", // HTTP client
    "react-router-dom": "^6.22.0" // Routing
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    // Build Tools
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",

    // TypeScript
    "typescript": "^5.3.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",

    // Testing
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@vitest/ui": "^1.2.0",
    "jsdom": "^24.0.0",
    "msw": "^2.0.0", // API mocking

    // Code Quality
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "husky": "^9.0.0", // Git hooks
    "lint-staged": "^15.0.0",

    // CSS
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@tailwindcss/forms": "^0.5.0",
    "@tailwindcss/typography": "^0.5.0",

    // Additional Tools
    "concurrently": "^8.0.0", // Run multiple scripts
    "@trivago/prettier-plugin-sort-imports": "^4.3.0"
  }
}
```

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                              # Application core
│   │   ├── store.ts                      # Redux store configuration
│   │   ├── hooks.ts                      # Typed Redux hooks
│   │   ├── middleware.ts                 # Custom middleware
│   │   └── providers.tsx                 # App-level providers
│   │
│   ├── features/                         # Feature modules
│   │   ├── reading/
│   │   │   ├── api/
│   │   │   │   ├── readingApi.ts         # RTK Query endpoints
│   │   │   │   └── types.ts              # API types
│   │   │   ├── store/
│   │   │   │   ├── readingSlice.ts       # Redux slice
│   │   │   │   ├── selectors.ts          # Memoized selectors
│   │   │   │   └── listeners.ts          # RTK Listeners
│   │   │   ├── providers/
│   │   │   │   ├── interfaces.ts         # Core contracts
│   │   │   │   ├── implementations/
│   │   │   │   │   ├── demo/
│   │   │   │   │   └── production/
│   │   │   │   └── ProviderFactory.ts
│   │   │   ├── components/
│   │   │   │   ├── ReadingInterface.tsx
│   │   │   │   ├── PassageDisplay.tsx
│   │   │   │   ├── WordHighlighter.tsx
│   │   │   │   └── PlaybackControls.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useReading.ts
│   │   │   │   └── useWordHighlight.ts
│   │   │   ├── utils/
│   │   │   │   └── textProcessing.ts
│   │   │   └── index.ts                  # Public API
│   │   │
│   │   ├── interruptions/
│   │   ├── checkpoints/
│   │   └── passages/
│   │
│   ├── services/                         # External service integrations
│   │   ├── websocket/
│   │   │   ├── WebSocketService.ts
│   │   │   ├── messageHandlers.ts
│   │   │   ├── reconnection.ts
│   │   │   └── types.ts
│   │   ├── audio/
│   │   │   ├── interfaces.ts
│   │   │   ├── players/
│   │   │   │   ├── HTML5AudioPlayer.ts
│   │   │   │   └── WebAudioPlayer.ts
│   │   │   └── AudioManager.ts
│   │   └── monitoring/
│   │       └── analytics.ts
│   │
│   ├── shared/                           # Shared resources
│   │   ├── api/
│   │   │   ├── baseApi.ts                # RTK Query base
│   │   │   ├── client.ts                 # Axios instance
│   │   │   └── types.ts
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── index.ts
│   │   │   └── layout/
│   │   │       └── PageLayout.tsx
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── utils/
│   │   │   ├── formatting.ts
│   │   │   └── validation.ts
│   │   └── types/
│   │       └── global.d.ts
│   │
│   ├── config/
│   │   ├── features.ts                   # Feature flags
│   │   ├── providers.ts                  # Provider configuration
│   │   └── constants.ts
│   │
│   ├── styles/
│   │   ├── globals.css                   # Global styles
│   │   └── tailwind.css                  # Tailwind imports
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── public/
│   ├── demo-audio/                       # Demo audio files
│   └── fonts/                            # Web fonts
│
├── tests/
│   ├── unit/
│   │   ├── features/
│   │   └── services/
│   ├── integration/
│   │   └── flows/
│   ├── e2e/
│   │   └── scenarios/
│   ├── fixtures/
│   │   └── mockData.ts
│   ├── mocks/
│   │   ├── handlers.ts                   # MSW handlers
│   │   └── server.ts
│   └── setup.ts
│
├── scripts/
│   ├── generate-provider.ts              # Scaffold new providers
│   └── analyze-bundle.ts
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
└── [Configuration Files]
    ├── .env.example
    ├── .eslintrc.json
    ├── .prettierrc
    ├── tailwind.config.js
    ├── vite.config.ts
    ├── vitest.config.ts
    ├── tsconfig.json
    └── package.json
```

---

## Key Abstractions & Interfaces

### 1. TTS Provider Interface

```typescript
// features/reading/providers/interfaces.ts

export interface TTSProvider {
  readonly name: string;
  readonly capabilities: TTSCapabilities;

  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>;

  streamSynthesize?(
    text: string,
    onChunk: (chunk: AudioChunk) => void,
    options?: TTSOptions,
  ): Promise<void>;

  validateText(text: string): ValidationResult;
  estimateCost?(text: string, options?: TTSOptions): CostEstimate;
}

export interface TTSCapabilities {
  streaming: boolean;
  voices: Voice[];
  languages: string[];
  maxTextLength: number;
  supportsSSML: boolean;
  supportsWordTimings: boolean;
}

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
  confidence?: number;
  phonemes?: string[];
}

export interface TTSResult {
  audioUrl: string;
  wordTimings: WordTiming[];
  duration: number;
  metadata: {
    voice: string;
    language: string;
    provider: string;
    synthesizedAt: string;
  };
}
```

### 2. Audio Player Interface

```typescript
// services/audio/interfaces.ts

export interface AudioPlayer {
  readonly state: AudioState;
  readonly capabilities: AudioCapabilities;

  load(source: AudioSource): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(time: number): void;
  setRate(rate: number): void;
  setVolume(volume: number): void;

  getCurrentTime(): number;
  getDuration(): number;
  getBuffered(): TimeRanges;

  on<E extends AudioEvent>(event: E, handler: AudioEventHandler<E>): () => void;

  destroy(): void;
}

export interface AudioCapabilities {
  streamingSupport: boolean;
  rateAdjustment: boolean;
  gaplessPlayback: boolean;
  spatialAudio: boolean;
}

export type AudioEvent =
  | "loadstart"
  | "canplay"
  | "play"
  | "pause"
  | "timeupdate"
  | "ended"
  | "error";
```

### 3. Word Detection Strategy

```typescript
// features/reading/providers/interfaces.ts

export interface WordDetectionStrategy {
  findCurrentWord(
    audioTime: number,
    wordTimings: WordTiming[],
    options?: DetectionOptions,
  ): WordMatch | null;

  predictNextWords(
    currentIndex: number,
    wordTimings: WordTiming[],
    lookahead: number,
  ): number[];

  calculateConfidence(match: WordMatch): number;
}

export interface WordMatch {
  index: number;
  confidence: number;
  alternativeIndices?: number[];
}
```

---

## Development Setup

### 1. Initial Setup Script

```bash
#!/bin/bash
# scripts/setup.sh

echo "🚀 Setting up ReaderAI Frontend..."

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Generate TypeScript types for CSS modules
npm run generate-types

# Setup git hooks
npm run prepare

echo "✅ Setup complete! Run 'npm run dev' to start developing."
```

### 2. Environment Configuration

```env
# .env.example

# API Configuration
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

# Provider Configuration
VITE_TTS_PROVIDER=demo
VITE_AUDIO_PLAYER=html5
VITE_WORD_DETECTION=time-based

# Feature Flags
VITE_FEATURE_STREAMING=false
VITE_FEATURE_OFFLINE_MODE=false
VITE_FEATURE_ANALYTICS=false

# Development
VITE_MOCK_API=true
VITE_LOG_LEVEL=debug
```

### 3. NPM Scripts

```json
{
  "scripts": {
    // Development
    "dev": "vite",
    "dev:mock": "VITE_MOCK_API=true vite",
    "dev:prod-api": "VITE_API_URL=https://api.readerai.com vite",

    // Building
    "build": "tsc && vite build",
    "build:analyze": "ANALYZE=true npm run build",
    "preview": "vite preview",

    // Testing
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",

    // Code Quality
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives",
    "lint:fix": "npm run lint -- --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run lint && npm run test",

    // Utilities
    "generate:provider": "tsx scripts/generate-provider.ts",
    "analyze:bundle": "tsx scripts/analyze-bundle.ts",
    "clean": "rm -rf dist coverage .turbo",

    // Git Hooks
    "prepare": "husky install",
    "pre-commit": "lint-staged"
  }
}
```

---

## Styling Strategy

### Tailwind CSS Configuration

```javascript
// tailwind.config.js

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          500: "#3b82f6",
          900: "#1e3a8a",
        },
        reading: {
          highlight: "#fef3c7",
          "highlight-active": "#fbbf24",
        },
      },
      animation: {
        "word-highlight": "highlight 0.3s ease-in-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        highlight: {
          "0%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "#fef3c7" },
          "100%": { backgroundColor: "#fbbf24" },
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
```

### Component Styling Pattern

```typescript
// Consistent styling approach using cva (class-variance-authority)

import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
};
```

---

## Static Analysis & Code Quality

### 1. ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended",
    "prettier"
  ],
  "plugins": [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "jsx-a11y",
    "import"
  ],
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_"
      }
    ],
    "import/order": [
      "error",
      {
        "groups": ["builtin", "external", "internal", "parent", "sibling"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc" }
      }
    ],
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off"
  }
}
```

### 2. Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "always",
  "importOrder": ["^react", "^@reduxjs", "^[./]"],
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true
}
```

### 3. Pre-commit Hooks

```json
// .lintstagedrc.json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write", "vitest related --run"],
  "*.{css,md}": "prettier --write"
}
```

### 4. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Type Safety */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@features/*": ["src/features/*"],
      "@services/*": ["src/services/*"],
      "@shared/*": ["src/shared/*"],
      "@config/*": ["src/config/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

---

## Testing Strategy

### 1. Unit Testing with Vitest

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.ts",
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### 2. Test Setup

```typescript
// tests/setup.ts
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll } from "vitest";
import { server } from "./mocks/server";

// MSW Setup
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### 3. Testing Providers

```typescript
// tests/unit/features/reading/providers/DemoTTSProvider.test.ts
import { describe, it, expect } from "vitest";
import { DemoTTSProvider } from "@features/reading/providers/implementations/demo/DemoTTSProvider";

describe("DemoTTSProvider", () => {
  const provider = new DemoTTSProvider();

  describe("synthesize", () => {
    it("should return mock word timings", async () => {
      const text = "Hello world from tests";
      const result = await provider.synthesize(text);

      expect(result.wordTimings).toHaveLength(4);
      expect(result.wordTimings[0]).toMatchObject({
        word: "Hello",
        startTime: 0,
        endTime: 0.3,
      });
    });

    it("should calculate correct duration", async () => {
      const text = "Hello world";
      const result = await provider.synthesize(text);

      expect(result.duration).toBe(0.6); // 2 words × 0.3s
    });
  });

  describe("capabilities", () => {
    it("should not support streaming", () => {
      expect(provider.capabilities.streaming).toBe(false);
    });
  });
});
```

### 4. Testing React Components

```typescript
// tests/unit/features/reading/components/WordHighlighter.test.tsx
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { WordHighlighter } from '@features/reading/components/WordHighlighter';
import { setupStore } from '@/tests/utils/testStore';

describe('WordHighlighter', () => {
  it('should highlight current word', () => {
    const store = setupStore({
      reading: {
        passage: 'Hello world',
        currentWordIndex: 1,
      },
    });

    render(
      <Provider store={store}>
        <WordHighlighter />
      </Provider>
    );

    const highlightedWord = screen.getByText('world');
    expect(highlightedWord).toHaveClass('bg-reading-highlight-active');
  });
});
```

### 5. Integration Testing

```typescript
// tests/integration/flows/reading-session.test.ts
import { renderWithProviders } from '@/tests/utils';
import { ReadingInterface } from '@features/reading/components/ReadingInterface';
import { server } from '@/tests/mocks/server';
import { rest } from 'msw';

describe('Reading Session Flow', () => {
  it('should complete full reading flow', async () => {
    // Mock API responses
    server.use(
      rest.get('/api/passages/:id', (req, res, ctx) => {
        return res(ctx.json(mockPassage));
      })
    );

    const { user } = renderWithProviders(<ReadingInterface />);

    // Start reading
    await user.click(screen.getByRole('button', { name: /start/i }));

    // Wait for passage to load
    await waitFor(() => {
      expect(screen.getByText(mockPassage.text)).toBeInTheDocument();
    });

    // Test playback controls
    const playButton = screen.getByRole('button', { name: /play/i });
    await user.click(playButton);

    expect(playButton).toHaveAttribute('aria-pressed', 'true');
  });
});
```

---

## Build & Deployment

### 1. Vite Configuration

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      env.ANALYZE &&
        visualizer({
          open: true,
          filename: "dist/stats.html",
        }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@features": path.resolve(__dirname, "./src/features"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@shared": path.resolve(__dirname, "./src/shared"),
        "@config": path.resolve(__dirname, "./src/config"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "redux-vendor": ["@reduxjs/toolkit", "react-redux"],
            "ui-vendor": ["@headlessui/react", "@heroicons/react"],
          },
        },
      },
      sourcemap: mode === "development",
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        "/api": {
          target: env.VITE_API_URL || "http://localhost:8000",
          changeOrigin: true,
        },
        "/ws": {
          target: env.VITE_WS_URL || "ws://localhost:8000",
          ws: true,
        },
      },
    },
  };
});
```

### 2. Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run validate
      - run: npm run test:coverage

      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

---

## Provider Implementation Guide

### 1. Provider Generator Script

```typescript
// scripts/generate-provider.ts
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const generateProvider = (name: string, type: "tts" | "audio") => {
  const template = `
import { ${type === "tts" ? "TTSProvider" : "AudioPlayer"} } from '../../interfaces';

export class ${name}Provider implements ${type === "tts" ? "TTSProvider" : "AudioPlayer"} {
  readonly name = '${name.toLowerCase()}';

  // TODO: Implement interface methods
}
`;

  const dir = join(
    "src/features/reading/providers/implementations",
    name.toLowerCase(),
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}Provider.ts`), template);

  console.log(`✅ Generated ${name} provider at ${dir}`);
};

// Usage: npm run generate:provider -- GoogleTTS tts
```

### 2. Adding a New Provider

1. **Generate scaffold**: `npm run generate:provider -- AzureTTS tts`
2. **Implement interface methods**
3. **Register in ProviderFactory**
4. **Add environment config**
5. **Write tests**
6. **Update documentation**

---

## Migration Strategy

### Phase 1: Demo Implementation (Current)

- All providers return mock data
- Focus on UI/UX development
- Validate architecture patterns

### Phase 2: Single Provider Integration

- Implement one real TTS provider (e.g., Google)
- Keep demo as fallback
- A/B test with feature flags

### Phase 3: Multi-Provider Support

- Add additional providers
- Implement provider selection UI
- Cost optimization logic

### Phase 4: Advanced Features

- Streaming support
- Offline caching
- Predictive preloading

---

## Monitoring & Analytics

```typescript
// services/monitoring/analytics.ts
interface AnalyticsEvent {
  category: "reading" | "interaction" | "error";
  action: string;
  label?: string;
  value?: number;
}

export class Analytics {
  static track(event: AnalyticsEvent): void {
    if (!import.meta.env.VITE_FEATURE_ANALYTICS) return;

    // Implementation depends on provider
    switch (import.meta.env.VITE_ANALYTICS_PROVIDER) {
      case "google":
        window.gtag?.("event", event.action, {
          event_category: event.category,
          event_label: event.label,
          value: event.value,
        });
        break;
      case "mixpanel":
        window.mixpanel?.track(event.action, event);
        break;
    }
  }
}
```

---

## Conclusion

This architecture provides:

1. **Flexibility**: Swap providers without changing app code
2. **Type Safety**: Full TypeScript coverage with strict mode
3. **Testability**: Every component testable in isolation
4. **Performance**: Code splitting and lazy loading
5. **Developer Experience**: Fast builds, hot reload, great tooling
6. **Production Ready**: Monitoring, error handling, analytics

The key is maintaining clean boundaries between layers and always coding against interfaces, not implementations. This ensures the demo code written today can seamlessly transition to production services tomorrow.
