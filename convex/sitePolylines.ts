import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getBySite = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Verify user owns the site
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== userId) {
      return null;
    }

    // Get the first (and expected only) polyline for this site
    const polylines = await ctx.db
      .query("sitePolylines")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    return polylines[0] || null;
  },
});

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
    description: v.optional(v.string()),
    coordinates: v.array(v.array(v.number())),
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the site
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== userId) {
      throw new Error("Site not found or access denied");
    }

    return await ctx.db.insert("sitePolylines", {
      ...args,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    polylineId: v.id("sitePolylines"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    coordinates: v.optional(v.array(v.array(v.number()))),
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const polyline = await ctx.db.get(args.polylineId);
    if (!polyline || polyline.userId !== userId) {
      throw new Error("Polyline not found or access denied");
    }

    const { polylineId, ...updates } = args;
    
    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(polylineId, filteredUpdates);
  },
});

export const remove = mutation({
  args: { polylineId: v.id("sitePolylines") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const polyline = await ctx.db.get(args.polylineId);
    if (!polyline || polyline.userId !== userId) {
      throw new Error("Polyline not found or access denied");
    }

    await ctx.db.delete(args.polylineId);
  },
});

export const exportGeoJSON = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Verify user owns the site
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== userId) {
      return null;
    }

    // Get the polyline for this site
    const polylines = await ctx.db
      .query("sitePolylines")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    const polyline = polylines[0];
    if (!polyline) {
      return null;
    }

    // Return as GeoJSON Feature
    return {
      type: "Feature" as const,
      properties: {
        name: polyline.name,
        description: polyline.description || null,
        siteId: args.siteId,
        siteName: site.name,
        color: polyline.color || null,
        strokeWidth: polyline.strokeWidth || null,
      },
      geometry: {
        type: "Polygon" as const,
        // Ensure coordinates form a closed ring
        coordinates: [
          polyline.coordinates.length > 0 &&
          (polyline.coordinates[0][0] !== polyline.coordinates[polyline.coordinates.length - 1][0] ||
           polyline.coordinates[0][1] !== polyline.coordinates[polyline.coordinates.length - 1][1])
            ? [...polyline.coordinates, polyline.coordinates[0]]
            : polyline.coordinates,
        ],
      },
    };
  },
});
