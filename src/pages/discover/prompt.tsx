import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useContext, useEffect, useState, type UIEvent } from "react";

import EmptyScreen from "@/components/ui/core/empty-screen";
import { CircleSlashed, Music2 } from "lucide-react";
import { SkeletonContainer, SkeletonText } from "@/components/ui/skeleton";
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
import { useRouter } from "next/router";

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
        {Array(DEFAULT_RESULTS_QTT - 10) // -10 to avoid letting the user send more than 1 load more req when bottom reached
          .fill(null)
          .map((_, id) => (
            <Item key={id} />
          ))}
      </div>
    </SkeletonContainer>
  );
};

const Prompt = () => {
  const [searchValue, setSearchValue] = useState("");
  const utils = api.useContext();
  const router = useRouter();

  const { state, dispatch } = useContext(MusicPlayerContext);

  const { prompt } = state;
  const songsList = state[state.crrRoute].songsList;

  const {
    data: recomSongs,
    isFetching,
    isFetched,
  } = api.discover.prompt.useQuery<SongType[], SongType[]>(
    { text: searchValue.trim(), first: prompt.resQtt },
    {
      enabled: !!searchValue.trim() && !!prompt.resQtt,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: (data) => {
        // console.log("procedure DATA", data);
        // console.log("resutlsQTT", prompt.resQtt);
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
        const prevData = utils.discover.prompt.getData({
          text: searchValue,
          first: prompt.resQtt - DEFAULT_RESULTS_QTT,
        }) as SongType[];

        utils.discover.prompt.setData(
          {
            text: searchValue,
            first: prompt.resQtt,
          },
          () => {
            if (!("message" in data)) {
              if (prompt.resQtt === DEFAULT_RESULTS_QTT && data) {
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
    if (isFetched && !isFetching && prompt.loadingMore) {
      dispatch({ type: "STOP_LOADING_MORE_SIMILAR" });

      const prevData = utils.discover.prompt.getData({
        text: searchValue,
        first: prompt.resQtt - DEFAULT_RESULTS_QTT,
      }) as SongType[];
      // console.log("prevData", prevData);
      if (prevData && prompt.forwardLoadingMore) {
        // console.log("ISFETCHED, dispatching", prevData);
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
  }, [isFetched, isFetching, prompt.loadingMore]);

  useEffect(() => {
    const query = router.asPath.split("?")[1];
    if (query?.includes("prompt")) {
      const prompt = new URLSearchParams(query).get("prompt");
      setSearchValue(prompt!);
    }
  }, [router.query.prompt]);

  const [loadMore] = useLoadMore<HTMLUListElement>({
    loadingMore: prompt.loadingMore,
    update: () =>
      dispatch({
        type: "SHOW_MORE_SIMILAR",
      }),
    isFetching,
    isFetched,
    allResultsShown: prompt.allResultsShown,
    resPage: prompt.resPage,
  });

  return (
    <Shell
      heading="Discover"
      subtitle="Discover music that matches your mood with AI"
    >
      <TabsList
        list={[
          { href: "/discover/prompt", name: "Prompt" },
          { href: "/discover/similar", name: "Similar" },
        ]}
      />

      <Input
        defaultValue={searchValue}
        placeholder="I want to listen to something relaxing before bed"
        onChange={debounce((e) => {
          const { target } = e as Event & { target: HTMLInputElement };
          const text = target.value;
          if (text.trim()) {
            setSearchValue(text.trim());
            dispatch({ type: "RESET_SEARCH" });
          }
          router.push({
            pathname: router.pathname,
            query: {
              prompt: text.trim(),
            },
          });
        }, 800)}
        className="mb-2.5"
      />
      {isFetching && !prompt.loadingMore && (
        <ListSkeleton Item={ItemSkeleton} />
      )}
      {!recomSongs && !isFetching && (
        <EmptyScreen
          Icon={() => <Music2 />}
          headline="Ready to discover new music?"
          description="Describe your mood and find your jam with AI-powered recommendations."
        />
      )}

      {recomSongs && !("message" in recomSongs) && recomSongs.length !== 0 && (
        <div className="h-[calc(100%-13rem)] ">
          {(!isFetching || (isFetching && prompt.loadingMore)) && (
            <ul
              className={cn(
                "-mr-4 h-full space-y-2 overflow-y-auto pr-4 pb-3 lg:-mr-12 lg:pr-12",
                // custom scrollbar
                "scrollbar-track-w-[80px] rounded-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-md",
                "dark:scrollbar-thumb-accent dark:hover:scrollbar-thumb-accentBright"
              )}
              onScroll={debounce((e: UIEvent<HTMLUListElement>) => {
                loadMore(e);
              }, 1000)}
            >
              {recomSongs.map((song, index) => (
                <TrackItem track={song} index={index} key={song.id} />
              ))}
              {isFetching && prompt.loadingMore && (
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
            {track.artists.join(", ")}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          {track.previewUrl && (
            <ScanSimilarsBttn
              trackPos={index}
              trackId={track.id}
              className="group-hover:opacity-100 lg:opacity-0"
            />
          )}
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

export default Prompt;
