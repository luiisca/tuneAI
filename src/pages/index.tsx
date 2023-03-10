import { getServerAuthSession } from "@/server/auth";
import type { GetServerSidePropsContext } from "next";

function RedirectPage() {
  return;
}

export async function getServerSideProps({
  req,
  res,
}: GetServerSidePropsContext) {
  const session = await getServerAuthSession({ req, res });

  if (!session?.user.id) {
    return {
      redirect: {
        permanent: false,
        destination: "/login",
      },
    };
  }

  return {
    redirect: {
      permanent: false,
      destination: "/discover/prompt",
    },
  };
}

export default RedirectPage;
