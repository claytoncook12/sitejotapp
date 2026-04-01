import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { planId: v.id("sitePlans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify user owns the plan
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) {
      return [];
    }

    const markers = await ctx.db
      .query("planMarkers")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    // Enrich markers with linked observation details if present
    const markersWithDetails = await Promise.all(
      markers.map(async (marker) => {
        if (marker.observationId) {
          const observation = await ctx.db.get(marker.observationId);
          if (observation) {
            let imageUrl = null;
            if (observation.fileId) {
              imageUrl = await ctx.storage.getUrl(observation.fileId);
            }
            return {
              ...marker,
              observation: {
                ...observation,
                imageUrl,
              },
            };
          }
        }
        return {
          ...marker,
          observation: null,
        };
      })
    );

    return markersWithDetails;
  },
});

export const get = query({
  args: { markerId: v.id("planMarkers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const marker = await ctx.db.get(args.markerId);
    if (!marker || marker.userId !== userId) {
      return null;
    }

    // Include linked observation if present
    if (marker.observationId) {
      const observation = await ctx.db.get(marker.observationId);
      if (observation) {
        let imageUrl = null;
        if (observation.fileId) {
          imageUrl = await ctx.storage.getUrl(observation.fileId);
        }
        return {
          ...marker,
          observation: {
            ...observation,
            imageUrl,
          },
        };
      }
    }

    return {
      ...marker,
      observation: null,
    };
  },
});

export const create = mutation({
  args: {
    planId: v.id("sitePlans"),
    xPercent: v.number(),
    yPercent: v.number(),
    label: v.optional(v.string()),
    observationId: v.optional(v.id("observations")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the plan
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) {
      throw new Error("Plan not found or access denied");
    }

    // If observationId provided, verify user owns it
    if (args.observationId) {
      const observation = await ctx.db.get(args.observationId);
      if (!observation || observation.userId !== userId) {
        throw new Error("Observation not found or access denied");
      }
    }

    return await ctx.db.insert("planMarkers", {
      planId: args.planId,
      xPercent: args.xPercent,
      yPercent: args.yPercent,
      label: args.label,
      observationId: args.observationId,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    markerId: v.id("planMarkers"),
    xPercent: v.optional(v.number()),
    yPercent: v.optional(v.number()),
    label: v.optional(v.string()),
    observationId: v.optional(v.id("observations")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const marker = await ctx.db.get(args.markerId);
    if (!marker || marker.userId !== userId) {
      throw new Error("Marker not found or access denied");
    }

    // If observationId provided, verify user owns it
    if (args.observationId) {
      const observation = await ctx.db.get(args.observationId);
      if (!observation || observation.userId !== userId) {
        throw new Error("Observation not found or access denied");
      }
    }

    const { markerId, ...updates } = args;
    await ctx.db.patch(markerId, updates);
  },
});

export const unlinkObservation = mutation({
  args: { markerId: v.id("planMarkers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const marker = await ctx.db.get(args.markerId);
    if (!marker || marker.userId !== userId) {
      throw new Error("Marker not found or access denied");
    }

    await ctx.db.patch(args.markerId, { observationId: undefined });
  },
});

export const remove = mutation({
  args: { markerId: v.id("planMarkers") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const marker = await ctx.db.get(args.markerId);
    if (!marker || marker.userId !== userId) {
      throw new Error("Marker not found or access denied");
    }

    await ctx.db.delete(args.markerId);
  },
});

export const listPublic = query({
  args: { planId: v.id("sitePlans"), slug: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) {
      return [];
    }

    const site = await ctx.db
      .query("sites")
      .withIndex("by_shareSlug", (q) => q.eq("shareSlug", args.slug))
      .first();

    if (!site || site.isShared !== true || plan.siteId !== site._id) {
      return [];
    }

    const markers = await ctx.db
      .query("planMarkers")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    const markersWithDetails = await Promise.all(
      markers.map(async (marker) => {
        if (marker.observationId) {
          const observation = await ctx.db.get(marker.observationId);
          if (observation) {
            let imageUrl = null;
            if (observation.fileId) {
              imageUrl = await ctx.storage.getUrl(observation.fileId);
            }
            return {
              ...marker,
              observation: {
                ...observation,
                imageUrl,
              },
            };
          }
        }
        return {
          ...marker,
          observation: null,
        };
      })
    );

    return markersWithDetails;
  },
});
