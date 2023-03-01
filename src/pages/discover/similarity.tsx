import { debounce } from "lodash";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { DEFAULT_RESULTS_QTT } from "@/utils/constants";
import Image from "next/image";
import {
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  useCallback,
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
// import { MusicPlayerContext } from "../_app";
import { ListSkeleton, TrackItem } from "./ai";
import { MusicPlayerContext } from "../_app";
import { Alert } from "@/components/ui/alert";
import EmptyScreen from "@/components/ui/core/empty-screen";
import { CircleSlashed, Music2 } from "lucide-react";
import { SongType } from "@/server/api/routers/discover";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import { formatSongDuration } from "@/utils/song-time";
import { cn } from "@/utils/cn";
import showToast from "@/components/ui/core/notifications";
import { SkeletonText } from "@/components/ui/skeleton";
import useLoadMore from "@/utils/hooks/useLoadMore";

type InitialStateType = {
  searchValue: string;
  selectedTrackId: null | string;
  spotify: {
    listOpen: boolean;
    resQtt: number;
    loadingMore: boolean;
  };
};
const initialState: InitialStateType = {
  searchValue: "",
  selectedTrackId: null,
  spotify: {
    listOpen: false,
    resQtt: DEFAULT_RESULTS_QTT,
    loadingMore: false,
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
          resPage: 0,
          resQtt: DEFAULT_RESULTS_QTT,
        },
      };
    }

    default: {
      return state;
    }
  }
};

const SpotifyItemSkeleton = () => {
  return (
    <div className="flex h-14 animate-pulse items-center justify-between space-x-2 p-2 pl-8 pr-2 dark:bg-slate-900 md:pr-4">
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
  const { selectedTrackId, spotify } = state;

  const utils = api.useContext();

  const {
    state: { songsList, similar },
    dispatch: dispatchPlayer,
  } = useContext(MusicPlayerContext);

  const {
    data: tracks,
    isFetching,
    isFetched,
    isError,
    error,
  } = api.discover.getSongs.similar.useQuery(
    {
      trackId: selectedTrackId as string,
      first: similar.resQtt,
    },
    {
      enabled: !!selectedTrackId && !!similar.resPage,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: (data) => {
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
        const prevData = utils.discover.getSongs.similar.getData({
          trackId: selectedTrackId as string,
          first: similar.resQtt - DEFAULT_RESULTS_QTT,
        });

        utils.discover.getSongs.similar.setData(
          {
            trackId: selectedTrackId as string,
            first: similar.resQtt,
          },
          (oldData) => {
            // first load, there are no prevData
            if (similar.resQtt === DEFAULT_RESULTS_QTT && data) {
              dispatchPlayer({
                type: "SAVE_SONGS",
                songs: [...formatTracksForSongsList(data)],
              });

              return data;
            }
            if (prevData && oldData) {
              dispatchPlayer({
                type: "SAVE_SONGS",
                songs: [...songsList!, ...formatTracksForSongsList(oldData)],
              });

              return [...prevData, ...oldData];
            }

            if (oldData) {
              dispatchPlayer({
                type: "SAVE_SONGS",
                songs: [...formatTracksForSongsList(oldData)],
              });

              return oldData;
            }
          }
        );
      },
    }
  );

  const updateFn = useCallback(() => {
    dispatchPlayer({
      type: "SHOW_MORE_SIMILAR",
    });
  }, []);

  const [loadMore] = useLoadMore<HTMLUListElement>({
    loadingMore: similar.loadingMore,
    update: updateFn,
    isFetching,
    isFetched,
  });

  useEffect(() => {
    console.log(
      "isFetched",
      isFetched,
      "simlar loadinMroe",
      similar.loadingMore,
      "loading more",
      similar.loadingMore
    );
    if (isFetched) {
      dispatchPlayer({ type: "STOP_LOADING_MORE_SIMILAR" });

      const prevData = utils.discover.getSongs.similar.getData({
        trackId: selectedTrackId as string,
        first: similar.resQtt - DEFAULT_RESULTS_QTT,
      });
      console.log("prevData", prevData);
      if (prevData && similar.forwardLoadingMore) {
        console.log("ISFETCHED, dispatching", prevData);
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
  }, [isFetched, similar.loadingMore]);

  return (
    <Shell heading="Discover" subtitle="Find similar songs with AI">
      <Select
        onOpenChange={(open) =>
          dispatch({ type: "OPEN_SPOTIFY_RESULTS_LIST", open })
        }
        open={spotify.listOpen}
        onValueChange={(value) => dispatch({ type: "SELECT_TRACK_ID", value })}
      >
        <Input
          tabIndex={1}
          className="mb-2"
          autoFocus
          placeholder="Search Spotify tracks"
          onChange={debounce((e) => {
            const { target } = e as Event & { target: HTMLInputElement };
            const text = target.value.trim();
            dispatch({ type: "RESET_SEARCH", searchValue: text });
            dispatchPlayer({ type: "RESET_SEARCH" });
          }, 800)}
        />
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
      {isError && (
        <Alert
          severity="error"
          title="Something went wrong"
          className="mb-2"
          message={error.message}
        />
      )}
      {!tracks && !isFetching && (
        <EmptyScreen
          Icon={() => <Music2 />}
          headline="Start searching"
          description="What are you waiting for"
        />
      )}
      {tracks && tracks.length !== 0 && (
        <div className="h-[calc(100%-11rem)] ">
          {(!isFetching || (isFetching && similar.loadingMore)) && (
            <ul
              className={cn(
                "-mr-4 h-full space-y-2 overflow-y-auto pr-4 pb-3 lg:-mr-12 lg:pr-12",
                // custom scrollbar
                "scrollbar-track-w-[80px] rounded-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-rounded-md",
                "scrollbar-thumb-accent hover:scrollbar-thumb-accentBright"
              )}
              onScroll={(e) => loadMore(e)}
            >
              {tracks.map((track, index) => (
                <TrackItem index={index} track={track} key={track.id} />
              ))}
              {isFetching && similar.loadingMore && <ListSkeleton />}
            </ul>
          )}
        </div>
      )}
      {tracks && tracks.length === 0 && (
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
  const { searchValue } = state;
  const tracksListRef = useRef<HTMLDivElement>(null);
  const [resPage, setResPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const utils = api.useContext();

  const {
    data: tracks,
    isFetching,
    isFetched,
    isError,
    error,
  } = api.discover.getSongs.spotify.useQuery(
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
        if (data) {
          console.log("SPOTI data", data);
        }
        const prevData = utils.discover.getSongs.spotify.getData({
          trackName: searchValue,
          offset: resPage * DEFAULT_RESULTS_QTT - DEFAULT_RESULTS_QTT,
        });
        console.log("PREV data", prevData);

        utils.discover.getSongs.spotify.setData(
          {
            trackName: searchValue,
            offset: resPage * DEFAULT_RESULTS_QTT,
          },
          (oldData) => {
            console.log("old data", oldData);
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
    if (isFetched) {
      setLoadingMore(false);
    }
  }, [isFetched, loadingMore]);

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
  });

  return (
    <SelectViewport
      className="p-1"
      ref={tracksListRef}
      onScroll={(e) => {
        loadMore(e);
      }}
    >
      <SelectItem value="loading" className="h-0 p-0 opacity-0">
        Loading
      </SelectItem>
      <div>
        {isFetching && !loadingMore && (
          <ListSkeleton Item={SpotifyItemSkeleton} />
        )}

        {isError && (
          <Alert
            severity="error"
            title="Something went wrong"
            className="mb-2"
            message={error.message}
          />
        )}

        {tracks && tracks.length !== 0 && (
          <div>
            {(!isFetching || (isFetching && loadingMore)) && (
              <ul className="space-y-2">
                {tracks.map((track, index) => (
                  <SelectItem value={track.id} key={track.id}>
                    <SptifyTrackItem index={index} track={track} />
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

export const SptifyTrackItem = ({
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
            {track.artists[0]}
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
