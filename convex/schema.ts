import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  sites: defineTable({
    name: v.string(),
    location: v.string(),
    // visitDate kept temporarily for migration - will be removed after migration
    visitDate: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("complete"), v.literal("in_review")),
    userId: v.id("users"),
  }).index("by_user", ["userId"]),

  visits: defineTable({
    siteId: v.id("sites"),
    visitDate: v.string(),
    userId: v.id("users"),
  }).index("by_site", ["siteId"]).index("by_user", ["userId"]),

  observations: defineTable({
    // siteId kept temporarily for migration - will be removed after migration
    siteId: v.optional(v.id("sites")),
    // visitId optional during migration - will be required after migration
    visitId: v.optional(v.id("visits")),
    description: v.optional(v.string()),
    type: v.union(v.literal("note"), v.literal("photo"), v.literal("video")),
    fileId: v.optional(v.id("_storage")),
    userId: v.id("users"),
    order: v.number(),
  }).index("by_visit", ["visitId"]).index("by_user", ["userId"]),

  sitePlans: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    imageFileId: v.id("_storage"),
    userId: v.id("users"),
  }).index("by_site", ["siteId"]).index("by_user", ["userId"]),

  planMarkers: defineTable({
    planId: v.id("sitePlans"),
    xPercent: v.number(),
    yPercent: v.number(),
    label: v.optional(v.string()),
    observationId: v.optional(v.id("observations")),
    userId: v.id("users"),
  }).index("by_plan", ["planId"]).index("by_user", ["userId"]),

  sitePolylines: defineTable({
    siteId: v.id("sites"),
    name: v.string(),
    description: v.optional(v.string()),
    // GeoJSON LineString coordinates: [[lng, lat], [lng, lat], ...]
    coordinates: v.array(v.array(v.number())),
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    userId: v.id("users"),
  }).index("by_site", ["siteId"]).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
