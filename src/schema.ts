import { z } from "zod";

// Base school schema
export const SchoolSchema = z.object({
  _id: z.number(),
  School_Id: z.string(),
  Org_Name: z.string(),
  Telephone: z.string().optional(),
  Fax: z.string().optional(),
  Email: z.string().optional(),
  Contact1_Name: z.string().optional(),
  URL: z.string().optional(),
  Add1_Line1: z.string().optional(),
  Add1_Suburb: z.string().optional(),
  Add1_City: z.string().optional(),
  Add2_Line1: z.string().optional(),
  Add2_Suburb: z.string().optional(),
  Add2_City: z.string().optional(),
  Add2_Postal_Code: z.string().optional(),
  Urban_Rural_Indicator: z.string().optional(),
  Org_Type: z.string().optional(),
  Definition: z.string().optional(),
  Authority: z.string().optional(),
  School_Donations: z.string().optional(),
  CoEd_Status: z.string().optional(),
  KMEPeakBody: z.string().optional(),
  Takiwā: z.string().optional(),
  Territorial_Authority: z.string().optional(),
  Regional_Council: z.string().optional(),
  Local_Office_Name: z.string().optional(),
  Education_Region: z.string().optional(),
  General_Electorate: z.string().optional(),
  Māori_Electorate: z.string().optional(),
  Statistical_Area_2_Code: z.string().optional(),
  Statistical_Area_2_Description: z.string().optional(),
  Ward: z.string().optional(),
  Col_Id: z.string().optional(),
  Col_Name: z.string().optional(),
  Latitude: z.number().optional(),
  Longitude: z.number().optional(),
  Enrolment_Scheme: z.string().optional(),
  EQi_Index: z.string().optional(),
  Roll_Date: z.string().optional(),
  Total: z.number().optional(),
  European: z.number().optional(),
  Māori: z.number().optional(),
  Pacific: z.number().optional(),
  Asian: z.number().optional(),
  MELAA: z.number().optional(),
  Other: z.number().optional(),
  International: z.number().optional(),
  Isolation_Index: z.string().optional(),
  Language_of_Instruction: z.string().optional(),
  BoardingFacilities: z.string().optional(),
  CohortEntry: z.string().optional(),
  Status: z.string().optional(),
  DateSchoolOpened: z.string().optional(),
});

// Query schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SchoolQuerySchema = z
  .object({
    name: z.string().optional(),
    city: z.string().optional(),
    suburb: z.string().optional(),
    authority: z.string().optional(),
    status: z.string().optional(),
    org_type: z.string().optional(),
  })
  .merge(PaginationSchema);

// Response schemas
export const SchoolResponseSchema = z.object({
  data: z.array(SchoolSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const SingleSchoolResponseSchema = z.object({
  data: SchoolSchema,
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  resetAt: z.string().optional(),
});

// Sync response schemas
export const SyncResponseSchema = z.object({
  success: z.boolean(),
  recordCount: z.number().optional(),
  lastSync: z.string().optional(),
  error: z.string().optional(),
});

export const SyncStatusResponseSchema = z.object({
  lastSync: z.string().nullable(),
  recordCount: z.number(),
  isStale: z.boolean(),
});

export const SchoolsApiResponseSchema = z.object({
  success: z.boolean(),
  result: z.object({
    records: z.array(SchoolSchema),
  }),
});

// Type exports
export type School = z.infer<typeof SchoolSchema>;
export type SchoolQuery = z.infer<typeof SchoolQuerySchema>;
export type SchoolResponse = z.infer<typeof SchoolResponseSchema>;
export type SingleSchoolResponse = z.infer<typeof SingleSchoolResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type SyncResponse = z.infer<typeof SyncResponseSchema>;
export type SyncStatusResponse = z.infer<typeof SyncStatusResponseSchema>;
export type SchoolsApiResponse = z.infer<typeof SchoolsApiResponseSchema>;

// Cloudflare bindings interface
export interface CloudflareBindings {
  SCHOOLS_CACHE: KVNamespace;
  TURSO_URL: string;
  TURSO_TOKEN: string;
  UNKEY_ROOT_KEY: string;
  UNKEY_API_ID: string;
}
