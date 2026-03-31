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

    const plans = await ctx.db
      .query("sitePlans")
      .withIndex("by_site", (q) => q.eq("siteId", args.siteId))
      .collect();

    // Add marker count and image URL to each plan
    const plansWithDetails = await Promise.all(
      plans.map(async (plan) => {
        const markers = await ctx.db
          .query("planMarkers")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect();
        
        const imageUrl = await ctx.storage.getUrl(plan.imageFileId);
        
        return {
          ...plan,
          markerCount: markers.length,
          imageUrl,
        };
      })
    );

    return plansWithDetails;
  },
});

export const get = query({
  args: { planId: v.id("sitePlans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) {
      return null;
    }

    const imageUrl = await ctx.storage.getUrl(plan.imageFileId);

    return {
      ...plan,
      imageUrl,
    };
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

export const create = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.string(),
    imageFileId: v.id("_storage"),
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

    return await ctx.db.insert("sitePlans", {
      siteId: args.siteId,
      name: args.name,
      imageFileId: args.imageFileId,
      userId,
    });
  },
});

export const update = mutation({
  args: {
    planId: v.id("sitePlans"),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) {
      throw new Error("Plan not found or access denied");
    }

    const { planId, ...updates } = args;
    await ctx.db.patch(planId, updates);
  },
});

export const remove = mutation({
  args: { planId: v.id("sitePlans") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) {
      throw new Error("Plan not found or access denied");
    }

    // Delete all markers for this plan
    const markers = await ctx.db
      .query("planMarkers")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();

    for (const marker of markers) {
      await ctx.db.delete(marker._id);
    }

    // Delete the stored image file
    await ctx.storage.delete(plan.imageFileId);

    // Delete the plan
    await ctx.db.delete(args.planId);
  },
});
