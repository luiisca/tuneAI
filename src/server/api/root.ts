import { createTRPCRouter } from "./trpc";
import { discoverRouter } from "./routers/discover";
import { spotifyRouter } from "./routers/spotify";

import { userRouter } from "./routers/user";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here
 */
export const appRouter = createTRPCRouter({
  discover: discoverRouter,
  spotify: spotifyRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
