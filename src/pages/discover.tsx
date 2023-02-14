import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useContext, useEffect, useState } from "react";

import EmptyScreen from "@/components/ui/core/empty-screen";
import { CircleSlashed, Music2, ScanLine } from "lucide-react";
import { SkeletonText } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { FavouriteBttn, MusicPlayerContext, ScanSimilarsBttn } from "./_app";
import { cn } from "@/utils/cn";
import showToast from "@/components/ui/core/notifications";
import Image from "next/image";
import { formatSongDuration } from "@/utils/song-time";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import { Button } from "@/components/ui/core/button";

const Discover = () => {
  const [searchValue, setSearchValue] = useState("");
  // const [recomSongs, setRecomSongs] = useState<SongType[]>([]);
  const {
    data: recomSongs,
    isFetching,
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
        songs: recomSongs.map((song, index) => ({
          position: index,
          id: song.id,
          title: song.title,
          artists: song.artists,
          scanning: false,
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
        className="mb-4"
        autoFocus
      />
      {!recomSongs && isFetching && (
        <SkeletonText className="my-4 h-20 w-full bg-red-200" />
      )}
      {isError && (
        <Alert
          severity="error"
          title="Something went wrong"
          message={error.message}
        />
      )}
      {!recomSongs && !isFetching && (
        <EmptyScreen
          Icon={() => <Music2 />}
          headline="Start searching"
          description="What are you waiting for"
        />
      )}

      {recomSongs && recomSongs.length !== 0 && (
        <ul className="mb-[88px] space-y-2 overflow-y-auto pb-2">
          {recomSongs.map((song, index) => (
            <li
              key={index}
              onClick={(e) => {
                if (!e.target.closest("button")) {
                  if (song.previewUrl) {
                    dispatch({
                      type: "SELECT_SONG",
                      songPos: index,
                    });
                  } else {
                    showToast("Cannot play. Sorry", "error");
                  }
                }
              }}
              className={cn(
                "flex h-14 cursor-pointer items-center justify-between rounded-md p-2 px-4 hover:bg-slate-100 dark:hover:bg-slate-700",
                !song.previewUrl && "cursor-not-allowed opacity-40"
              )}
            >
              <div className="flex h-full space-x-4">
                <span className="flex w-4 items-center  justify-center font-semibold">
                  {index}
                </span>
                <div className="relative h-10 w-10 ">
                  <Image
                    alt={`${song.title} playing`}
                    fill
                    placeholder="blur"
                    blurDataURL={`data:image/svg+xml;base64,${toBase64(
                      shimmer(700, 475)
                    )}`}
                    sizes="20vw"
                    src={song.coverUrl || "/defaultSongCover.jpeg"}
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="truncate">{song.title}</p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {song.artists[0]}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <ScanSimilarsBttn disabled={!song.previewUrl} index={index} />
                  <FavouriteBttn
                    className="group"
                    iconClassName="h-4 w-4"
                    songPos={index}
                    disabled={!song.previewUrl}
                  />
                </div>
                <span className="flex w-[5ch] justify-end text-end text-sm tabular-nums text-slate-600 dark:text-slate-300">
                  {formatSongDuration(song.duration)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {recomSongs && recomSongs.length === 0 && (
        <EmptyScreen
          Icon={() => <CircleSlashed />}
          headline="No results"
          description="Could not find any result for this query. Please try again."
        />
      )}
    </Shell>
  );
};

export default Discover;
