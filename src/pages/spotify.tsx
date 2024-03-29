import { Button } from "@/components/ui/core/button";
import EmptyScreen from "@/components/ui/core/empty-screen";
import Shell from "@/components/ui/core/shell";
import { GITHUB_REPO_LINK } from "@/utils/constants";
import { Github } from "lucide-react";
import Link from "next/link";

const Spotify = () => {
  return (
    <Shell
      heading="Spotify"
      subtitle="Access your Spotify playlists and get personalized recommendations"
    >
      <EmptyScreen
        Icon={() => (
          <Link
            href={GITHUB_REPO_LINK}
            target="_blank"
            className="flex h-full w-full items-center justify-center"
          >
            <Github />
          </Link>
        )}
        headline="This app is a work in progress"
        description={
          <span>
            You can help me speed up the process by contributing to my{" "}
            <Link href={GITHUB_REPO_LINK} target="_blank">
              <Button variant="link">Github repo</Button>
            </Link>
          </span>
        }
      />
    </Shell>
  );
};

export default Spotify;
