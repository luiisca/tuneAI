import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api, RouterOutputs } from "@/utils/api";
import { debounce } from "lodash";
import { useContext, useState } from "react";

import { UseTRPCQueryResult } from "@trpc/react/shared";
import { TRPCClientErrorLike } from "@trpc/client";
import { Procedure } from "@trpc/server";
import { SongType } from "@/server/api/routers/searchAi";
import EmptyScreen from "@/components/ui/core/empty-screen";
import { Music2 } from "lucide-react";
import showToast from "@/components/ui/core/notifications";
import { SkeletonText } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { MusicPlayerContext } from "./_app";
import { cn } from "@/utils/cn";

type recomSongsType = UseTRPCQueryResult<
  RouterOutputs["searchAi"]["getSongs"],
  TRPCClientErrorLike<Procedure<"query", any>>
>;
const Discover = () => {
  const [searchValue, setSearchValue] = useState("");
  // const [recomSongs, setRecomSongs] = useState<SongType[]>([]);
  const utils = api.useContext();
  const {
    data: recomSongs,
    isLoading,
    isError,
    error,
  } = api.searchAi.getSongs.useQuery(searchValue, {
    onSuccess: (data) => {
      showToast(`${data.length} songs found`, "success");
    },
    enabled: !!searchValue.trim(),
  });
  const { dispatch } = useContext(MusicPlayerContext);

  return (
    <Shell heading="Discover" subtitle="Find new songs with AI">
      <Input
        placeholder="I dont know what to listen. What do you recommend"
        onChange={debounce(async (e) => {
          const text = e.target.value;
          if (text.trim()) {
            setSearchValue(text);
            // const songs = await utils.searchAi.getSongs.fetch(text);
          }
        }, 800)}
      />
      {isLoading && <SkeletonText className="my-4 h-20 w-full bg-red-200" />}
      {isError && (
        <Alert
          severity="error"
          title="Something went wrong"
          message={error.message}
        />
      )}
      <>{console.log("RECOMEND SONGS", recomSongs)}</>
      {!recomSongs ? (
        <EmptyScreen
          Icon={() => <Music2 />}
          headline="Start searching"
          description="What are you waiting for"
        />
      ) : (
        <ul className="space-y-2">
          {recomSongs.map((song, i) => (
            <li
              key={i}
              onClick={() => {
                if (song.previewUrl) {
                  dispatch({
                    type: "SELECT_SONG",
                    src: song.previewUrl,
                  });
                }
              }}
              className={cn(
                "flex cursor-pointer space-x-2 rounded-md bg-slate-800 p-2",
                !song.previewUrl && "cursor-not-allowed bg-slate-700"
              )}
            >
              <img src={song.coverUrl} className="h-12 w-12" />
              <h2>{song.title}</h2>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
};

export default Discover;
