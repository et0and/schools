import { eq, like, or } from 'drizzle-orm'
import { createDb } from '../drizzle'
import { createClient } from '@libsql/client'
import { schools } from '../db/schema'
import { School, SchoolsApiResponse, CloudflareBindings } from '../schema'

const API_URL = 'https://catalogue.data.govt.nz/api/3/action/datastore_search'
const RESOURCE_ID = '4b292323-9fcc-41f8-814b-3c7b19cf14b3'
const CACHE_KEY = 'schools_data'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export class SchoolsService {
  private db: ReturnType<typeof createDb>

  constructor(private env: CloudflareBindings) {
    const client = createClient({
      url: env.TURSO_URL,
      authToken: env.TURSO_TOKEN,
    })
    this.db = createDb(client)
  }

  async fetchFromExternalAPI(limit = 32000): Promise<School[]> {
    const url = `${API_URL}?resource_id=${RESOURCE_ID}&limit=${limit}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch schools data: ${response.status}`)
    }

    const data: SchoolsApiResponse = await response.json()

    if (!data.success) {
      throw new Error('External API returned success: false')
    }

    return data.result.records
  }

  async getCachedData(): Promise<{ data: School[] | null; isStale: boolean }> {
    try {
      const cacheEntry = await this.env.SCHOOLS_CACHE.get(CACHE_KEY)
      if (!cacheEntry) {
        return { data: null, isStale: true }
      }

      const parsed = JSON.parse(cacheEntry)
      const lastUpdated = new Date(parsed.lastUpdated)
      const isStale = Date.now() - lastUpdated.getTime() > CACHE_TTL

      return {
        data: parsed.data,
        isStale
      }
    } catch (error) {
      console.error('Error reading from cache:', error)
      return { data: null, isStale: true }
    }
  }

  async cacheData(data: School[]): Promise<void> {
    const cacheEntry = {
      data,
      lastUpdated: new Date().toISOString(),
      count: data.length
    }

    await this.env.SCHOOLS_CACHE.put(CACHE_KEY, JSON.stringify(cacheEntry))
  }

  async getSchoolsFromDB(): Promise<School[]> {
    const result = await this.db.select().from(schools).orderBy(schools.Org_Name)
    return result
  }

  async saveSchoolsToDB(schoolsData: School[]): Promise<void> {
    await this.db.delete(schools)

    for (const school of schoolsData) {
      await this.db.insert(schools).values(school)
    }
  }

  async ensureDataIsFresh(): Promise<School[]> {
    const { data, isStale } = await this.getCachedData()

    if (!data || isStale) {
      console.log('Fetching fresh data from external API...')
      const freshData = await this.fetchFromExternalAPI()

      // Cache the data
      await this.cacheData(freshData)

      // Save to database
      await this.saveSchoolsToDB(freshData)

      return freshData
    }

    // Check if data exists in DB
    const dbData = await this.getSchoolsFromDB()
    if (dbData.length === 0) {
      // If cache exists but DB is empty, save to DB
      await this.saveSchoolsToDB(data)
    }

    return data
  }

  async searchSchools(query: string, field: string): Promise<School[]> {
    // Ensure data is fresh
    await this.ensureDataIsFresh()

    let whereCondition

    switch (field) {
      case 'name':
        whereCondition = like(schools.Org_Name, `%${query}%`)
        break
      case 'city':
        whereCondition = like(schools.Add1_City, `%${query}%`)
        break
      case 'status':
        whereCondition = eq(schools.Status, query)
        break
      case 'authority':
        whereCondition = eq(schools.Authority, query)
        break
      case 'suburb':
        whereCondition = like(schools.Add1_Suburb, `%${query}%`)
        break
      case 'email':
        whereCondition = like(schools.Email, `%${query}%`)
        break
      default:
        throw new Error(`Unsupported search field: ${field}`)
    }

    const result = await this.db
      .select()
      .from(schools)
      .where(whereCondition)
      .orderBy(schools.Org_Name)

    return result
  }

  async getAllSchools(): Promise<School[]> {
    await this.ensureDataIsFresh()
    return this.getSchoolsFromDB()
  }
}