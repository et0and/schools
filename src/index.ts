import type {
  ScheduledEvent,
  ExecutionContext,
} from "@cloudflare/workers-types";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { zValidator } from "@hono/zod-validator";
import { swaggerUI } from "@hono/swagger-ui";
import { z } from "zod";
import { createClient } from "@libsql/client";

import { DatabaseService } from "./db";
import { CacheService, RateLimitService } from "./cache";
import { SyncService } from "./sync";
import { generateOpenAPISpec } from "./openapi";
import {
  SchoolQuerySchema,
  PaginationSchema,
  SchoolResponseSchema,
  SingleSchoolResponseSchema,
  ErrorResponseSchema,
  type CloudflareBindings,
} from "./schema";

type Bindings = CloudflareBindings;

const app = new Hono<{ Bindings: Bindings }>();

function createTursoClient(env: Bindings) {
  return createClient({
    url: env.TURSO_URL,
    authToken: env.TURSO_TOKEN,
  });
}

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", prettyJSON());

// Rate limiting middleware
app.use("/v1/*", async (c, next) => {
  const rateLimitService = new RateLimitService(c.env.SCHOOLS_CACHE);
  const ip = c.req.header("cf-connecting-ip") || "unknown";

  const result = await rateLimitService.checkRateLimit(ip, 100, 60 * 1000); // 100 requests per minute

  c.header("X-RateLimit-Limit", "100");
  c.header("X-RateLimit-Remaining", result.remaining.toString());
  c.header("X-RateLimit-Reset", new Date(result.resetAt).toISOString());

  if (!result.allowed) {
    return c.json(
      {
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again later.",
        resetAt: new Date(result.resetAt).toISOString(),
      },
      429
    );
  }

  await next();
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug endpoint
app.get("/debug/env", (c) => {
  return c.json({
    TURSO_URL: c.env.TURSO_URL,
    TURSO_TOKEN: c.env.TURSO_TOKEN ? "***" : "undefined",
    SCHOOLS_CACHE: c.env.SCHOOLS_CACHE ? "exists" : "undefined"
  });
});

// API Documentation
app.get("/", swaggerUI({ url: "/openapi.json" }));

// OpenAPI spec endpoint
app.get("/openapi.json", (c) => {
  return c.json(generateOpenAPISpec());
});

// Get all schools with filtering
app.get("/v1/schools", zValidator("query", SchoolQuerySchema), async (c) => {
  const query = c.req.valid("query");
  const db = new DatabaseService(createTursoClient(c.env));

  try {
    const { schools, total } = await db.querySchools(query);
    const totalPages = Math.ceil(total / query.limit);

    return c.json({
      data: schools,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error querying schools:", error);
    return c.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Full-text search by name
app.get(
  "/v1/schools/search",
  zValidator(
    "query",
    z.object({
      q: z.string().min(1),
      ...PaginationSchema.shape,
    })
  ),
  async (c) => {
    const { q, page, limit } = c.req.valid("query");
    const db = new DatabaseService(createTursoClient(c.env));

    try {
      const offset = (page - 1) * limit;
      const { schools, total } = await db.searchSchoolsByName(q, limit, offset);
      const totalPages = Math.ceil(total / limit);

      return c.json({
        data: schools,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Error searching schools:", error);
      return c.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get school by School_Id
app.get("/v1/schools/id/:schoolId", async (c) => {
  const schoolId = c.req.param("schoolId");
  const db = new DatabaseService(createTursoClient(c.env));

  try {
    const school = await db.getSchoolBySchoolId(schoolId);

    if (!school) {
      return c.json(
        {
          error: "Not found",
          message: `School with ID ${schoolId} not found`,
        },
        404
      );
    }

    return c.json({ data: school });
  } catch (error) {
    console.error("Error getting school:", error);
    return c.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get schools by city
app.get(
  "/v1/schools/city/:city",
  zValidator("query", PaginationSchema),
  async (c) => {
    const city = c.req.param("city");
    const { page, limit } = c.req.valid("query");
    const db = new DatabaseService(createTursoClient(c.env));

    try {
      const { schools, total } = await db.querySchools({ city, page, limit });
      const totalPages = Math.ceil(total / limit);

      return c.json({
        data: schools,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Error querying schools by city:", error);
      return c.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get schools by suburb
app.get(
  "/v1/schools/suburb/:suburb",
  zValidator("query", PaginationSchema),
  async (c) => {
    const suburb = c.req.param("suburb");
    const { page, limit } = c.req.valid("query");
    const db = new DatabaseService(createTursoClient(c.env));

    try {
      const { schools, total } = await db.querySchools({ suburb, page, limit });
      const totalPages = Math.ceil(total / limit);

      return c.json({
        data: schools,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Error querying schools by suburb:", error);
      return c.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get schools by authority
app.get(
  "/v1/schools/authority/:authority",
  zValidator("query", PaginationSchema),
  async (c) => {
    const authority = c.req.param("authority");
    const { page, limit } = c.req.valid("query");
    const db = new DatabaseService(createTursoClient(c.env));

    try {
      const { schools, total } = await db.querySchools({
        authority,
        page,
        limit,
      });
      const totalPages = Math.ceil(total / limit);

      return c.json({
        data: schools,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Error querying schools by authority:", error);
      return c.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Get schools by status
app.get(
  "/v1/schools/status/:status",
  zValidator("query", PaginationSchema),
  async (c) => {
    const status = c.req.param("status");
    const { page, limit } = c.req.valid("query");
    const db = new DatabaseService(createTursoClient(c.env));

    try {
      const { schools, total } = await db.querySchools({ status, page, limit });
      const totalPages = Math.ceil(total / limit);

      return c.json({
        data: schools,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Error querying schools by status:", error);
      return c.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  }
);

// Seed database endpoint
app.post("/v1/seed", async (c) => {
  const db = new DatabaseService(createTursoClient(c.env));
  const cache = new CacheService(c.env.SCHOOLS_CACHE);
  const sync = new SyncService(db, cache);

  try {
    const result = await sync.syncData();
    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    console.error("Seed failed:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Manual sync trigger
app.post("/v1/sync", async (c) => {
  const db = new DatabaseService(createTursoClient(c.env));
  const cache = new CacheService(c.env.SCHOOLS_CACHE);
  const sync = new SyncService(db, cache);

  try {
    const result = await sync.syncData();
    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    console.error("Sync failed:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Get sync status
app.get("/v1/sync/status", async (c) => {
  const db = new DatabaseService(createTursoClient(c.env));
  const cache = new CacheService(c.env.SCHOOLS_CACHE);
  const sync = new SyncService(db, cache);

  try {
    const info = await sync.getLastSyncInfo();
    return c.json(info);
  } catch (error) {
    console.error("Error getting sync status:", error);
    return c.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Root endpoint
app.get("/", (c) => {
  return c.json({
    message: "NZ Schools API",
    version: "1.0.0",
    docs: "/docs",
    endpoints: {
      "POST /v1/seed": "Seed database with schools data",
      "GET /v1/schools": "Get all schools with filtering and pagination",
      "GET /v1/schools/search?q={query}": "Full-text search schools by name",
      "GET /v1/schools/id/{schoolId}": "Get school by School ID",
      "GET /v1/schools/city/{city}": "Get schools by city",
      "GET /v1/schools/suburb/{suburb}": "Get schools by suburb",
      "GET /v1/schools/authority/{authority}": "Get schools by authority",
      "GET /v1/schools/status/{status}": "Get schools by status",
      "POST /v1/sync": "Trigger manual data sync",
      "GET /v1/sync/status": "Get sync status",
    },
  });
});

// Scheduled task handler for automatic sync
export default {
  fetch: app.fetch,

  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    console.log("Running scheduled sync task...");

    const db = new DatabaseService(createTursoClient(env));
    const cache = new CacheService(env.SCHOOLS_CACHE);
    const sync = new SyncService(db, cache);

    ctx.waitUntil(
      sync.syncData().then((result) => {
        if (result.success) {
          console.log(
            `Scheduled sync completed: ${result.recordCount} records`
          );
        } else {
          console.error(`Scheduled sync failed: ${result.error}`);
        }
      })
    );
  },
};
