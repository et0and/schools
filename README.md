# Schools API

A Cloudflare Workers API service that provides access to New Zealand schools data with caching, rate limiting, and OpenAPI documentation.

## Features

- **Data Caching**: Schools data is cached in D1 database and KV store for fast access
- **Rate Limiting**: 100 requests per 15-minute window per IP address
- **OpenAPI Documentation**: Auto-generated API docs available at `/docs`
- **Multiple Search Endpoints**: Search schools by name, city, status, authority, suburb, or email
- **TypeScript**: Fully typed with Zod schemas for validation

## API Endpoints

### Base URL

All endpoints are prefixed with `/v1`

### Endpoints

- `GET /v1/schools` - Get all schools
- `GET /v1/schools/name/:name` - Search schools by name (partial match)
- `GET /v1/schools/city/:city` - Search schools by city (partial match)
- `GET /v1/schools/status/:status` - Search schools by status (exact match)
- `GET /v1/schools/authority/:authority` - Search schools by authority (exact match)
- `GET /v1/schools/suburb/:suburb` - Search schools by suburb (partial match)
- `GET /v1/schools/email/:email` - Search schools by email (partial match)
- `GET /v1/rate-limit` - Get current rate limit status

### Response Format

All endpoints return JSON with the following structure:

```json
{
  "data": [...],
  "count": 123
}
```

## Rate Limiting

- **Limit**: 100 requests per 15 minutes
- **Headers**: Response includes `X-RateLimit-Remaining` and `X-RateLimit-Reset`
- **429 Status**: Rate limit exceeded returns retry information

## Development

### Prerequisites

- Node.js
- npm or bun
- Cloudflare account with Workers, D1, and KV enabled

### Setup

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create D1 database and KV namespace:

   ```bash
   npx wrangler d1 create schools_database
   npx wrangler kv:namespace create "schools_cache_namespace"
   ```

4. Update `wrangler.jsonc` with the actual database ID and KV namespace ID

5. Run database migrations:

   ```bash
   npx wrangler d1 migrations apply schools_database
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

### Deployment

```bash
npm run deploy
```

## Data Source

School data is sourced from the New Zealand Government's data portal: https://catalogue.data.govt.nz/dataset/directory-of-educational-organisations

The API automatically fetches fresh data every 24 hours and caches it for optimal performance.

## Architecture

- **Hono**: HTTP framework for Cloudflare Workers
- **D1**: SQLite database for persistent storage
- **KV**: Key-value store for caching and rate limiting
- **Zod**: Schema validation and TypeScript type generation
- **OpenAPI**: Auto-generated API documentation

## Project Structure

```
src/
├── index.ts          # Main application and routes
├── types.ts          # Zod schemas and TypeScript types
└── services/
    ├── schools.ts    # Data fetching and caching service
    └── rateLimit.ts  # Rate limiting service

migrations/
└── 001_initial_schema.sql  # Database schema
```
