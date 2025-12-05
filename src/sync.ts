import { DatabaseService } from "./db";
import { CacheService } from "./cache";
import type { School, SyncResponse } from "./schema";

export class SyncService {
  constructor(
    private db: DatabaseService,
    private cache: CacheService,
  ) {}

  async syncData(): Promise<SyncResponse> {
    try {
      console.log("Starting data sync...");

      // Fetch fresh data from external API
      const freshData = await this.cache.fetchFromExternalAPI();
      console.log(`Fetched ${freshData.length} records from external API`);

      // Save to database
      await this.db.saveSchools(freshData);
      console.log("Data saved to database");

      // Update cache
      await this.cache.setCachedData(freshData);
      console.log("Cache updated");

      return {
        success: true,
        recordCount: freshData.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Sync failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async forceSyncIfNeeded(): Promise<void> {
    const { isStale } = await this.cache.getCachedData();

    if (isStale) {
      console.log("Cache is stale, triggering sync...");
      await this.syncData();
    }
  }

  async getLastSyncInfo() {
    const cacheInfo = await this.cache.getLastSyncInfo();
    const dbCount = await this.db.getRecordCount();
    const lastUpdated = await this.db.getLastUpdated();

    return {
      ...cacheInfo,
      recordCount: dbCount,
      lastSync: lastUpdated?.toISOString() || null,
    };
  }
}
