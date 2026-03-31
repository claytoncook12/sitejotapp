import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify user owns the site
    const site = await ctx.db.get(args.siteId);
    if (!site || site.userId !== userId) {
      return [];
    }

    const visits = await ctx.db
      .query("visits")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    // Sort by visitDate descending (most recent first)
    visits.sort((a, b) => b.visitDate.localeCompare(a.visitDate));

    return visits;
  },
});

export const get = query({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.userId !== userId) {
      return null;
    }

    return visit;
  },
});

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    visitDate: v.string(),
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

    return await ctx.db.insert("visits", {
      siteId: args.siteId,
      visitDate: args.visitDate,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    visitId: v.id("visits"),
    visitDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.userId !== userId) {
      throw new Error("Visit not found or access denied");
    }

    const { visitId, ...updates } = args;
    await ctx.db.patch(visitId, updates);
  },
});

export const remove = mutation({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.userId !== userId) {
      throw new Error("Visit not found or access denied");
    }

    // Delete all observations for this visit
    const observations = await ctx.db
      .query("observations")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .collect();

    for (const observation of observations) {
      // Delete associated files
      if (observation.fileId) {
        await ctx.storage.delete(observation.fileId);
      }
      await ctx.db.delete(observation._id);
    }

    await ctx.db.delete(args.visitId);
  },
});
