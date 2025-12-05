import { eq, like, and, or, sql, desc } from "drizzle-orm";
import { createDb } from "./drizzle";
import { schools } from "./db/schema";
import type { School, SchoolQuery } from "./schema";
import type { Client } from "@libsql/client";

export class DatabaseService {
  private db: ReturnType<typeof createDb>;

  constructor(connection: Client) {
    this.db = createDb(connection);
  }

  async querySchools(
    query: SchoolQuery,
  ): Promise<{ schools: School[]; total: number }> {
    const { page, limit, name, city, suburb, authority, status, org_type } =
      query;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (name) conditions.push(like(schools.Org_Name, `%${name}%`));
    if (city) conditions.push(like(schools.Add1_City, `%${city}%`));
    if (suburb) conditions.push(like(schools.Add1_Suburb, `%${suburb}%`));
    if (authority) conditions.push(eq(schools.Authority, authority));
    if (status) conditions.push(eq(schools.Status, status));
    if (org_type) conditions.push(eq(schools.Org_Type, org_type));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schools)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;

    const schoolsResult = await this.db
      .select()
      .from(schools)
      .where(whereClause)
      .orderBy(schools.Org_Name)
      .limit(limit)
      .offset(offset);

    return { schools: schoolsResult, total };
  }

  async searchSchoolsByName(
    searchTerm: string,
    limit: number,
    offset: number,
  ): Promise<{ schools: School[]; total: number }> {
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schools)
      .where(like(schools.Org_Name, `%${searchTerm}%`));

    const total = totalResult[0]?.count || 0;

    const schoolsResult = await this.db
      .select()
      .from(schools)
      .where(like(schools.Org_Name, `%${searchTerm}%`))
      .orderBy(schools.Org_Name)
      .limit(limit)
      .offset(offset);

    return { schools: schoolsResult, total };
  }

  async getSchoolBySchoolId(schoolId: string): Promise<School | null> {
    const result = await this.db
      .select()
      .from(schools)
      .where(eq(schools.School_Id, schoolId))
      .limit(1);

    return result[0] || null;
  }

  async getAllSchools(): Promise<School[]> {
    return await this.db.select().from(schools).orderBy(schools.Org_Name);
  }

  async saveSchools(schoolsData: School[]): Promise<void> {
    await this.db.delete(schools);

    const batchSize = 100;
    for (let i = 0; i < schoolsData.length; i += batchSize) {
      const batch = schoolsData.slice(i, i + batchSize);
      await this.db.insert(schools).values(batch);
    }
  }

  async getRecordCount(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schools);

    return result[0]?.count || 0;
  }

  async getLastUpdated(): Promise<Date | null> {
    const result = await this.db
      .select({ updated_at: schools.updated_at })
      .from(schools)
      .orderBy(desc(schools.updated_at))
      .limit(1);

    return result[0]?.updated_at || null;
  }
}
