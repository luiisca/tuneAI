import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useContext, useEffect, useState } from "react";

import EmptyScreen from "@/components/ui/core/empty-screen";
import { CircleSlashed, Music2 } from "lucide-react";
import { SkeletonContainer, SkeletonText } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { FavouriteBttn, MusicPlayerContext, ScanSimilarsBttn } from "../_app";
import { cn } from "@/utils/cn";
import showToast from "@/components/ui/core/notifications";
import Image from "next/image";
import { formatSongDuration } from "@/utils/song-time";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import { Button } from "@/components/ui/core/button";
import { DEFAULT_RESULTS_QTT } from "@/utils/constants";
import type { SongType } from "@/server/api/routers/discover";

const ItemSkeleton = () => {
  return (
    <div className="flex h-14 animate-pulse items-center justify-between space-x-2 p-2 px-4 dark:bg-slate-900">
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
      <SkeletonText className="my-auto h-1/3 w-[4ch]" />
      {/* time */}
    </div>
  );
};
export const ListSkeleton = () => {
  return (
    <SkeletonContainer>
      <div className="space-y-2">
        {Array(DEFAULT_RESULTS_QTT)
          .fill(null)
          .map((_, id) => (
            <ItemSkeleton key={id} />
          ))}
      </div>
    </SkeletonContainer>
  );
};

const Discover = () => {
  const [searchValue, setSearchValue] = useState("");
  const [resultsPage, setResultsPage] = useState(1);
  const [resultsQtt, setResultsQtt] = useState(DEFAULT_RESULTS_QTT);
  const [loadingMore, setLoadingMore] = useState(false);
  const utils = api.useContext();

  const {
    state: { songsList },
    dispatch,
  } = useContext(MusicPlayerContext);

  const {
    data: recomSongs,
    isFetching,
    isFetched,
    isError,
    error,
  } = api.discover.getSongs.ai.useQuery(
    { text: searchValue, first: resultsQtt },
    {
      enabled: !!searchValue.trim() && !!resultsQtt,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: () => {
        const prevData = utils.discover.getSongs.ai.getData({
          text: searchValue,
          first: resultsQtt - DEFAULT_RESULTS_QTT,
        });

        utils.discover.getSongs.ai.setData(
          {
            text: searchValue,
            first: resultsQtt,
          },
          (oldData) => {
            if (prevData && oldData) {
              return [...prevData, ...oldData];
            }

            return oldData;
          }
        );
      },
    }
  );

  useEffect(() => {
    if (recomSongs) {
      console.log("SONGSLIST", songsList);
      console.log("recomSongs".toUpperCase(), recomSongs);
      const newSongs = recomSongs.slice(
        recomSongs.length - DEFAULT_RESULTS_QTT
      );

      dispatch({
        type: "SAVE_SONGS",
        songs: [
          ...(songsList || []),
          ...newSongs.map((song, index) => ({
            position: index,
            id: song.id,
            title: song.title,
            artists: song.artists,
            scanning: false,
            coverUrl: song.coverUrl,
            favourite: false, // @TODO: get them from spotify
            audioSrc: song.previewUrl || "",
          })),
        ],
      });
    }
  }, [recomSongs, dispatch, songsList]);

  useEffect(() => {
    const main = document.getElementsByTagName("main");
    main[0] && main[0].scrollTo({ top: main[0].scrollHeight });

    if (isFetched) {
      setLoadingMore(false);
    }
  }, [isFetched, isFetching, loadingMore]);
  // ^ this dep array might break the default loading more songs behavior

  return (
    <Shell heading="Discover" subtitle="Find new songs with AI">
      <Input
        placeholder="I dont know what to listen. What do you recommend"
        onChange={debounce((e) => {
          const { target } = e as Event & { target: HTMLInputElement };
          const text = target.value;
          if (text.trim()) {
            setSearchValue(text.trim());
            setResultsQtt(DEFAULT_RESULTS_QTT);
            setResultsPage(1);
            // const songs = await utils.searchAi.getSongs.fetch(text);
          }
        }, 800)}
        className="mb-4"
        autoFocus
      />
      {isFetching && !loadingMore && <ListSkeleton />}
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
          {(!isFetching || (isFetching && loadingMore)) && (
            <ul className="space-y-2 overflow-y-auto pb-2">
              {recomSongs.map((song, index) => (
                <TrackItem track={song} index={index} key={song.id} />
              ))}
            </ul>
          )}
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

export const TrackItem = ({
  index,
  track,
}: {
  index: number;
  track:
    | SongType
    | Omit<SongType, "genres" | "moods" | "instruments" | "musicalEra">;
}) => {
  const { dispatch } = useContext(MusicPlayerContext);

  return (
    <li
      onClick={(e) => {
        const target = e.target as HTMLLIElement;
        if (!target.closest("button")) {
          if (track.previewUrl) {
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
        "group flex h-14 cursor-pointer items-center justify-between rounded-md p-2 px-4 hover:bg-slate-100 dark:hover:bg-slate-700",
        !track.previewUrl && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex h-full w-1/2 space-x-4 md:w-2/3 lg:w-4/5">
        <span className="flex w-4 shrink-0  items-center justify-center font-semibold">
          {index + 1}
        </span>
        <div className="relative h-10 w-10 shrink-0">
          <Image
            alt={`${track.title} playing`}
            fill
            placeholder="blur"
            blurDataURL={`data:image/svg+xml;base64,${toBase64(
              shimmer(700, 475)
            )}`}
            sizes="20vw"
            src={track.coverUrl || "/defaultSongCover.jpeg"}
            className="object-cover"
          />
        </div>
        <div className="overflow-hidden">
          <p className="truncate">{track.title}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {track.artists[0]}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <ScanSimilarsBttn
            disabled={!track.previewUrl}
            index={index}
            className="opacity-0 group-hover:opacity-100"
          />
          <FavouriteBttn
            className="group opacity-0 group-hover:opacity-100"
            iconClassName="h-4 w-4"
            songPos={index}
            disabled={!track.previewUrl}
          />
        </div>
        <span className="flex w-[5ch] justify-end text-end text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {formatSongDuration(track.duration)}
        </span>
      </div>
    </li>
  );
};

export default Discover;
