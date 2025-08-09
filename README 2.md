# MCP Chat UI

A React-based user interface for interacting with Model Context Protocol (MCP) servers.

## Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router
- **Internationalization**: react-i18next
- **Code Quality**: ESLint + Prettier

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── store/         # Zustand state management
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
├── i18n/          # Internationalization configuration
└── main.tsx       # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Path Aliases

The project uses path aliases for cleaner imports:

- `@/*` - src/*
- `@/components/*` - src/components/*
- `@/pages/*` - src/pages/*
- `@/hooks/*` - src/hooks/*
- `@/store/*` - src/store/*
- `@/utils/*` - src/utils/*
- `@/types/*` - src/types/*
- `@/i18n/*` - src/i18n/*

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173 in your browser

## Development

The project is set up with:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS for styling
- Path aliases for clean imports
- Basic project structure with placeholder components