import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listByVisit = query({
  args: { visitId: v.id("visits") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify user owns the visit
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.userId !== userId) {
      return [];
    }

    const observations = await ctx.db
      .query("observations")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .collect();

    // Sort by order (ascending)
    observations.sort((a, b) => a.order - b.order);

    return Promise.all(
      observations.map(async (observation) => ({
        ...observation,
        fileUrl: observation.fileId ? await ctx.storage.getUrl(observation.fileId) : null,
      }))
    );
  },
});

export const create = mutation({
  args: {
    visitId: v.id("visits"),
    description: v.optional(v.string()),
    type: v.union(v.literal("note"), v.literal("photo"), v.literal("video")),
    fileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the visit
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.userId !== userId) {
      throw new Error("Visit not found or access denied");
    }

    // Get the next order number
    const existingObservations = await ctx.db
      .query("observations")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .collect();
    const maxOrder = existingObservations.length > 0
      ? Math.max(...existingObservations.map((o) => o.order ?? 0))
      : -1;

    return await ctx.db.insert("observations", {
      ...args,
      userId,
      order: maxOrder + 1,
    });
  },
});

export const update = mutation({
  args: {
    observationId: v.id("observations"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the observation
    const observation = await ctx.db.get(args.observationId);
    if (!observation || observation.userId !== userId) {
      throw new Error("Observation not found or access denied");
    }

    return await ctx.db.patch(args.observationId, {
      description: args.description,
    });
  },
});

export const remove = mutation({
  args: {
    observationId: v.id("observations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the observation
    const observation = await ctx.db.get(args.observationId);
    if (!observation || observation.userId !== userId) {
      throw new Error("Observation not found or access denied");
    }

    // Delete associated file if exists
    if (observation.fileId) {
      await ctx.storage.delete(observation.fileId);
    }

    return await ctx.db.delete(args.observationId);
  },
});

export const reorder = mutation({
  args: {
    visitId: v.id("visits"),
    observationIds: v.array(v.id("observations")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the visit
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.userId !== userId) {
      throw new Error("Visit not found or access denied");
    }

    // Update order for each observation
    await Promise.all(
      args.observationIds.map((id, index) =>
        ctx.db.patch(id, { order: index })
      )
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const listByVisitPublic = query({
  args: { visitId: v.id("visits"), slug: v.string() },
  handler: async (ctx, args) => {
    const site = await ctx.db
      .query("sites")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.slug))
      .first();

    if (!site || site.isShared !== true) {
      return [];
    }

    // Verify visit belongs to this site
    const visit = await ctx.db.get(args.visitId);
    if (!visit || visit.siteId !== site._id) {
      return [];
    }

    const observations = await ctx.db
      .query("observations")
      .withIndex("by_visit", (q) => q.eq("visitId", args.visitId))
      .collect();

    observations.sort((a, b) => a.order - b.order);

    return Promise.all(
      observations.map(async (observation) => ({
        ...observation,
        fileUrl: observation.fileId ? await ctx.storage.getUrl(observation.fileId) : null,
      }))
    );
  },
});
