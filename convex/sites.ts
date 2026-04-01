import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

function generateSlug(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Get visit date ranges and boundary for each site
    const sitesWithData = await Promise.all(
      sites.map(async (site) => {
        const visits = await ctx.db
          .query("visits")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .collect();

        // Get boundary polyline
        const polylines = await ctx.db
          .query("sitePolylines")
          .withIndex("by_site", (q) => q.eq("siteId", site._id))
          .collect();
        const boundary = polylines[0] || null;

        if (visits.length === 0) {
          return {
            ...site,
            oldestVisitDate: null,
            newestVisitDate: null,
            boundaryCoordinates: boundary?.coordinates || null,
          };
        }

        const visitDates = visits.map((v) => v.visitDate).sort();
        return {
          ...site,
          oldestVisitDate: visitDates[0],
          newestVisitDate: visitDates[visitDates.length - 1],
          boundaryCoordinates: boundary?.coordinates || null,
        };
      })
    );

    return sitesWithData;
  },
});

export const get = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== userId) {
      return null;
    }

    // Get the user who created the site
    const user = await ctx.db.get(site.userId);

    return {
      ...site,
      createdBy: user?.name || user?.email || "Unknown",
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    visitDate: v.string(),
    status: v.union(v.literal("active"), v.literal("complete"), v.literal("in_review")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { visitDate, ...siteData } = args;

    // Create the site
    const siteId = await ctx.db.insert("sites", {
      ...siteData,
      userId,
    });

    // Auto-create the first visit with the provided date
    await ctx.db.insert("visits", {
      siteId,
      visitDate,
      userId,
    });

    return siteId;
  },
});

export const update = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("complete"), v.literal("in_review"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { siteId, ...updates } = args;
    const site = await ctx.db.get(siteId);
    
    if (!site || site.userId !== userId) {
      throw new Error("Site not found or access denied");
    }

    await ctx.db.patch(siteId, updates);
  },
});

export const remove = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== userId) {
      throw new Error("Site not found or access denied");
    }

    // Delete all visits for this site (which cascades to observations)
    const visits = await ctx.db
      .query("visits")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    for (const visit of visits) {
      // Delete all observations for this visit
      const observations = await ctx.db
        .query("observations")
        .withIndex("by_visit", (q) => q.eq("visitId", visit._id))
        .collect();

      for (const observation of observations) {
        // Delete associated files
        if (observation.fileId) {
          await ctx.storage.delete(observation.fileId);
        }
        await ctx.db.delete(observation._id);
      }

      await ctx.db.delete(visit._id);
    }

    await ctx.db.delete(args.siteId);
  },
});

export const toggleShare = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== userId) {
      throw new Error("Site not found or access denied");
    }

    const isCurrentlyShared = site.isShared === true;

    if (isCurrentlyShared) {
      // Toggle OFF
      await ctx.db.patch(args.siteId, { isShared: false });
      return { isShared: false, shareSlug: site.shareSlug };
    } else {
      // Toggle ON - reuse existing slug or generate new one
      let slug = site.shareSlug;
      if (!slug) {
        slug = generateSlug(6);
        // Check uniqueness
        while (
          await ctx.db
            .query("sites")
            .withIndex("by_shareSlug", (q) => q.eq("shareSlug", slug))
            .first()
        ) {
          slug = generateSlug(6);
        }
      }
      await ctx.db.patch(args.siteId, { isShared: true, shareSlug: slug });
      return { isShared: true, shareSlug: slug };
    }
  },
});

export const getByShareSlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const site = await ctx.db
      .query("sites")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.slug))
      .first();

    if (!site || site.isShared !== true) {
      return null;
    }

    const user = await ctx.db.get(site.userId);

    return {
      _id: site._id,
      name: site.name,
      location: site.location,
      status: site.status,
      createdBy: user?.name || user?.email || "Unknown",
    };
  },
});
