import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useContext, useEffect, useState } from "react";

import EmptyScreen from "@/components/ui/core/empty-screen";
import { Music2 } from "lucide-react";
import { SkeletonText } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { MusicPlayerContext } from "./_app";
import { cn } from "@/utils/cn";
import showToast from "@/components/ui/core/notifications";

const Discover = () => {
  const [searchValue, setSearchValue] = useState("");
  // const [recomSongs, setRecomSongs] = useState<SongType[]>([]);
  const {
    data: recomSongs,
    isLoading,
    isError,
    error,
  } = api.searchAi.getSongs.useQuery(searchValue, {
    enabled: !!searchValue.trim(),
  });
  const { dispatch } = useContext(MusicPlayerContext);
  useEffect(() => {
    if (recomSongs) {
      dispatch({
        type: "SAVE_SONGS",
        songs: recomSongs.map((song) => ({
          id: song.id,
          title: song.title,
          artists: song.artists,
          coverUrl: song.coverUrl,
          favourite: false, // @TODO: get them from spotify
          audioSrc: song.previewUrl || "",
        })),
      });
    }
  }, [recomSongs]);

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
        <ul className="mb-[88px] mt-4 space-y-2 overflow-y-auto pb-2">
          {recomSongs.map((song, i) => (
            <li
              key={i}
              onClick={() => {
                if (song.previewUrl) {
                  console.log("SONG previewurl", song.previewUrl);
                  dispatch({
                    type: "SELECT_SONG",
                    songId: song.id,
                  });
                } else {
                  showToast("Cannot play. Sorry", "error");
                }
              }}
              className={cn(
                "flex cursor-pointer space-x-2 rounded-md bg-slate-700 p-2",
                !song.previewUrl && "cursor-not-allowed bg-slate-800"
              )}
            >
              <img src={song.coverUrl} className="h-16 w-16" />
              <h2>{song.title}</h2>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
};

export default Discover;
