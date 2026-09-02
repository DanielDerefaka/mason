/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as design_versions from "../design_versions.js";
import type * as email from "../email.js";
import type * as explore from "../explore.js";
import type * as guest from "../guest.js";
import type * as http from "../http.js";
import type * as inspiration from "../inspiration.js";
import type * as lib_admission from "../lib/admission.js";
import type * as lib_pool from "../lib/pool.js";
import type * as lib_signals from "../lib/signals.js";
import type * as moodboard from "../moodboard.js";
import type * as pool from "../pool.js";
import type * as project from "../project.js";
import type * as shares from "../shares.js";
import type * as signals from "../signals.js";
import type * as subscriptions from "../subscriptions.js";
import type * as user from "../user.js";
import type * as versions from "../versions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  credits: typeof credits;
  crons: typeof crons;
  design_versions: typeof design_versions;
  email: typeof email;
  explore: typeof explore;
  guest: typeof guest;
  http: typeof http;
  inspiration: typeof inspiration;
  "lib/admission": typeof lib_admission;
  "lib/pool": typeof lib_pool;
  "lib/signals": typeof lib_signals;
  moodboard: typeof moodboard;
  pool: typeof pool;
  project: typeof project;
  shares: typeof shares;
  signals: typeof signals;
  subscriptions: typeof subscriptions;
  user: typeof user;
  versions: typeof versions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
