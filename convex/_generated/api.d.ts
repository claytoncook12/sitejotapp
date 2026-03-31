/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as observations from "../observations.js";
import type * as planMarkers from "../planMarkers.js";
import type * as router from "../router.js";
import type * as sitePlans from "../sitePlans.js";
import type * as sitePolylines from "../sitePolylines.js";
import type * as sites from "../sites.js";
import type * as visits from "../visits.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  migrations: typeof migrations;
  observations: typeof observations;
  planMarkers: typeof planMarkers;
  router: typeof router;
  sitePlans: typeof sitePlans;
  sitePolylines: typeof sitePolylines;
  sites: typeof sites;
  visits: typeof visits;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
