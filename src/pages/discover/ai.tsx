import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useCallback, useContext, useEffect, useState } from "react";

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
import { DEFAULT_RESULTS_QTT, LOADED_MORE_ERROR_MSG } from "@/utils/constants";
import type { SongType } from "@/server/api/routers/discover";
import useLoadMore from "@/utils/hooks/useLoadMore";
import TabsList from "@/components/ui/tabsList";

export const ItemSkeleton = ({ time = true }: { time: boolean }) => {
  return (
    <div className="flex h-14 animate-pulse items-center justify-between space-x-2 p-2 px-4 dark:bg-slate-900">
      <div className="flex h-full w-full items-center space-x-4">
        {/* number */}
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
      {/* time */}
      {time && <SkeletonText className="my-auto h-1/3 w-[4ch]" />}
    </div>
  );
};
export const ListSkeleton = ({
  Item = ItemSkeleton,
}: {
  Item?: React.ElementType;
}) => {
  return (
    <SkeletonContainer>
      <div className="space-y-2">
        {Array(DEFAULT_RESULTS_QTT)
          .fill(null)
          .map((_, id) => (
            <Item key={id} />
          ))}
      </div>
    </SkeletonContainer>
  );
};

const Ai = () => {
  const [searchValue, setSearchValue] = useState("");
  const utils = api.useContext();

  const {
    state: { songsList, ai },
    dispatch,
  } = useContext(MusicPlayerContext);

  const {
    data: recomSongs,
    isFetching,
    isFetched,
    isError,
    error,
  } = api.discover.ai.useQuery<SongType[], SongType[]>(
    { text: searchValue.trim(), first: ai.resQtt },
    {
      enabled: !!searchValue.trim() && !!ai.resQtt,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: (data) => {
        console.log("procedure DATA", data);
        console.log("resutlsQTT", ai.resQtt);
        const formatTracksForSongsList = (tracks: SongType[]) => {
          return tracks.map((track, index: number) => ({
            position: (songsList?.length || 0) + index,
            id: track.id,
            title: track.title,
            artists: track.artists,
            scanning: false,
            coverUrl: track.coverUrl,
            favourite: false, // @TODO: get them from spotify
            audioSrc: track.previewUrl || "",
          }));
        };
        const prevData = utils.discover.ai.getData({
          text: searchValue,
          first: ai.resQtt - DEFAULT_RESULTS_QTT,
        }) as SongType[];

        utils.discover.ai.setData(
          {
            text: searchValue,
            first: ai.resQtt,
          },
          () => {
            if (!("message" in data)) {
              if (ai.resQtt === DEFAULT_RESULTS_QTT && data) {
                dispatch({
                  type: "SAVE_SONGS",
                  songs: [...formatTracksForSongsList(data)],
                });

                return data;
              }
              if (prevData && data) {
                dispatch({
                  type: "SAVE_SONGS",
                  songs: [...songsList!, ...formatTracksForSongsList(data)],
                });

                return [...prevData, ...data];
              }

              if (data) {
                dispatch({
                  type: "SAVE_SONGS",
                  songs: [...formatTracksForSongsList(data)],
                });

                return data;
              }
            }
            if (data.message === LOADED_MORE_ERROR_MSG) {
              showToast(data.message as string, "success");
              dispatch({
                type: "ALL_RESULTS_SHOWN",
              });

              return prevData;
            }

            showToast(data.message as string, "error");

            return prevData;
          }
        );
      },
    }
  );

  useEffect(() => {
    if (isFetched) {
      dispatch({ type: "STOP_LOADING_MORE_SIMILAR" });
      const prevData = utils.discover.ai.getData({
        text: searchValue,
        first: ai.resQtt - DEFAULT_RESULTS_QTT,
      }) as SongType[];
      console.log("prevData", prevData);
      if (prevData && ai.forwardLoadingMore) {
        console.log("ISFETCHED, dispatching", prevData);
        dispatch({
          type: "SELECT_SONG",
          forwardLoadingMore: false,
          songPos: prevData.length - 1,
          position: "next",
          trackReady: true,
          loadingMore: false,
        });
      }
    }
  }, [isFetched, ai.loadingMore]);

  const updateFn = useCallback(() => {
    dispatch({
      type: "SHOW_MORE_SIMILAR",
      // resQtt: (ai.resPage + 1) * DEFAULT_RESULTS_QTT,
    });
  }, [ai.resPage]);

  const [loadMore] = useLoadMore<HTMLUListElement>({
    loadingMore: ai.loadingMore,
    update: updateFn,
    isFetching,
    isFetched,
  });

  return (
    <Shell heading="Discover" subtitle="Find new songs with AI">
      <TabsList
        list={[
          { href: "/discover/ai", name: "AI" },
          { href: "/discover/similar", name: "Similar" },
        ]}
      />

      <Input
        placeholder="I dont know what to listen. What do you recommend"
        onChange={debounce((e) => {
          const { target } = e as Event & { target: HTMLInputElement };
          const text = target.value;
          if (text.trim()) {
            setSearchValue(text.trim());
            dispatch({ type: "RESET_SEARCH" });
          }
        }, 800)}
        className="mb-2.5"
      />
      {isFetching && !ai.loadingMore && <ListSkeleton Item={ItemSkeleton} />}
      {!recomSongs && !isFetching && (
        <EmptyScreen
          Icon={() => <Music2 />}
          headline="Start searching"
          description="What are you waiting for"
        />
      )}

      {recomSongs && recomSongs.length !== 0 && (
        <div className="h-[calc(100%-11rem)] ">
          {(!isFetching || (isFetching && ai.loadingMore)) && (
            <ul
              className={cn(
                "-mr-4 h-full space-y-2 overflow-y-auto pr-4 pb-3 lg:-mr-12 lg:pr-12",
                // custom scrollbar
                "scrollbar-track-w-[80px] rounded-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-md",
                "dark:scrollbar-thumb-accent dark:hover:scrollbar-thumb-accentBright"
              )}
              onScroll={(e) => {
                if (!ai.allResultsShown) {
                  loadMore(e);
                }
              }}
            >
              {recomSongs.map((song, index) => (
                <TrackItem track={song} index={index} key={song.id} />
              ))}
              {isFetching && ai.loadingMore && (
                <ListSkeleton Item={ItemSkeleton} />
              )}
            </ul>
          )}
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
  similarList = false,
}: {
  index: number;
  similarList?: boolean;
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
          {similarList ? index : index + 1}
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
            className="group-hover:opacity-100 lg:opacity-0"
          />
          <FavouriteBttn
            className="group group-hover:opacity-100 lg:opacity-0"
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

export default Ai;
