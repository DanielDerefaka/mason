# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

A query function that takes two arguments looks like:

```ts
// convex/myFunctions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.myFunctions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get("messages", id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.myFunctions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

## `/try` — guests, the pool, Explore

An anonymous visitor is a real `users` row with `isAnonymous: true`; everything
else about them lives in `guests` (never on `users`, which belongs to Convex
Auth). The pieces:

- `auth.ts` — the `anonymous` provider, gated by an admission token signed by
  `/api/try/admit` with `GUEST_ADMISSION_SECRET` (`lib/admission.ts` verifies it;
  unset means open, with a warning — dev only). The `createOrUpdateUser`
  callback replaces the library default, so it reproduces it, then adds the
  `guests` row and the in-place conversion of a guest who gives an email.
- `pool.ts` / `lib/pool.ts` — the community pool: `COMMUNITY_POOL_SIZE` a day
  (default 20), keyed by UTC day from `src/lib/try/pool-day.ts`.
- `credits.ts` — `spend`/`refund`/`getBalance` branch on `isAnonymous`; a
  guest's spend takes the pool then the share bonus, in one transaction.
- `guest.ts` — `me`, `claimShare`, `markKeyAdded`, project claims, the per-IP
  throttle, and `purgeStale` (run daily by `crons.ts`).
- `explore.ts` — the gallery reads its own snapshots and never a project.
- `signals.ts` — daily counters; `npx convex run signals:summary` prints the
  last fourteen days.
