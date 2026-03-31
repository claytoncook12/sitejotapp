import { internalMutation } from "./_generated/server";

/**
 * Migration: Migrate existing observations to use visits
 * 
 * This migration should be run ONCE after deploying the new schema.
 * It will:
 * 1. For each site that has a visitDate field, create a visit
 * 2. For each observation that has a siteId field, update it to use the corresponding visitId
 * 
 * IMPORTANT: This assumes a two-phase deployment approach:
 * - Phase 1: Add visits table with both siteId (old) and visitId (new, optional) on observations
 * - Phase 2: Run this migration
 * - Phase 3: Remove siteId from observations schema, make visitId required
 * 
 * To run this migration, use the Convex dashboard or CLI:
 *   npx convex run migrations:migrateObservationsToVisits
 * 
 * If you've already deployed the final schema (visitId required, siteId removed),
 * existing data may have been invalidated. In that case:
 * - Clear data and start fresh, OR
 * - Manually restore from backup and run migration properly
 */
export const migrateObservationsToVisits = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting migration: observations to visits...");

    // Get all sites
    const sites = await ctx.db.query("sites").collect();
    console.log(`Found ${sites.length} sites`);

    let visitCount = 0;
    let observationCount = 0;
    const siteToVisitMap = new Map<string, string>();

    // Phase 1: Create visits for each site
    for (const site of sites) {
      // Check if site has old visitDate field (during transition)
      const siteAny = site as any;
      const visitDate = siteAny.visitDate || new Date().toISOString().split("T")[0];

      // Check if a visit already exists for this site
      const existingVisits = await ctx.db
        .query("visits")
        .withIndex("by_site", (q) => q.eq("siteId", site._id))
        .collect();

      let visitId: string;
      if (existingVisits.length > 0) {
        visitId = existingVisits[0]._id;
        console.log(`Site ${site._id} already has visit ${visitId}`);
      } else {
        // Create a new visit
        visitId = await ctx.db.insert("visits", {
          siteId: site._id,
          visitDate,
          userId: site.userId,
        });
        visitCount++;
        console.log(`Created visit ${visitId} for site ${site._id}`);
      }

      siteToVisitMap.set(site._id, visitId);
    }

    // Phase 2: Update observations to use visitId
    const observations = await ctx.db.query("observations").collect();
    console.log(`Found ${observations.length} observations to check`);

    for (const observation of observations) {
      const obsAny = observation as any;
      
      // If observation has old siteId field and no visitId, migrate it
      if (obsAny.siteId && !obsAny.visitId) {
        const visitId = siteToVisitMap.get(obsAny.siteId);
        if (visitId) {
          await ctx.db.patch(observation._id, {
            visitId: visitId as any,
          });
          observationCount++;
          console.log(`Migrated observation ${observation._id} to visit ${visitId}`);
        } else {
          console.warn(`No visit found for site ${obsAny.siteId}, skipping observation ${observation._id}`);
        }
      }
    }

    console.log(`Migration complete: Created ${visitCount} visits, updated ${observationCount} observations`);
    
    return {
      sitesProcessed: sites.length,
      visitsCreated: visitCount,
      observationsMigrated: observationCount,
    };
  },
});

/**
 * Helper: Check migration status
 * Lists any observations that may not have been migrated properly
 */
export const checkMigrationStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const observations = await ctx.db.query("observations").collect();
    const visits = await ctx.db.query("visits").collect();
    const sites = await ctx.db.query("sites").collect();

    const sitesWithVisits = new Set<string>();
    for (const visit of visits) {
      sitesWithVisits.add(visit.siteId);
    }

    const sitesWithoutVisits = sites.filter((s) => !sitesWithVisits.has(s._id));

    // Check for observations with issues
    const observationsWithIssues = observations.filter((obs) => {
      const obsAny = obs as any;
      return !obsAny.visitId || obsAny.siteId;
    });

    return {
      totalSites: sites.length,
      totalVisits: visits.length,
      totalObservations: observations.length,
      sitesWithoutVisits: sitesWithoutVisits.map((s) => s._id),
      observationsWithIssues: observationsWithIssues.length,
    };
  },
});
