import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => {
    const user = ctx.session.user;

    if (user) {
      return {
        name: user.name,
        email: user.email,
      };
    }
  }),
});
