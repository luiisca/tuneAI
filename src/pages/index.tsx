import { getServerAuthSession } from "@/server/auth";
import { GetServerSidePropsContext } from "next";

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
      destination: "/discover/ai",
    },
  };
}

export default RedirectPage;
