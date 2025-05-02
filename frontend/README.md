# ReaderAI Frontend

This is the frontend for the ReaderAI application, built with React, TypeScript, Vite, Chakra UI, and Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Development Guide

### Prerequisites

- Node.js (v16+)
- npm

### Setup & Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start development server**:

   ```bash
   npm run dev
   ```

3. **Build for production**:

   ```bash
   npm run build
   ```

4. **Preview production build**:
   ```bash
   npm run preview
   ```

### Development Features

- **Dark Mode Toggle**: A button to toggle between light and dark mode is available only in development mode. This helps developers test both themes but is hidden in production.

### Code Quality Tools

- **Linting**:

  ```bash
  npm run lint
  ```

- **Formatting**:
  ```bash
  npm run format
  ```

Note: The project uses ESM modules (type: "module" in package.json). ESLint is configured using JSON format for better compatibility with ESM projects.

## Project Architecture

### Tech Stack

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Chakra UI
- **State Management**: React Context + Hooks
- **Data Fetching**: TanStack React Query
- **HTTP Client**: Native Fetch API

### Directory Structure

```
frontend/
├── public/              # Static assets
├── src/
│   ├── features/        # Feature-based modules
│   │   └── reader/      # Reader feature
│   │       ├── components/ # Reader components
│   │       └── hooks/      # Reader-specific hooks
│   ├── hooks/           # Global custom hooks
│   ├── services/        # API services
│   ├── App.tsx          # Root component
│   ├── index.css        # Global styles
│   └── main.tsx         # Entry point
├── .eslintrc.json       # ESLint configuration
├── .prettierrc          # Prettier configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── vite.config.ts       # Vite configuration
```

### Core Features

#### Reader Component

The Reader component is the central feature of the application:

- Highlights words as they are read
- Synchronizes text-to-speech with visual highlighting
- Provides play/pause/reset controls

Example usage:

```tsx
<Reader text="This is a sample text that will be read aloud." />
```

## Backend Integration

### API Communication

The application uses React Query and a custom `fetchClient` for API calls:

```tsx
import { useQuery } from "@tanstack/react-query";
import fetchClient from "../services/fetchClient";

function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ["passages"],
    queryFn: () => fetchClient("/api/passages").then((res) => res.data),
  });

  // Use data in your component
}
```

## Development Workflow Best Practices

1. **Component Development**:

   - Create components in the appropriate feature directory
   - Use Chakra UI for component base and Tailwind for custom styling
   - Follow atomic design principles where possible

2. **State Management**:

   - Use React Query for server state
   - Use React Context for global UI state
   - Use component state for local UI state

3. **TypeScript**:

   - Define interfaces for all props
   - Use type inference where appropriate
   - Avoid `any` types

4. **Testing**:
   - Write tests for critical components and hooks
   - Test user interactions and edge cases

## Troubleshooting

### Common Issues

- **Module not found errors**: Check import paths and make sure the module exists
- **TypeScript errors**: Ensure proper types are defined for all variables and functions
- **Styling conflicts**: Chakra UI and Tailwind can sometimes conflict - use Chakra's `sx` prop or Tailwind's `@apply` directive to resolve conflicts

## Contributing

Please follow these guidelines when contributing to the frontend:

1. Follow the established code style (enforced by ESLint and Prettier)
2. Create feature branches for new features
3. Write meaningful commit messages
4. Update documentation as needed
5. Add tests for new functionality
