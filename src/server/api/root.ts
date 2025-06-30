import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { clientsRouter } from "./routers/clients";
import { dashboardRouter } from "./routers/dashboard";
import { usersRouter } from "./routers/users";
import { projectsRouter } from "./routers/projects";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  clients: clientsRouter,
  users: usersRouter,
  projects: projectsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
