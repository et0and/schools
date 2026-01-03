# Schools

A Cloudflare Workers API service that provides access to New Zealand school directory data with caching, rate limiting, and OpenAPI documentation.

This uses public data from [data.govt.nz](https://data.govt.nz), but provides a RESTful interface and some performance benefits thanks to Cloudflare. I haven't done any proper benchmarking yet, but this should be considerably faster than trying to query the data.govt.nz site directly.

### Endpoints

- `GET /v1/schools` - Get all schools
- `GET /v1/schools/name/:name` - Search schools by name (partial match)
- `GET /v1/schools/city/:city` - Search schools by city (partial match)
- `GET /v1/schools/status/:status` - Search schools by status (exact match)
- `GET /v1/schools/authority/:authority` - Search schools by authority (exact match)
- `GET /v1/schools/suburb/:suburb` - Search schools by suburb (partial match)
- `GET /v1/schools/email/:email` - Search schools by email (partial match)
- `GET /v1/rate-limit` - Get current rate limit status

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

## Disclaimer

This is purely a hobby project I started to use Hono and Cloudflare Workers. Some of the architectural decisions and patterns are a bit undercooked, so this should not be used for anything serious.

I'm planning on refactoring a lot of this soon to use Effect (mainly for better error handling patterns and type safety).