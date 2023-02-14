import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useContext, useEffect, useState } from "react";

import EmptyScreen from "@/components/ui/core/empty-screen";
import { CircleSlashed, Music2 } from "lucide-react";
import { SkeletonContainer, SkeletonText } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { FavouriteBttn, MusicPlayerContext, ScanSimilarsBttn } from "./_app";
import { cn } from "@/utils/cn";
import showToast from "@/components/ui/core/notifications";
import Image from "next/image";
import { formatSongDuration } from "@/utils/song-time";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import { Button } from "@/components/ui/core/button";

const DEFAULT_RESULTS_QTT = 10;

const ItemSkeleton = () => {
  return (
    <div className="flex h-14 animate-pulse items-center justify-between space-x-2 bg-gray-200 p-2 px-4 dark:bg-slate-900">
      {/* number */}
      <div className="flex h-full w-full items-center space-x-4">
        <SkeletonText className="my-auto h-1/3 w-4" />
        {/* image */}
        <SkeletonText className="h-10 w-10 shrink-0" />
        <div className="flex w-full flex-col justify-center space-y-1">
          {/* title */}
          <SkeletonText className="h-5 w-1/3" />
          {/* artist */}
          <SkeletonText className="h-4 w-1/4 text-sm" />
        </div>
      </div>
      <SkeletonText className="my-auto h-1/3 w-[5ch]" />
      {/* time */}
    </div>
  );
};
const ListSkeleton = () => {
  return (
    <SkeletonContainer>
      <div className="space-y-2">
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
        <ItemSkeleton />
      </div>
    </SkeletonContainer>
  );
};

const Discover = () => {
  const [searchValue, setSearchValue] = useState("");
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsQtt, setResultsQtt] = useState(DEFAULT_RESULTS_QTT);
  const [loadingMore, setLoadingMore] = useState(false);

  const {
    data: recomSongs,
    isFetching,
    isFetched,
    isError,
    error,
  } = api.searchAi.getSongs.useQuery(
    { text: searchValue, first: resultsQtt },
    {
      enabled: !!searchValue.trim() || !!resultsQtt,
      keepPreviousData: true,
    }
  );
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
  useEffect(() => {
    const main = document.getElementsByTagName("main");
    main[0] && main[0].scrollTo({ top: main[0].scrollHeight });

    setLoadingMore(false);
  }, [isFetched && loadingMore]);

  return (
    <Shell heading="Discover" subtitle="Find new songs with AI">
      <Input
        placeholder="I dont know what to listen. What do you recommend"
        onChange={debounce(async (e) => {
          const text = e.target.value;
          if (text.trim()) {
            setSearchValue(text);
            setResultsQtt(DEFAULT_RESULTS_QTT);
            // const songs = await utils.searchAi.getSongs.fetch(text);
          }
        }, 800)}
        className="mb-4"
        autoFocus
      />
      {!recomSongs && isFetching && !loadingMore && <ListSkeleton />}
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
        <div>
          <ul className="space-y-2 overflow-y-auto pb-2">
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
                    {index + 1}
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
                    <ScanSimilarsBttn
                      disabled={!song.previewUrl}
                      index={index}
                    />
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
          {isFetching && loadingMore && <ListSkeleton />}
          <div className="mt-4 w-full text-center">
            <Button
              onClick={() => {
                // load more
                setResultsPage(resultsPage + 1);
                setResultsQtt((resultsPage + 1) * DEFAULT_RESULTS_QTT);
                setLoadingMore(true);
              }}
            >
              Show more
            </Button>
          </div>
        </div>
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
