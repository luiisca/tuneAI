import { debounce } from "lodash";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import {
  DEFAULT_RESULTS_QTT,
  DEFAULT_SPOTIFY_RES_QTT,
} from "@/utils/constants";
import Image from "next/image";
import {
  Dispatch,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
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
import { ListSkeleton } from "./ai";
import { MusicPlayerContext } from "../_app";
import { Alert } from "@/components/ui/alert";
import EmptyScreen from "@/components/ui/core/empty-screen";
import { CircleSlashed } from "lucide-react";
import { SongType } from "@/server/api/routers/discover";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import { formatSongDuration } from "@/utils/song-time";
import { cn } from "@/utils/cn";
import showToast from "@/components/ui/core/notifications";

type InitialStateType = {
  searchValue: string;
  selectedTrackId: null | string;
  spotify: {
    listOpen: boolean;
    // resPage: number;
    resQtt: number;
    loadingMore: boolean;
  };
  similar: {
    resPage: number;
    resQtt: number;
    loadingMore: boolean;
  };
};
const initialState: InitialStateType = {
  searchValue: "",
  selectedTrackId: null,
  spotify: {
    listOpen: false,
    // resPage: 0,
    resQtt: DEFAULT_SPOTIFY_RES_QTT,
    loadingMore: false,
  },
  similar: {
    resPage: 0,
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
// | {
//     type: "SHOW_MORE";
//     query: "spotify" | "similar";
//   }
// | {
//     type: "STOP_LOADING_MORE";
//     query: "spotify" | "similar";
//   };

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
          resQtt: DEFAULT_SPOTIFY_RES_QTT,
        },
        similar: {
          ...state.similar,
          resPage: 0,
          resQtt: DEFAULT_RESULTS_QTT,
        },
      };
    }
    // case "SHOW_MORE": {
    //   if (action.query === "spotify") {
    //     return {
    //       ...state,
    //       spotify: {
    //         ...state.spotify,
    //         resPage: state.spotify.resPage + 1,
    //       },
    //     };
    //   }
    // }
    // case "STOP_LOADING_MORE": {
    //   return {
    //     ...state,
    //     [action.query]: {
    //       ...state[action.query],
    //       loadingMore: false,
    //     },
    //   };
    // }

    default: {
      return state;
    }
  }
};

const Similar = () => {
  const [state, dispatch] = useReducer(similarReducer, initialState);
  const { searchValue, selectedTrackId, spotify, similar } = state;

  const utils = api.useContext();

  const {
    state: { songsList },
    dispatch: dispatchPlayerContext,
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
      enabled: !!selectedTrackId || !!similar.resPage,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: () => {
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
            if (prevData && oldData) {
              return [...prevData, ...oldData];
            }

            return oldData;
          }
        );
      },
    }
  );

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
          }, 800)}
        />
        <SelectTrigger className="h-0 border-0 p-0 opacity-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          customViewport
          className="disable-focus-visible ml-auto w-full max-w-[95vw]"
        >
          <SpotifySearchList state={state} dispatch={dispatch} />
        </SelectContent>
      </Select>

      {isError && error && <span>{error.message}</span>}
      {/* similar songs */}
      {tracks?.map((track, index) => (
        <TrackItem index={index} track={track} key={track.id} />
      ))}
    </Shell>
  );
};

const SpotifySearchList = ({
  state,
  dispatch,
}: {
  state: typeof initialState;
  dispatch: Dispatch<ACTIONTYPE>;
}) => {
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
      offset: resPage * DEFAULT_SPOTIFY_RES_QTT,
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
          offset: resPage * DEFAULT_SPOTIFY_RES_QTT - DEFAULT_SPOTIFY_RES_QTT,
        });
        console.log("PREV data", prevData);

        utils.discover.getSongs.spotify.setData(
          {
            trackName: searchValue,
            offset: resPage * DEFAULT_SPOTIFY_RES_QTT,
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

  return (
    <SelectViewport
      className="p-1"
      ref={tracksListRef}
      onScroll={debounce((e) => {
        if (e && !loadingMore) {
          const el = e.target as HTMLDivElement;
          const clientHeight = el.clientHeight;
          const scrollHeight = el.scrollHeight;
          const scrollTop = el.scrollTop;

          console.log(
            "values",
            "top",
            scrollTop,
            "cleint",
            clientHeight,
            "height",
            scrollHeight
          );
          if (scrollTop + clientHeight >= scrollHeight) {
            console.log("bottom reached");
            setResPage(resPage + 1);
            setLoadingMore(true);
          }
        }
      }, 400)}
    >
      <SelectItem value="loading" className="h-0 p-0 opacity-0">
        Loading
      </SelectItem>
      <div>
        {isFetching && !loadingMore && <ListSkeleton />}

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
                    <TrackItem index={index} track={track} />
                  </SelectItem>
                ))}
              </ul>
            )}
            {isFetching && loadingMore && <ListSkeleton />}
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
        "group flex h-14 cursor-pointer items-center justify-between rounded-md p-2 px-4",
        !track.previewUrl && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex h-full w-1/2 space-x-4 md:w-2/3 lg:w-4/5">
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
