import { z } from "zod";
import {
  SchoolSchema,
  SchoolQuerySchema,
  PaginationSchema,
  SchoolResponseSchema,
  SyncResponseSchema,
  SyncStatusResponseSchema,
  ErrorResponseSchema,
} from "./schema";

export function generateOpenAPISpec(): Record<string, unknown> {
  return {
    openapi: "3.0.0",
    info: {
      title: "NZ Schools API",
      version: "0.0.3",
      description:
        "API for New Zealand school data - filter, search, and retrieve comprehensive school information directly from the Ministry of Education dataset.",
    },
    servers: [
      { url: "https://schools.tom.so", description: "Production" },
      { url: "https://dev.schools.tom.so", description: "Development" },
    ],
    tags: [
      { name: "Authentication", description: "API key management" },
      { name: "Schools", description: "School data retrieval operations" },
      { name: "Sync", description: "Data sync operations" },
      { name: "Health", description: "API health and status" },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description:
            "API key required to access /v1/* endpoints. Contact the API maintainer to obtain a key.",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Invalid or missing API key",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  error: { type: "string", example: "Unauthorized" },
                  message: {
                    type: "string",
                    example:
                      "Invalid or missing API key. Please provide a valid API key in the x-api-key header.",
                  },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "API health check",
          operationId: "getHealth",
          responses: {
            "200": {
              description: "API is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "ok" },
                      timestamp: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/": {
        get: {
          tags: ["Health"],
          summary: "API root information",
          operationId: "getRoot",
          responses: {
            "200": {
              description: "API information",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      version: { type: "string" },
                      docs: { type: "string" },
                      endpoints: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/request-key": {
        post: {
          tags: ["Authentication"],
          summary: "Request a new API key",
          operationId: "requestApiKey",
          description:
            "Request a new API key for accessing the /v1/* endpoints. The key will only be shown once, so make sure to save it.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email"],
                  properties: {
                    name: {
                      type: "string",
                      minLength: 1,
                      maxLength: 100,
                      description: "Your name or application name",
                      example: "My App",
                    },
                    email: {
                      type: "string",
                      format: "email",
                      description: "Your email address",
                      example: "user@example.com",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "API key created successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string" },
                      apiKey: {
                        type: "string",
                        description:
                          "Your API key. Save this - it will not be shown again.",
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Invalid request body",
            },
            "500": {
              description: "Failed to create API key",
            },
          },
        },
      },
      "/v1/schools": {
        get: {
          tags: ["Schools"],
          summary: "Get all schools with filtering",
          operationId: "getAllSchools",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "name",
              in: "query",
              description: "Filter by school name (partial match)",
              schema: { type: "string" },
            },
            {
              name: "city",
              in: "query",
              description: "Filter by city (partial match)",
              schema: { type: "string" },
            },
            {
              name: "suburb",
              in: "query",
              description: "Filter by suburb (partial match)",
              schema: { type: "string" },
            },
            {
              name: "authority",
              in: "query",
              description: "Filter by education authority",
              schema: { type: "string" },
            },
            {
              name: "status",
              in: "query",
              description: "Filter by school status",
              schema: { type: "string" },
            },
            {
              name: "org_type",
              in: "query",
              description: "Filter by organization type",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              description: "Page number (default: 1)",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              description: "Results per page (default: 20, max: 100)",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": {
              description: "Successfully retrieved schools",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: {} },
                      pagination: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
                          totalPages: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              $ref: "#/components/responses/UnauthorizedError",
            },
            "429": {
              description: "Rate limit exceeded",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      message: { type: "string" },
                      resetAt: { type: "string", format: "date-time" },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/v1/schools/search": {
        get: {
          tags: ["Schools"],
          summary: "Full-text search schools by name",
          operationId: "searchSchools",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              description: "Search query",
              schema: { type: "string", minLength: 1 },
            },
            {
              name: "page",
              in: "query",
              description: "Page number (default: 1)",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              description: "Results per page (default: 20, max: 100)",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": {
              description: "Search results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: {} },
                      pagination: {
                        type: "object",
                        properties: {
                          page: { type: "integer" },
                          limit: { type: "integer" },
                          total: { type: "integer" },
                          totalPages: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded",
            },
            "401": {
              $ref: "#/components/responses/UnauthorizedError",
            },
            "500": {
              description: "Server error",
            },
          },
        },
      },
      "/v1/schools/id/{schoolId}": {
        get: {
          tags: ["Schools"],
          summary: "Get school by School ID",
          operationId: "getSchoolById",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "schoolId",
              in: "path",
              required: true,
              description: "School ID",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "School details",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "object" },
                    },
                  },
                },
              },
            },
            "404": {
              description: "School not found",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      error: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded",
            },
            "401": {
              $ref: "#/components/responses/UnauthorizedError",
            },
            "500": {
              description: "Server error",
            },
          },
        },
      },
      "/v1/schools/city/{city}": {
        get: {
          tags: ["Schools"],
          summary: "Get schools by city",
          operationId: "getSchoolsByCity",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "city",
              in: "path",
              required: true,
              description: "City name",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": { description: "Schools in city" },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
            "429": { description: "Rate limit exceeded" },
            "500": { description: "Server error" },
          },
        },
      },
      "/v1/schools/suburb/{suburb}": {
        get: {
          tags: ["Schools"],
          summary: "Get schools by suburb",
          operationId: "getSchoolsBySuburb",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "suburb",
              in: "path",
              required: true,
              description: "Suburb name",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": { description: "Schools in suburb" },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
            "429": { description: "Rate limit exceeded" },
            "500": { description: "Server error" },
          },
        },
      },
      "/v1/schools/authority/{authority}": {
        get: {
          tags: ["Schools"],
          summary: "Get schools by authority",
          operationId: "getSchoolsByAuthority",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "authority",
              in: "path",
              required: true,
              description: "Education authority",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": { description: "Schools by authority" },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
            "429": { description: "Rate limit exceeded" },
            "500": { description: "Server error" },
          },
        },
      },
      "/v1/schools/status/{status}": {
        get: {
          tags: ["Schools"],
          summary: "Get schools by status",
          operationId: "getSchoolsByStatus",
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: "status",
              in: "path",
              required: true,
              description: "School status",
              schema: { type: "string" },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": { description: "Schools by status" },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
            "429": { description: "Rate limit exceeded" },
            "500": { description: "Server error" },
          },
        },
      },
      "/v1/sync": {
        post: {
          tags: ["Sync"],
          summary: "Trigger manual data sync",
          operationId: "triggerSync",
          security: [{ ApiKeyAuth: [] }],
          responses: {
            "200": {
              description: "Sync completed",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      recordCount: { type: "integer" },
                      lastSync: { type: "string", format: "date-time" },
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
            "429": { description: "Rate limit exceeded" },
            "500": {
              description: "Sync failed",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/v1/sync/status": {
        get: {
          tags: ["Sync"],
          summary: "Get sync status",
          operationId: "getSyncStatus",
          security: [{ ApiKeyAuth: [] }],
          responses: {
            "200": {
              description: "Current sync status",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      lastSync: {
                        type: ["string", "null"],
                        format: "date-time",
                      },
                      recordCount: { type: "integer" },
                      isStale: { type: "boolean" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
            "429": { description: "Rate limit exceeded" },
            "500": { description: "Server error" },
          },
        },
      },
    },
  };
}
