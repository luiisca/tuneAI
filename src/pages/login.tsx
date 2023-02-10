import { Alert } from "@/components/ui/alert";
import AuthContainer from "@/components/ui/auth-container";
import { Button } from "@/components/ui/core/button";
import { Icons } from "@/components/ui/core/icons";
import { getServerAuthSession } from "@/server/auth";
import { WEBAPP_URL } from "@/utils/constants";
import { GetServerSidePropsContext } from "next";
import { signIn } from "next-auth/react";
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
        .push(`${WEBAPP_URL}/login`, undefined, { shallow: true })
        .catch(console.error);
    }
  }, [router, router.query?.error]);

  return (
    <AuthContainer showLogo heading="Welcome to Dreamify">
      {errorMessage && oAuthError && (
        <Alert className="mt-4" severity="error" title={errorMessage} />
      )}
      {errorMessage && !oAuthError && (
        <Alert severity="error" title={errorMessage} />
      )}
      <div className="mt-5">
        <Button
          color="secondary"
          className="flex w-full justify-center"
          onClick={async (e) => {
            e.preventDefault();
            await signIn("spotify");
          }}
        >
          <Icons.spotify className="mr-2 inline-flex h-4 w-4 stroke-[1.5px]" />
          Sign in with Spotify
        </Button>
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
