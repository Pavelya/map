# Team Vote Map

A real-time collaborative voting and mapping platform built with Next.js 14, TypeScript, and modern web technologies.

## Tech Stack

- **Framework**: Next.js 14.2+ with App Router
- **Language**: TypeScript 5.3+ (strict mode enabled)
- **Package Manager**: pnpm
- **Node Version**: 20 LTS
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Caching**: Upstash Redis
- **Maps**: Mapbox GL + Deck.gl
- **Real-time**: Socket.io
- **State Management**: Zustand
- **Animation**: Framer Motion
- **UI Components**: Radix UI
- **Logging**: Winston
- **Monitoring**: Sentry

## Getting Started

### Prerequisites

- Node.js 20 LTS
- pnpm (installed globally)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Update `.env.local` with your actual values (see Environment Variables section)

5. Start the development server:
   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

All required environment variables are documented in `.env.example`. Key variables include:

- **Database**: Supabase URL and keys
- **Caching**: Upstash Redis credentials
- **Maps**: Mapbox access token
- **Security**: JWT secrets and hCaptcha keys
- **Monitoring**: Sentry DSN and auth tokens
- **Email**: Resend API key
- **Media**: Cloudinary credentials

### Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript compiler check

## Project Structure

```
src/
├── app/                 # Next.js App Router pages and API routes
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Home page
└── lib/                # Utility libraries
    ├── db.ts           # Database client (Supabase)
    └── logger.ts       # Winston logger configuration
```

## Logging

The application uses Winston for structured logging with the following features:

- **Console output**: Colorized, human-readable format
- **File output**: JSON format in `logs/` directory
- **Log levels**: error, warn, info, http, debug
- **Log rotation**: 5MB max file size, 5 files retained
- **Environment-based**: Debug level in development, info in production

Log files:
- `logs/all.log` - All log levels
- `logs/error.log` - Error level only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

## Development

### TypeScript Configuration

The project uses strict TypeScript configuration with all strictness flags enabled:
- `strict: true`
- `strictNullChecks: true`
- `noImplicitAny: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`

### Code Quality

- ESLint with TypeScript support
- Prettier for code formatting
- Strict TypeScript compilation
- Zero tolerance for TypeScript errors

## Testing

Test the setup:

1. **Logger test**: Check `logs/` directory for log files after running the app
2. **API test**: Visit `/api/test` to verify logger and API functionality
3. **Type check**: Run `pnpm type-check` to ensure no TypeScript errors
4. **Build test**: Run `pnpm build` to verify production build

## License

Private project - All rights reserved.