import { createTRPCRouter, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => {
    const session = ctx.session;
    const user = session.user;

    if (user) {
      return {
        name: user.name,
        email: user.email,
        profileSrc: session.profileSrc,
        avatar:
          session.avatar ||
          `https://www.gravatar.com/avatar/avatar?s=160&d=mp&r=PG`,
      };
    }
  }),
});
