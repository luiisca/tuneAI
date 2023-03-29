import { debounce } from "lodash";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { DEFAULT_RESULTS_QTT, LOADED_MORE_ERROR_MSG } from "@/utils/constants";
import Image from "next/image";
import {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  useCallback,
  type UIEvent,
} from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from "@/components/ui/core/select";
import { Input } from "@/components/ui/core/input";
import { ListSkeleton } from "./prompt";
import { MusicPlayerContext, type PlayerSong } from "../_app";
import EmptyScreen from "@/components/ui/core/empty-screen";
import { ArrowRight, CircleSlashed, Music2 } from "lucide-react";
import type { SongType } from "@/server/api/routers/discover";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import { formatSongDuration } from "@/utils/song-time";
import { cn } from "@/utils/cn";
import { SkeletonContainer, SkeletonText } from "@/components/ui/skeleton";
import useLoadMore from "@/utils/hooks/useLoadMore";
import { Button } from "@/components/ui/core/button";
import { useRouter } from "next/router";
import TabsList from "@/components/ui/tabsList";
import showToast from "@/components/ui/core/notifications";
import { TrackItem } from "@/components/track-item";

type SpotifyTrackResultType = Omit<
  SongType,
  "genres" | "moods" | "instruments" | "musicalEra"
>;
type InitialStateType = {
  searchValue: string;
  selectedTrackId: string;
  selectedTrack: null | PlayerSong;
  spotify: {
    listOpen: boolean;
    resQtt: number;
    loadingMore: boolean;
    allResultsShown: boolean;
  };
};
const initialState: InitialStateType = {
  searchValue: "",
  selectedTrackId: "",
  selectedTrack: null,
  spotify: {
    listOpen: false,
    resQtt: DEFAULT_RESULTS_QTT,
    loadingMore: false,
    allResultsShown: false,
  },
};
type ACTIONTYPE =
  | {
      type: "OPEN_SPOTIFY_RESULTS_LIST";
      open: boolean;
    }
  | {
      type: "SELECT_TRACK_ID";
      value: string;
    }
  | {
      type: "RESET_SEARCH";
      searchValue: string;
    }
  | {
      type: "SELECT_TRACK";
      track: PlayerSong | null;
    };

const similarReducer = (state: InitialStateType, action: ACTIONTYPE) => {
  switch (action.type) {
    case "OPEN_SPOTIFY_RESULTS_LIST": {
      return {
        ...state,
        spotify: {
          ...state.spotify,
          listOpen: action.open,
        },
      };
    }
    case "SELECT_TRACK_ID": {
      return {
        ...state,
        selectedTrackId: action.value,
      };
    }
    case "RESET_SEARCH": {
      return {
        ...state,
        searchValue: action.searchValue,
        spotify: {
          ...state.spotify,
          listOpen: true,
          resPage: 1,
          resQtt: DEFAULT_RESULTS_QTT,
        },
      };
    }
    case "SELECT_TRACK": {
      return {
        ...state,
        selectedTrack: action.track,
      };
    }

    default: {
      return state;
    }
  }
};

const SpotifyItemSkeleton = () => {
  return (
    <div className="flex h-14 animate-pulse items-center justify-between space-x-2 p-2 pl-8 dark:bg-slate-900 md:pr-4">
      <div className="flex h-full w-full items-center space-x-4 ">
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
      <SkeletonText className="my-auto h-1/3 w-[4ch]" />
    </div>
  );
};

const Similar = () => {
  const [state, dispatch] = useReducer(similarReducer, initialState);
  const { searchValue, selectedTrackId, selectedTrack, spotify } = state;
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [showHeading, setShowHeading] = useState(true);

  const router = useRouter();
  const utils = api.useContext();

  const { state: statePlayer, dispatch: dispatchPlayer } =
    useContext(MusicPlayerContext);

  const { similar } = statePlayer;
  const songsList = statePlayer[statePlayer.crrRoute].songsList;

  const search = useCallback(
    (searchQuery: string) => {
      if (searchValue !== searchQuery) {
        dispatchPlayer({ type: "RESET_SIMILAR_SONGS" });
        dispatch({ type: "RESET_SEARCH", searchValue: searchQuery });
      }
    },
    [searchValue, dispatchPlayer]
  );

  const {} = api.spotify.singleTrack.useQuery(
    {
      trackId: selectedTrackId,
    },
    {
      enabled: !!selectedTrackId,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: (data) => {
        if (data) {
          if (!("message" in data)) {
            dispatch({
              type: "SELECT_TRACK",
              track: data,
            });
            dispatchPlayer({
              type: "SAVE_SCANNED_SONG",
              song: data,
            });
          } else {
            dispatch({
              type: "SELECT_TRACK",
              track: null,
            });
            showToast(data.message as string, "error");
          }
        }
      },
    }
  );

  const {
    data: tracks,
    isFetching,
    isFetched,
    isError,
    error,
  } = api.discover.similar.useQuery<SongType[], SongType[]>(
    {
      trackId: selectedTrack?.id as string,
      first: similar.resQtt,
    },
    {
      enabled: !!selectedTrack?.id && !!similar.resPage,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error.message === LOADED_MORE_ERROR_MSG || failureCount >= 3) {
          return false;
        }

        return true;
      },
      onSuccess: (data) => {
        similar.resPage === 1 &&
          dispatchPlayer({ type: "RESET_SIMILAR_SONGS" });

        const formatTracksForSongsList = (tracks: SongType[]) => {
          return tracks.map((track, index: number) => ({
            position:
              ((similar.resPage === 1 ? 0 : songsList?.length) || 0) + index,
            id: track.id,
            title: track.title,
            artists: track.artists,
            scanning: false,
            coverUrl: track.coverUrl,
            favourite: false, // @TODO: get them from spotify
            audioSrc: track.previewUrl || "",
          }));
        };
        const prevData = utils.discover.similar.getData({
          trackId: selectedTrack?.id as string,
          first: similar.resQtt - DEFAULT_RESULTS_QTT,
        }) as SongType[];

        utils.discover.similar.setData(
          {
            trackId: selectedTrack?.id as string,
            first: similar.resQtt,
          },
          () => {
            if (!("message" in data)) {
              selectedTrack &&
                similar.resPage === 1 &&
                dispatchPlayer({
                  type: "SAVE_SCANNED_SONG",
                  song: selectedTrack,
                });

              statePlayer.mobilePlayerOpen &&
                dispatchPlayer({
                  type: "TOGGLE_MOBILE_PLAYER_OPEN",
                  open: false,
                });

              // console.log("SIMILAR ONSUCCESS: no Message ", data);
              if (prevData && data) {
                dispatchPlayer({
                  type: "SAVE_SONGS",
                  songs: [
                    ...(songsList || []),
                    ...formatTracksForSongsList(data),
                  ],
                });

                return [...prevData, ...data];
              }

              if (data) {
                dispatchPlayer({
                  type: "SAVE_SONGS",
                  songs: [...formatTracksForSongsList(data)],
                });

                return data;
              }
            }

            console.log("SIMILAR ONSUCCESS: Message ", data);
            if (data.message === LOADED_MORE_ERROR_MSG) {
              showToast(data.message as string, "success");
              dispatchPlayer({
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
    if (isError) {
      showToast(error.message, "error");
    }
  }, [error, isError]);

  useEffect(() => {
    const query = router.asPath.split("?")[1];
    if (query?.includes("trackid")) {
      const trackId = new URLSearchParams(query).get("trackid");
      trackId && dispatch({ type: "SELECT_TRACK_ID", value: trackId });
    }
  }, [router.query.trackid, router.asPath]);

  useEffect(() => {
    if (isFetched && !isFetching && similar.loadingMore) {
      console.log("ABOUT TO stop loading more UE");
      dispatchPlayer({ type: "STOP_LOADING_MORE_SIMILAR" });

      const prevData = utils.discover.similar.getData({
        trackId: selectedTrack?.id as string,
        first: similar.resQtt - DEFAULT_RESULTS_QTT,
      }) as SongType[];
      if (prevData && similar.forwardLoadingMore) {
        dispatchPlayer({
          type: "SELECT_SONG",
          forwardLoadingMore: false,
          songPos: prevData.length - 1,
          position: "next",
          trackReady: true,
          loadingMore: false,
        });
      }
    }
  }, [
    isFetched,
    isFetching,
    similar.loadingMore,
    dispatchPlayer,
    selectedTrack?.id,
    similar.forwardLoadingMore,
    similar.resQtt,
    utils.discover.similar,
  ]);

  const [loadMore] = useLoadMore({
    loadingMore: similar.loadingMore,
    update: () =>
      dispatchPlayer({
        type: "SHOW_MORE_SIMILAR",
      }),
    isFetching,
    isFetched,
    allResultsShown: similar.allResultsShown,
    resPage: similar.resPage,
  });

  return (
    <Shell
      heading="Discover"
      headingClassname={cn(showHeading ? "h-auto" : "h-0 m-0 -z-10")}
      subtitle="Discover new music from your favorite tracks"
    >
      <div
        className={cn(
          "border border-gray-100 bg-gray-50 dark:border-slate-900 dark:bg-slate-800",
          "absolute right-0 top-16 flex min-h-min w-2/5 items-center justify-center overflow-hidden rounded-l-xl sm:w-2/5 md:top-2 lg:top-8",
          isFetching &&
            similar.resPage === 1 &&
            "animate-in slide-in-from-right",
          showHeading ? "sm:top-20" : "sm:top-[5.5rem] md:top-1 lg:top-2"
        )}
      >
        {isFetching && similar.resPage === 1 && (
          <SkeletonContainer className="w-full">
            <div
              className={cn(
                "flex animate-pulse items-center justify-between space-x-2 py-2 pl-4 transition-all dark:bg-slate-900"
              )}
            >
              <div className="flex h-full w-full flex-row-reverse items-center justify-between space-x-4">
                {/* image */}
                <SkeletonText className="hidden shrink-0 rounded-none sm:block sm:h-16 sm:w-16 md:h-20 md:w-20" />
                <div className="flex w-full flex-col justify-center space-y-1">
                  {/* title */}
                  <SkeletonText className="h-5 w-3/5 sm:w-1/3" />
                  {/* artist */}
                  <SkeletonText className="h-4 w-4/5 text-sm sm:w-1/4" />
                </div>
              </div>
            </div>
          </SkeletonContainer>
        )}
        {/* selectedTrack && isFetched */}
        {((selectedTrack && !isFetching) ||
          (selectedTrack && isFetching && similar.resPage !== 1)) && (
          <div
            onClick={(e) => {
              const target = e.target as HTMLDivElement;
              if (
                selectedTrack &&
                isFetched &&
                !isFetching &&
                !target.closest("button")
              ) {
                if (selectedTrack.audioSrc) {
                  dispatchPlayer({
                    type: "SELECT_SCANNED_SONG",
                  });
                  dispatchPlayer({
                    type: "SELECT_SONG",
                    songPos: selectedTrack.position,
                  });
                } else {
                  showToast("Cannot play. Sorry", "error");
                }
              }
            }}
            className={cn(
              "group flex w-full rounded-md ",
              isFetching || !selectedTrack.audioSrc
                ? "cursor-not-allowed opacity-40"
                : "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            <div className="flex h-full w-full flex-row-reverse items-center justify-between space-x-4">
              <div
                className={cn(
                  "relative hidden shrink-0 transition-all sm:block ",
                  showHeading
                    ? "sm:h-16 sm:w-16 md:h-20 md:w-20"
                    : "sm:h-12 sm:w-12 lg:h-16 lg:w-16"
                )}
              >
                <Image
                  alt={`${selectedTrack.title} playing`}
                  fill
                  placeholder="blur"
                  blurDataURL={`data:image/svg+xml;base64,${toBase64(
                    shimmer(700, 475)
                  )}`}
                  sizes="20vw"
                  src={selectedTrack.coverUrl || "/defaultSongCover.jpeg"}
                  className="object-cover"
                />
              </div>
              <div
                className={cn(
                  "flex w-full flex-col justify-center overflow-hidden transition-all sm:h-auto sm:w-4/5",
                  showHeading ? "h-16" : "h-12"
                )}
              >
                <p className="truncate">{selectedTrack.title}</p>
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  {selectedTrack.artists.join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <TabsList
        list={[
          { href: "/discover/prompt", name: "Prompt" },
          {
            href: "/discover/similar",
            name: "Similar",
          },
        ]}
      />
      <Select
        onOpenChange={(open) =>
          dispatch({ type: "OPEN_SPOTIFY_RESULTS_LIST", open })
        }
        open={spotify.listOpen}
        onValueChange={(value) => {
          if (!(value === "loading")) {
            const track = JSON.parse(value) as SpotifyTrackResultType;
            console.log("ONVALUECHANGE SElECT", track);
            router
              .push({
                pathname: router.pathname,
                query: {
                  trackid: track.id,
                },
              })
              .catch(console.error);
            if (!track.previewUrl) {
              showToast("Cannot play. Sorry", "error");

              return;
            }

            dispatch({
              type: "SELECT_TRACK",
              track: {
                ...track,
                position: 0,
                favourite: false,
                scanning: false,
                audioSrc: track.previewUrl,
              },
            });
          }
        }}
      >
        <div className="relative w-full">
          <Input
            tabIndex={1}
            className="mb-2.5"
            onKeyDown={(e) => {
              const { target } = e as unknown as Event & {
                target: HTMLInputElement;
              };
              if (target.value.trim() && e.code === "Enter") {
                dispatch({ type: "OPEN_SPOTIFY_RESULTS_LIST", open: true });
                search(target.value.trim());
              }
            }}
            onChange={() => setSearchEnabled(!!searchRef.current?.value.trim())}
            ref={searchRef}
          />
          <Button
            size="sm"
            variant="subtle"
            disabled={!searchEnabled}
            onClick={() => {
              dispatch({ type: "OPEN_SPOTIFY_RESULTS_LIST", open: true });
              searchRef.current?.value &&
                search(searchRef.current.value.trim());
            }}
            className="absolute right-1 top-1 h-8 w-8"
          >
            <ArrowRight />
          </Button>
        </div>
        <SelectTrigger className="h-0 border-0 p-0 opacity-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          customViewport
          className="disable-focus-visible ml-auto w-full max-w-[95vw]"
        >
          <SpotifySearchList state={state} />
        </SelectContent>
      </Select>

      {isFetching && !similar.loadingMore && <ListSkeleton />}
      {!tracks && !isFetching && (
        <EmptyScreen
          Icon={() => <Music2 />}
          headline="Expand your music horizons"
          description="Search for any Spotify song and find similar tracks that match your taste."
        />
      )}
      {tracks && !("message" in tracks) && tracks.length !== 0 && (
        <div className="h-[calc(100%-10.5rem)] sm:h-[calc(100%-12.5rem)] md:h-[calc(100%-7.5rem)] lg:h-[calc(100%-4.5rem)]">
          {/* @TODO: take a look at this condition, might be unncessary */}
          {(!isFetching || (isFetching && similar.loadingMore)) && (
            <ul
              className={cn(
                "-mr-4 h-full space-y-2 overflow-y-auto pr-4 pb-3 lg:-mr-12 lg:pr-12",
                // custom scrollbar
                "scrollbar-track-w-[80px] rounded-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-rounded-md",
                "scrollbar-thumb-accent hover:scrollbar-thumb-accentBright"
              )}
              onScroll={(e) => {
                debounce((e: UIEvent<HTMLUListElement>) => {
                  loadMore(e);
                }, 1000)(e);

                const target = e.target as HTMLUListElement;
                setShowHeading(
                  Math.floor(target.scrollTop) >= 0 &&
                    Math.floor(target.scrollTop) <= 10
                );
              }}
            >
              {tracks.map((track, index) => (
                <TrackItem index={index} track={track} key={track.id} />
              ))}
              {isFetching && similar.loadingMore && <ListSkeleton />}
            </ul>
          )}
        </div>
      )}
      {!isFetching && tracks && tracks.length === 0 && (
        <EmptyScreen
          Icon={() => <CircleSlashed />}
          headline="No results"
          description="Could not find any similar tracks. Please try again."
        />
      )}
    </Shell>
  );
};

const SpotifySearchList = ({ state }: { state: typeof initialState }) => {
  const { searchValue, spotify } = state;
  const tracksListRef = useRef<HTMLDivElement>(null);
  const [resPage, setResPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const { dispatch: dispatchPlayer } = useContext(MusicPlayerContext);

  const utils = api.useContext();

  const {
    data: tracks,
    isFetching,
    isFetched,
    isError,
    error,
  } = api.spotify.tracksList.useQuery<
    SpotifyTrackResultType[],
    SpotifyTrackResultType[]
  >(
    {
      trackName: searchValue,
      offset: resPage * DEFAULT_RESULTS_QTT,
    },
    {
      enabled: !!searchValue || !!resPage,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: (data) => {
        console.log("SPOTIFY LIST DATA", data);
        const prevData = utils.spotify.tracksList.getData({
          trackName: searchValue,
          offset: resPage * DEFAULT_RESULTS_QTT - DEFAULT_RESULTS_QTT,
        }) as unknown as SpotifyTrackResultType[];
        console.log("PREV SPOTIFY LIST DATA", prevData);

        utils.spotify.tracksList.setData(
          {
            trackName: searchValue,
            offset: resPage * DEFAULT_RESULTS_QTT,
          },
          () => {
            if (!("message" in data)) {
              if (prevData && data) {
                return [...prevData, ...data];
              }

              return data;
            }

            if (data.message === LOADED_MORE_ERROR_MSG) {
              showToast(data.message as string, "success");
              dispatchPlayer({
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
    if (isError) {
      showToast(error.message, "error");
    }
  }, [error, isError]);

  useEffect(() => {
    if (isFetched && !isFetching && loadingMore) {
      setLoadingMore(false);
    }
  }, [isFetched, isFetching, loadingMore]);

  const updateFn = useCallback(() => {
    console.log("update fn run", resPage);
    setResPage(resPage + 1);
    setLoadingMore(true);
  }, [resPage]);

  const [loadMore] = useLoadMore<HTMLDivElement>({
    loadingMore,
    update: updateFn,
    isFetching,
    isFetched,
    allResultsShown: spotify.allResultsShown,
    resPage: resPage,
  });

  return (
    <SelectViewport
      className="p-1"
      ref={tracksListRef}
      onScroll={debounce((e: UIEvent<HTMLDivElement>) => {
        loadMore(e);
      }, 1000)}
    >
      {/* without this the viewport would jump around while loading more (I think)*/}
      <SelectItem value="loading" className="h-0 p-0 opacity-0">
        Loading
      </SelectItem>
      <div>
        {isFetching && !loadingMore && (
          <ListSkeleton Item={SpotifyItemSkeleton} />
        )}

        {tracks && !("message" in tracks) && tracks.length !== 0 && (
          <div>
            {(!isFetching ||
              (isFetching && loadingMore) ||
              (isError && error?.message === LOADED_MORE_ERROR_MSG)) && (
              <ul className="space-y-2">
                {tracks.map((track) => (
                  <SelectItem
                    value={JSON.stringify(track)}
                    key={track.id}
                    className="cursor-pointer"
                  >
                    <SpotifyTrackItem track={track} />
                  </SelectItem>
                ))}
              </ul>
            )}
            {isFetching && loadingMore && (
              <ListSkeleton Item={SpotifyItemSkeleton} />
            )}
          </div>
        )}

        {tracks && tracks.length === 0 && (
          <EmptyScreen
            Icon={() => <CircleSlashed />}
            headline="No results"
            description="Could not find any result for this query. Please try again."
          />
        )}
      </div>
    </SelectViewport>
  );
};

export const SpotifyTrackItem = ({
  track,
}: {
  track: SongType | SpotifyTrackResultType;
}) => {
  return (
    <li
      className={cn(
        "group flex h-14 cursor-pointer items-center justify-between rounded-md py-2",
        !track.previewUrl && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex h-full w-full max-w-[70vw] space-x-4 md:max-w-[80vw] lg:max-w-[60vw]">
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
      <div className="absolute right-2 flex items-center md:right-4">
        <span className="flex w-[5ch] justify-end text-end text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {formatSongDuration(track.duration)}
        </span>
      </div>
    </li>
  );
};

export default Similar;
