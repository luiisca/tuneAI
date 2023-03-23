import { Alert } from "@/components/ui/alert";
import AuthContainer from "@/components/ui/auth-container";
import { Button } from "@/components/ui/core/button";
import { Icons } from "@/components/ui/core/icons";
import { getServerAuthSession } from "@/server/auth";
import { GITHUB_REPO_LINK, WEBAPP_URL } from "@/utils/constants";
import { Github } from "lucide-react";
import type { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Login() {
  const router = useRouter();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oAuthError, setOAuthError] = useState<boolean>(false);
  useEffect(() => {
    if (router.query?.error) {
      setOAuthError(true);
      setErrorMessage("Something went wrong. Please try again");
      // Clean URL to get rid of error query
      router
        .push(`${WEBAPP_URL as string}/login`, undefined, { shallow: true })
        .catch(console.error);
    }
  }, [router, router.query?.error]);

  return (
    <AuthContainer
      showLogo
      heading="Welcome to TuneAI"
      subtitle="Find your next favorite song with AI-powered search."
    >
      {errorMessage && oAuthError && (
        <Alert className="mt-4" severity="error" title={errorMessage} />
      )}
      {errorMessage && !oAuthError && (
        <Alert severity="error" title={errorMessage} />
      )}
      <div className="mx-auto flex w-auto items-center justify-center space-x-3">
        <Button
          className="flex w-auto justify-center px-6 py-3 md:px-8 md:py-6"
          onClick={(e) => {
            e.preventDefault();
            void signIn("spotify");
          }}
        >
          <Icons.spotify className="mr-2 inline-flex h-4 w-4 stroke-[1.5px]" />
          <span>Go to app</span>
        </Button>
        <Link href={GITHUB_REPO_LINK} target="_blank">
          <Button variant="outline" className="py-3 md:py-6">
            <Github className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </AuthContainer>
  );
}

export async function getServerSideProps({
  req,
  res,
}: GetServerSidePropsContext) {
  const session = await getServerAuthSession({ req, res });

  if (session) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}
