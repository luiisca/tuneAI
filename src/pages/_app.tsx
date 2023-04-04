import { type AppType } from "next/app";
import { useSession } from "next-auth/react";
import { type Session } from "next-auth";
import { Inter as FontSans } from "@next/font/google";
import { SessionProvider } from "next-auth/react";
import type * as SliderPrimitive from "@radix-ui/react-slider";
import Image from "next/image";

import { api } from "../utils/api";

import "../styles/globals.css";
import { ThemeProvider } from "next-themes";
import { cn } from "@/utils/cn";
import {
  ChevronDown,
  Disc,
  Heart,
  ListPlus,
  MonitorSpeaker,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  ScanLine,
  Share2,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useContext, useEffect, useReducer, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { Toaster } from "react-hot-toast";
import showToast from "@/components/ui/core/notifications";
import { Slider } from "@/components/ui/core/slider";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import React from "react";
import {
  DEFAULT_RESULTS_QTT,
  DEFAULT_SOUND,
  MIN_VOL_TO_MUTE,
  WEBAPP_URL,
} from "@/utils/constants";
import { Progress } from "@/components/ui/progress";
import { convertToSeconds, formatSongDuration } from "@/utils/song-time";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/router";
import Link from "next/link";
import type { Button } from "@/components/ui/core/button";
import { getClosestPlayableSong } from "@/utils/get-closest-playable-song";
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

type ActionType =
  | {
      type: "SAVE_SONGS";
      songs: PlayerSong[];
    }
  | {
      type: "SAVE_SCANNED_SONG";
      song: PlayerSong;
    }
  | {
      type: "RESET_SIMILAR";
      onlyResQtt?: boolean;
    }
  | {
      type: "TOGGLE_MOBILE_PLAYER_OPEN";
      open: boolean;
    }
  | {
      type: "SET_SCANNING";
      index: number;
      scanning: boolean;
    }
  | {
      type: "TOGGLE_PLAY";
      playing?: boolean;
    }
  | {
      type: "TOGGLE_FAVORITE";
      songPos: number;
      favorite: boolean;
    }
  | {
      type: "TOGGLE_LOOP";
    }
  | {
      type: "SET_TRACK_READY";
      ready: boolean;
    }
  | {
      type: "SAVE_AUDIO_REF";
      audioRef: React.MutableRefObject<HTMLAudioElement | null>;
    }
  | {
      type: "SELECT_SONG_FROM_SCANNED_SONG";
      position: "crr" | "next";
    }
  | {
      type: "SELECT_SONG";
      position?: "prev" | "crr" | "next";
      id?: number;
      forwardLoadingMore?: boolean;
    }
  | {
      type: "RESET_PROMPT";
      route?: (typeof playerPages)[number];
    }
  | {
      type: "ALL_RESULTS_SHOWN";
    }
  | {
      type: "SHOW_MORE_SIMILAR";
    }
  | {
      type: "STOP_LOADING_MORE_SIMILAR";
    }
  | {
      type: "SAVE_CRR_ROUTE";
      route: (typeof playerPages)[number];
    };

export type PlayerSong = {
  position: number;
  id: string;
  title: string;
  scanning: boolean;
  artists: string[];
  coverUrl: string;
  favorite: boolean;
  audioSrc: string | null;
};
const playerPages = ["prompt", "similar"] as const;
type InitStateType = {
  crrRoute: (typeof playerPages)[number];
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  mobilePlayerOpen: boolean;
  playing: boolean;
  crrPlayingId: string | null;
  crrPlayingSong: PlayerSong | null;
  loop: boolean;
  trackReady: boolean | null;
  similar: {
    scannedSong: PlayerSong | null;
    songsList: PlayerSong[] | null;
    forwardLoadingMore: boolean;
    resPage: number;
    resQtt: number;
    loadingMore: boolean;
    allResultsShown: boolean;
  };
  prompt: {
    songsList: PlayerSong[] | null;
    forwardLoadingMore: boolean;
    resPage: number;
    resQtt: number;
    loadingMore: boolean;
    allResultsShown: boolean;
  };
};

const createCtx = <StateType, ActionType>(
  reducer: React.Reducer<StateType, ActionType>,
  initialState: StateType
) => {
  const defaultDispatch: React.Dispatch<ActionType> = () => initialState;
  const ctx = React.createContext({
    state: initialState,
    dispatch: defaultDispatch,
  });

  const Provider = (props: PropsWithChildren) => {
    const [state, dispatch] = useReducer(reducer, initialState);

    return (
      <ctx.Provider
        {...props}
        value={{
          state,
          dispatch,
        }}
      />
    );
  };

  return [ctx, Provider] as const;
};

const musicPlayerReducer = (state: InitStateType, action: ActionType) => {
  switch (action.type) {
    case "SAVE_SONGS": {
      return {
        ...state,
        [state.crrRoute]: {
          ...state[state.crrRoute],
          songsList: action.songs,
        },
      };
    }
    case "SAVE_SCANNED_SONG": {
      return {
        ...state,
        similar: {
          ...state.similar,
          scannedSong: action.song,
        },
      };
    }
    case "RESET_SIMILAR": {
      // empty audio src
      if (state.audioRef && state.audioRef.current) {
        state.audioRef.current.src = "";
        state.audioRef.current.currentTime = 0;
      }

      if (action.onlyResQtt) {
        return {
          ...state,
          similar: {
            ...state.similar,
            resPage: 1,
            resQtt: DEFAULT_RESULTS_QTT,
          },
        };
      } else {
        return {
          ...state,
          crrPlayingSong: null,
          trackReady: null,
          loop: false,
          playing: false,
          similar: {
            ...state.similar,
            songsList: null,
            resPage: 1,
            resQtt: DEFAULT_RESULTS_QTT,
          },
        };
      }
    }
    case "SAVE_CRR_ROUTE": {
      return {
        ...state,
        crrRoute: action.route,
      };
    }
    case "TOGGLE_MOBILE_PLAYER_OPEN": {
      return {
        ...state,
        mobilePlayerOpen: action.open,
      };
    }

    case "SET_SCANNING": {
      if (state[state.crrRoute].songsList) {
        const newSongsList = state[state.crrRoute].songsList as PlayerSong[];
        const newSongItem = newSongsList[action.index];

        if (newSongItem) {
          newSongsList[action.index] = {
            ...newSongItem,
            scanning: action.scanning,
          };
        }

        return {
          ...state,
          [state.crrRoute]: {
            ...state[state.crrRoute],
            songsList: [...newSongsList],
          },
        };
      }

      return state;
    }
    case "TOGGLE_PLAY": {
      return {
        ...state,
        playing: action.playing ?? !state.playing,
      };
    }
    case "TOGGLE_FAVORITE": {
      if (state[state.crrRoute].songsList) {
        const newSongsList = state[state.crrRoute].songsList as PlayerSong[];
        const newSongItem = newSongsList[action.songPos];

        if (newSongItem) {
          newSongsList[action.songPos] = {
            ...newSongItem,
            favorite: action.favorite,
          };
        }
        return {
          ...state,
          [state.crrRoute]: {
            ...state[state.crrRoute],
            songsList: [...newSongsList],
          },
        };
      }

      return state;
    }
    case "TOGGLE_LOOP": {
      return {
        ...state,
        loop: !state.loop,
      };
    }
    case "SET_TRACK_READY": {
      return {
        ...state,
        trackReady: action.ready,
      };
    }
    case "SAVE_AUDIO_REF": {
      return {
        ...state,
        audioRef: action.audioRef,
      };
    }
    case "SELECT_SONG_FROM_SCANNED_SONG": {
      const crrPlayingSong = state.crrPlayingSong as PlayerSong;

      // set audio src
      const playSong = (audioSrc: string) => {
        if (state.audioRef && state.audioRef.current) {
          // set audioRef src
          state.audioRef.current.src = audioSrc;
        }
      };

      switch (action.position) {
        case "crr": {
          const scannedSong = state.similar.scannedSong as PlayerSong;
          playSong(scannedSong.audioSrc as string);

          return {
            ...state,
            crrPlayingSong: scannedSong,
            similar: {
              ...state.similar,
            },
          };
        }
        case "next": {
          const songsList = state.similar.songsList;
          const closestPlayableSongRes = getClosestPlayableSong({
            position: "next",
            closesestTrackPosId: crrPlayingSong.position + 1,
            songsList,
            loadingMore: state[state.crrRoute].loadingMore,
          });

          if (closestPlayableSongRes) {
            if (closestPlayableSongRes === "LOAD_MORE") {
              return {
                ...state,
                [state.crrRoute]: {
                  ...state[state.crrRoute],
                  forwardLoadingMore: true,
                  resPage: state[state.crrRoute].resPage + 1,
                  resQtt:
                    (state[state.crrRoute].resPage + 1) * DEFAULT_RESULTS_QTT,
                  loadingMore: true,
                },
              };
            }

            playSong(closestPlayableSongRes.audioSrc as string); // audioSrc always valid, otherwise getClosestPlayableSong fn searchs on next track

            return {
              ...state,
              crrPlayingSong: closestPlayableSongRes,
              similar: {
                ...state.similar,
              },
            };
          }
        }

        default: {
          return state;
        }
      }
    }
    case "SELECT_SONG": {
      const songsList = state[state.crrRoute].songsList;
      const { audioRef } = state;
      const crrPlayingSong = state.crrPlayingSong as PlayerSong;

      const playSong = (audioSrc: string) => {
        if (audioRef && audioRef.current) {
          // set audioRef src
          audioRef.current.src = audioSrc;
        }
      };

      switch (action.position) {
        case "prev": {
          const closestPlayableSongRes =
            crrPlayingSong.position === 0 && state.crrRoute === "similar"
              ? state.similar.scannedSong
              : (getClosestPlayableSong({
                  position: "prev",
                  closesestTrackPosId: crrPlayingSong.position - 1,
                  songsList,
                  loadingMore: state[state.crrRoute].loadingMore,
                }) as PlayerSong | null);

          if (closestPlayableSongRes) {
            playSong(closestPlayableSongRes.audioSrc as string); // audioSrc always valid, otherwise getClosestPlayableSong fn searchs on next track

            return {
              ...state,
              crrPlayingSong: closestPlayableSongRes,
              [state.crrRoute]: {
                ...state[state.crrRoute],
                forwardLoadingMore: action.forwardLoadingMore || false,
              },
            };
          }
        }
        case "crr": {
          if (
            songsList &&
            typeof action.id === "number" &&
            action.id >= 0 &&
            songsList[action.id]
          ) {
            playSong((songsList[action.id] as PlayerSong).audioSrc as string);
            return {
              ...state,
              crrPlayingSong: songsList[action.id] as PlayerSong,
              [state.crrRoute]: {
                ...state[state.crrRoute],
              },
            };
          }

          return state;
        }
        case "next": {
          const closestPlayableSongRes = getClosestPlayableSong({
            position: "next",
            closesestTrackPosId: crrPlayingSong.position + 1,
            songsList,
            loadingMore: state[state.crrRoute].loadingMore,
          });

          if (closestPlayableSongRes) {
            if (closestPlayableSongRes === "LOAD_MORE") {
              return {
                ...state,
                [state.crrRoute]: {
                  ...state[state.crrRoute],
                  forwardLoadingMore: true,
                  resPage: state[state.crrRoute].resPage + 1,
                  resQtt:
                    (state[state.crrRoute].resPage + 1) * DEFAULT_RESULTS_QTT,
                  loadingMore: true,
                },
              };
            }

            playSong(closestPlayableSongRes.audioSrc as string); // audioSrc always valid, otherwise getClosestPlayableSong fn searchs on next track

            return {
              ...state,
              crrPlayingSong: closestPlayableSongRes,
              [state.crrRoute]: {
                ...state[state.crrRoute],
                forwardLoadingMore: action.forwardLoadingMore || false,
              },
            };
          }
        }

        default: {
          return state;
        }
      }
    }
    case "RESET_PROMPT": {
      // empty audio src
      if (state.audioRef.current) {
        state.audioRef.current.src = "";
        state.audioRef.current.currentTime = 0;
      }

      return {
        ...state,
        trackReady: null,
        crrPlayingSong: null,
        [action.route || state.crrRoute]: {
          ...state[action.route || state.crrRoute],
          songsList: null,
          resPage: 1,
          resQtt: DEFAULT_RESULTS_QTT,
          allResultsShown: false,
          loadingMore: false,
        },
      };
    }

    case "ALL_RESULTS_SHOWN": {
      return {
        ...state,
        [state.crrRoute]: {
          ...[state.crrRoute],
          allResultsShown: true,
        },
      };
    }
    case "SHOW_MORE_SIMILAR": {
      // console.log(
      //   "MUSICPLAYER REDUCER: inside SHOW_MORE_SIMILAR case fn",
      //   "action object",
      //   action
      // );
      // console.log("MUSICPLAYER REDUCER: crr route", state.crrRoute);
      // console.log("MUSICPLAYER REDUCER: state", state[state.crrRoute]);
      return {
        ...state,
        [state.crrRoute]: {
          ...state[state.crrRoute],
          resPage: state[state.crrRoute].resPage + 1,
          resQtt: (state[state.crrRoute].resPage + 1) * DEFAULT_RESULTS_QTT,
          loadingMore: true,
        },
      };
    }
    case "STOP_LOADING_MORE_SIMILAR": {
      // console.log("ABOUT TO stop loading more state");
      return {
        ...state,
        [state.crrRoute]: {
          ...state[state.crrRoute],
          loadingMore: false,
        },
      };
    }

    default: {
      return state;
    }
  }
};

const musicPlayerInitState: InitStateType = {
  crrRoute: playerPages[0],
  playing: false,
  mobilePlayerOpen: false,
  crrPlayingId: null,
  crrPlayingSong: null,
  loop: false,

  trackReady: null,
  audioRef: { current: null },
  similar: {
    scannedSong: null,
    songsList: null,
    forwardLoadingMore: false,
    resPage: 1,
    resQtt: DEFAULT_RESULTS_QTT,
    loadingMore: false,
    allResultsShown: false,
  },
  prompt: {
    songsList: null,
    forwardLoadingMore: false,
    resPage: 1,
    resQtt: DEFAULT_RESULTS_QTT,
    loadingMore: false,
    allResultsShown: false,
  },
};

const [ctx, MusicPlayerProvider] = createCtx(
  musicPlayerReducer,
  musicPlayerInitState
);
export const MusicPlayerContext = ctx;

const MusicPlayer = () => {
  const router = useRouter();
  const { status } = useSession();

  const {
    state: { crrPlayingSong, loop, trackReady, mobilePlayerOpen },
    dispatch,
  } = useContext(MusicPlayerContext);
  useEffect(() => {
    const crrRoute = router.pathname.includes("similar") ? "similar" : "prompt";
    dispatch({ type: "SAVE_CRR_ROUTE", route: crrRoute });
    dispatch({ type: "RESET_PROMPT", route: crrRoute });
  }, [router.pathname, dispatch]);

  const [soundHovered, setSoundHovered] = useState(false);

  const [crrSoundPerc, setCrrSoundPerc] = useState<number>(DEFAULT_SOUND);
  const [initSoundVal, setInitSoundVal] = useState<number>(DEFAULT_SOUND);

  const [crrSongPerc, setCrrSongPerc] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    dispatch({ type: "SAVE_AUDIO_REF", audioRef });
  }, [audioRef, dispatch]);

  const sliderRef = useRef<React.ElementRef<
    typeof SliderPrimitive.Root
  > | null>(null);

  const scanning = crrPlayingSong && crrPlayingSong.scanning;

  if (status !== "loading" && status !== "authenticated") return null;

  if (status === "authenticated") {
    return (
      <>
        <audio
          ref={audioRef}
          loop={loop}
          onLoadStart={() => {
            if (
              audioRef.current &&
              !audioRef.current.src.includes(
                process.env.NEXT_PUBLIC_VERCEL_URL as string
              )
            ) {
              dispatch({ type: "SET_TRACK_READY", ready: false });
            }
          }}
          onLoadedData={(e) => {
            const target = e.target as HTMLAudioElement;
            setDuration(target.duration);
          }}
          onCanPlay={() => {
            // console.log("ON CANPLAY", e);
            dispatch({ type: "SET_TRACK_READY", ready: true });
            if (audioRef.current) {
              void audioRef.current.play();
            }
            dispatch({ type: "TOGGLE_PLAY", playing: true });
          }}
          onTimeUpdate={(e) => {
            const target = e.target as HTMLAudioElement;
            if (duration) {
              const percentage = target.currentTime / duration;

              crrPlayingSong && setCrrSongPerc(percentage);
            }
          }}
          // onWaiting={() => {
          //   dispatch({ type: "SET_TRACK_READY", ready: false });
          // }}
          onEnded={() => {
            dispatch({ type: "TOGGLE_PLAY", playing: false });
            if (crrPlayingSong) {
              dispatch({
                type: "SELECT_SONG",
                position: "next",
              });
            }
          }}
          className="absolute top-0 left-0 z-50"
        />
        <div
          className={cn("fixed right-0 bottom-[88px] z-40 w-full md:bottom-0")}
        >
          {/* mobile floating playing bar */}
          {crrPlayingSong && (
            <div
              className={cn(
                "relative mx-2 flex cursor-pointer flex-col justify-center rounded-lg border border-gray-100 bg-gray-50 p-2 backdrop-blur-0 dark:border-transparent dark:bg-slate-700 md:hidden"
              )}
              onClick={(e) => {
                const target = e.target as HTMLDivElement;
                if (!target.closest("button")) {
                  dispatch({ type: "TOGGLE_MOBILE_PLAYER_OPEN", open: true });
                }
              }}
            >
              <div className="flex items-center space-x-2">
                {/* track cover */}
                <div className="relative mr-1 h-10 w-10 shrink-0">
                  <Image
                    alt={`${crrPlayingSong.title} playing`}
                    fill
                    className="rounded-md object-cover"
                    src={crrPlayingSong.coverUrl || "/defaultSongCover.jpeg"}
                  />
                </div>
                {/* Text */}
                <div className="w-[calc(100%-8rem)] text-sm dark:text-slate-50">
                  <p className="truncate font-bold ">{crrPlayingSong.title}</p>
                  <p className="truncate font-normal">
                    {crrPlayingSong.artists.join(", ")}
                  </p>
                </div>
                {/* controls */}
                <div className="absolute right-0 z-50 flex h-full">
                  {crrPlayingSong && (
                    <FavoriteBttn songPos={crrPlayingSong.position} />
                  )}
                  <PlayBttn
                    className={cn(
                      "relative p-2",
                      (scanning || trackReady === false) && "cursor-not-allowed"
                    )}
                    LoadingIcon={() => (
                      <LoadingIcon
                        className="top-2.5 left-0"
                        svgClassName="w-9 h-9"
                      />
                    )}
                    iconClassName="translate-x-0 fill-slate-900 dark:fill-white"
                  />
                </div>
              </div>
              <Progress
                value={crrSongPerc * 100}
                className="absolute inset-x-2 bottom-0 h-0.5 w-auto"
              />
            </div>
          )}

          {/* mobile overlay player */}
          <aside
            className={cn(
              "fixed inset-0 flex h-screen w-screen flex-col transition duration-200 ease-in-out md:hidden",
              "bg-gradient-to-b from-gray-50 to-gray-100 p-3",
              "dark:from-slate-800 dark:to-slate-900",
              mobilePlayerOpen ? "translate-y-0" : "translate-y-full"
            )}
          >
            {/* close and more */}
            <div className="mb-10 flex w-full items-center">
              <button
                className="p-2"
                onClick={() =>
                  dispatch({ type: "TOGGLE_MOBILE_PLAYER_OPEN", open: false })
                }
              >
                <ChevronDown className="h-8 w-8" />
              </button>

              <p className="w-full text-center text-sm font-bold dark:text-slate-50">
                Similar songs
              </p>

              <DropdownMenu>
                <DropdownMenuTrigger className="p-3">
                  <MoreHorizontal className="h-6 w-6" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="mr-3">
                  <DropdownMenuItem
                    className="disable-focus-visible flex cursor-pointer items-center space-x-3"
                    onClick={() => showToast("Coming Soon!", "warning")}
                  >
                    <ListPlus className="h-5 w-5 shrink-0" />
                    <span className="font-bold">Add to Playlist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="disable-focus-visible flex cursor-pointer items-center space-x-3"
                    onClick={() => showToast("Coming Soon!", "warning")}
                  >
                    <Disc className="h-5 w-5 shrink-0" />
                    <span className="font-bold">View Album</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* track cover */}
            {crrPlayingSong && (
              <div className="relative mb-6 h-full p-0">
                <Image
                  alt={`${crrPlayingSong.title} playing`}
                  fill
                  className="h-full w-full rounded-2xl object-contain shadow-cover"
                  src={crrPlayingSong.coverUrl || "/defaultSongCover.jpeg"}
                />
              </div>
            )}
            {/* title and favorite */}
            {crrPlayingSong && (
              <div className="mx-3 mb-4 flex items-center">
                <div className="w-full overflow-hidden">
                  {scanning ? (
                    <div className="flex flex-col space-y-1">
                      <SkeletonText className="w-1/2 text-xl" />
                      <SkeletonText className="w-1/3" />
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-2xl font-bold">
                        {crrPlayingSong.title}
                      </p>
                      <p className="truncate font-normal">
                        {crrPlayingSong.artists.join(", ")}
                      </p>
                    </>
                  )}
                </div>
                <FavoriteBttn
                  className="p-3 pr-0"
                  songPos={crrPlayingSong.position}
                />
              </div>
            )}

            {/* mobile progress bar */}
            <div className="mx-3 mb-5">
              <Slider
                max={1}
                step={0.01}
                value={[crrSongPerc]}
                className="pt-5 pb-2"
                onValueChange={(value) => {
                  if (audioRef.current && value[0] && duration) {
                    // translate value to seconds
                    audioRef.current.currentTime = convertToSeconds(
                      duration,
                      value[0]
                    );
                  }
                }}
              />
              <div className="flex justify-between text-[0.6875rem] dark:text-slate-50">
                {duration && (
                  <>
                    <span className="block h-4">
                      {formatSongDuration(
                        convertToSeconds(duration, crrSongPerc)
                      )}
                    </span>
                    <span>{formatSongDuration(duration)}</span>
                  </>
                )}
              </div>
            </div>
            {/* controls */}
            <PlaybackControls />
            {/* play in device and share buttons */}
            <div className="flex justify-between">
              <div
                className={cn(
                  "p-2",

                  scanning && "fill-slate-400 text-slate-400"
                )}
              >
                <MonitorSpeaker className="h-4 w-4" />
              </div>
              <div
                className={cn(
                  "p-2",
                  scanning && "fill-slate-400 text-slate-400"
                )}
              >
                <Share2 className="h-4 w-4" />
              </div>
            </div>
          </aside>

          {/* DESKTOP PLAYER */}
          <div className="hidden h-24 border-t border-t-gray-100 bg-gray-50 p-4 dark:border-t-slate-700 dark:bg-slate-900 md:flex">
            <div className="flex w-full items-center justify-start overflow-hidden">
              {/* track cover */}
              {crrPlayingSong && (
                <div className="relative h-14 w-14 shrink-0">
                  <Image
                    src={crrPlayingSong.coverUrl || "/defaultSongCover.jpeg"}
                    alt={`${crrPlayingSong.title} playing`}
                    fill
                    className="shrink-0 rounded-md object-cover"
                  />
                </div>
              )}

              {/* Text */}
              {crrPlayingSong && (
                <div className="mx-3.5 w-1/2 text-sm">
                  <p className="truncate dark:text-slate-50 ">
                    {crrPlayingSong.title}
                  </p>
                  <p className="truncate text-[0.6875rem] text-slate-500 dark:text-slate-400">
                    {crrPlayingSong.artists.join(", ")}
                  </p>
                </div>
              )}

              {/* favorite */}
              {crrPlayingSong && (
                <FavoriteBttn
                  className="group"
                  iconClassName="h-4 w-4"
                  songPos={crrPlayingSong.position}
                />
              )}
            </div>
            <div className="w-full ">
              <PlaybackControls className="mb-2" />
              <div className="flex space-x-2 text-[0.6875rem]">
                {duration && (
                  <span>
                    {formatSongDuration(
                      convertToSeconds(duration, crrSongPerc)
                    )}
                  </span>
                )}

                {/* desktop progress bar */}
                <Slider
                  className="h-4"
                  max={1}
                  step={0.01}
                  value={[crrSongPerc]}
                  onValueChange={(value) => {
                    if (audioRef.current && value[0] && duration) {
                      // translate value to seconds
                      audioRef.current.currentTime = convertToSeconds(
                        duration,
                        value[0]
                      );
                    }
                  }}
                />
                {duration && <span>{formatSongDuration(duration)}</span>}
              </div>
            </div>
            <div className="mr-1 flex w-full items-center justify-end">
              <div className="relative flex w-full items-center justify-end">
                <button
                  className="group p-2"
                  disabled={scanning ?? false}
                  onClick={() => {
                    showToast("Coming Soon!", "warning");
                  }}
                >
                  <MonitorSpeaker
                    className={cn(
                      "h-4 w-4",
                      !scanning
                        ? "text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50"
                        : "text-slate-400"
                    )}
                  />
                </button>
                <button
                  className="group p-2"
                  onMouseEnter={() => setSoundHovered(true)}
                  onMouseLeave={() => setSoundHovered(false)}
                  disabled={scanning ?? false}
                  onClick={() => {
                    if (crrSoundPerc <= MIN_VOL_TO_MUTE) {
                      // come back to prev vol if user manually droppes volume to mutable levels
                      setCrrSoundPerc(initSoundVal);
                      if (audioRef.current) {
                        audioRef.current.volume = initSoundVal;
                      }
                    } else {
                      // save crr vol for next click to fall back to that value
                      setInitSoundVal(crrSoundPerc);
                      const newSoundVal = crrSoundPerc > 0 ? 0 : initSoundVal;
                      setCrrSoundPerc(newSoundVal);
                      if (audioRef.current) {
                        audioRef.current.volume = newSoundVal;
                      }
                    }
                  }}
                >
                  {(() => {
                    const SoundIcon =
                      crrSoundPerc <= MIN_VOL_TO_MUTE
                        ? VolumeX
                        : crrSoundPerc > MIN_VOL_TO_MUTE && crrSoundPerc < 0.75
                        ? Volume1
                        : crrSoundPerc >= 0.75
                        ? Volume2
                        : null;

                    if (SoundIcon) {
                      return (
                        <SoundIcon
                          className={cn(
                            "h-4 w-4",
                            !scanning
                              ? "text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50"
                              : "text-slate-400"
                          )}
                        />
                      );
                    }
                    return null;
                  })()}
                </button>
                {/* volume slider */}
                <Slider
                  className="max-w-[100px]"
                  max={1}
                  step={0.01}
                  disabled={!trackReady}
                  value={[crrSoundPerc]}
                  onValueChange={(value) => {
                    if (value[0] && audioRef.current) {
                      // (resultsPage + 1) * DEFAULT_RESULTS_QTTconsole.log("value[0]", value[0]);
                      if (value[0] <= MIN_VOL_TO_MUTE) {
                        setCrrSoundPerc(0);
                        audioRef.current.volume = 0;
                      } else {
                        setCrrSoundPerc(value[0]);
                        audioRef.current.volume = value[0];
                      }
                    }
                  }}
                  soundHovered={soundHovered}
                  ref={sliderRef}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return null;
};

const PlaybackControls = ({ className }: { className?: string }) => {
  const { state, dispatch } = useContext(MusicPlayerContext);

  const {
    crrPlayingSong,
    loop,
    trackReady,
    crrRoute,
    similar: { scannedSong },
  } = state;
  const songsList = state[state.crrRoute].songsList;

  const onSimilar = crrRoute === "similar";
  const prevSongInvalid =
    songsList &&
    crrPlayingSong &&
    !songsList[crrPlayingSong.position - 1]?.audioSrc;
  const notOnSimilarPrevSongInvalid = !onSimilar && prevSongInvalid;
  const onSimilarPrevSongInvalid = onSimilar && prevSongInvalid && !scannedSong;
  const onSimilarScannedSongPlaying =
    onSimilar && crrPlayingSong && crrPlayingSong.position === -1;

  const firstSong =
    notOnSimilarPrevSongInvalid ||
    onSimilarPrevSongInvalid ||
    onSimilarScannedSongPlaying;
  const scanning = crrPlayingSong?.scanning;

  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between md:justify-center md:space-x-2",
        className ? className : ""
      )}
    >
      {/* scan button */}
      {crrPlayingSong ? (
        <ScanSimilarsBttn
          trackId={crrPlayingSong?.id}
          iconClassName="h-6 w-6 md:h-4 md:w-4"
        />
      ) : (
        <span className="h-12 w-12 opacity-0 md:h-8 md:w-8" />
      )}

      {/* backward button */}
      <button
        className="group p-3 md:p-2"
        disabled={scanning || !!firstSong || !crrPlayingSong}
        onClick={() => {
          if (
            state.crrRoute === "similar" &&
            state.similar.scannedSong &&
            state.crrPlayingSong?.position === -1
          )
            return;

          if (
            crrPlayingSong &&
            !firstSong &&
            !state[state.crrRoute].loadingMore
          ) {
            dispatch({
              type: "SELECT_SONG",
              position: "prev",
            });

            return;
          }
        }}
      >
        <SkipBack
          className={cn(
            "h-8 w-8 fill-current md:h-4 md:w-4",
            scanning || !!firstSong || !crrPlayingSong
              ? "fill-slate-400 md:text-slate-400"
              : "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50"
          )}
        />
      </button>

      {/* play button */}
      <PlayBttn
        className={cn(
          "relative m-1 rounded-full bg-white p-3.5 text-center md:p-2",
          (scanning || !trackReady) && "opacity-50",
          trackReady === false && "md:hover:scale-125 "
        )}
        LoadingIcon={() => (
          <LoadingIcon
            className="-top-3 -left-3 md:-top-1.5 md:-left-1.5 "
            svgClassName="w-20 h-20 md:h-11 md:w-11 "
          />
        )}
        iconClassName={cn(
          "h-7 w-7 translate-x-0.5 fill-black text-black md:h-4 md:w-4",
          scanning && "fill-slate-400 text-slate-400"
        )}
      />

      {/* forward button */}
      <button
        className="group p-3 md:p-2"
        disabled={
          scanning ||
          !crrPlayingSong ||
          (!state[state.crrRoute].songsList
            ?.slice(crrPlayingSong.position + 1)
            .find((song) => song.audioSrc) &&
            state[state.crrRoute].loadingMore)
        }
        onClick={() => {
          if (state[state.crrRoute].songsList) {
            // if scanned song tries to forward, execute another case
            if (
              state.crrRoute === "similar" &&
              state.similar.scannedSong &&
              state.crrPlayingSong?.position === -1
            ) {
              dispatch({
                type: "SELECT_SONG_FROM_SCANNED_SONG",
                position: "next",
              });

              return;
            }

            if (
              crrPlayingSong &&
              !(
                state[state.crrRoute].loadingMore &&
                crrPlayingSong.position ===
                  (state[state.crrRoute].songsList as PlayerSong[]).length - 1
              )
            ) {
              dispatch({
                type: "SELECT_SONG",
                position: "next",
              });

              return;
            }
          }
        }}
      >
        <SkipForward
          className={cn(
            "h-8 w-8 fill-current md:h-4 md:w-4",
            scanning ||
              !crrPlayingSong ||
              (!state[state.crrRoute].songsList
                ?.slice(crrPlayingSong.position + 1)
                .find((song) => song.audioSrc) &&
                state[state.crrRoute].loadingMore)
              ? "fill-slate-400 md:text-slate-400"
              : "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50"
          )}
        />
      </button>

      {/* loop button */}
      {crrPlayingSong ? (
        <button
          className={cn("group p-3 md:p-2", scanning && "text-slate-400")}
          onClick={() => dispatch({ type: "TOGGLE_LOOP" })}
        >
          <Repeat
            className={cn(
              "h-6 w-6 md:h-4 md:w-4",
              !loop &&
                !scanning &&
                "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50",
              loop &&
                "text-accentBright md:text-accent md:group-hover:text-accentBright"
            )}
          />
        </button>
      ) : (
        <span className="h-12 w-12 opacity-0 md:h-8 md:w-8" />
      )}
    </div>
  );
};

const PlayBttn = ({
  className,
  LoadingIcon,
  iconClassName,
}: {
  className: string;
  LoadingIcon: React.ElementType;
  iconClassName: string;
}) => {
  const {
    state: { crrPlayingSong, playing, trackReady, audioRef },
    dispatch,
  } = useContext(MusicPlayerContext);
  const scanning = crrPlayingSong?.scanning;

  return (
    <button
      className={className}
      onClick={() => {
        if (audioRef.current) {
          if (trackReady && !playing) {
            void audioRef.current.play();
          } else {
            audioRef.current.pause();
          }
          dispatch({ type: "TOGGLE_PLAY" });
        }
      }}
      disabled={scanning || trackReady === false}
    >
      {trackReady === false && audioRef.current?.src && <LoadingIcon />}
      {playing ? (
        <Pause className={cn(iconClassName, "translate-x-0")} />
      ) : (
        <Play className={iconClassName} />
      )}
    </button>
  );
};

export const LoadingIcon = ({
  className,
  svgClassName,
}: Partial<Record<string, string>>) => (
  <div className={cn("z-70 absolute flex flex-row", className)}>
    <span className="">
      <svg
        className={cn("animate-spin text-slate-900", svgClassName)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M 4 12 a 8 8 0 0 1 8 -8 V 2 C 4 2 2 9 2 12 h 2 z m 2 6 A 7.962 7.962 0 0 1 4 12 H 2 c 0 3 1.135 5.824 3 7.938 z"
        />
      </svg>
    </span>
  </div>
);

export const ScanSimilarsBttn = ({
  trackPos,
  trackId,
  linkClassName,
  className,
  iconClassName,
  text,
  ...props
}: React.ComponentProps<typeof Button> & {
  trackPos?: number;
  trackId?: string;
  linkClassName?: string;
  className?: string;
  iconClassName?: string;
  text?: React.ReactNode;
}) => {
  const { state, dispatch } = useContext(MusicPlayerContext);

  const { crrPlayingSong } = state;
  const songsList = state[state.crrRoute].songsList;

  const validIndex =
    (typeof trackPos === "number" && (trackPos === 0 ? "0" : trackPos)) ||
    crrPlayingSong?.position;

  const scanning =
    (songsList && validIndex && songsList[validIndex]?.scanning) ||
    crrPlayingSong?.scanning;

  return (
    <Link
      href={
        (WEBAPP_URL &&
          trackId &&
          `${WEBAPP_URL}/discover/similar?trackid=${trackId}`) ||
        ""
      }
      onClick={() => {
        if (!scanning) {
          showToast("Discovering similar songs!", "success");
          dispatch({
            type: "SET_SCANNING",
            index: validIndex as number,
            scanning: true,
          });
          dispatch({ type: "RESET_SIMILAR", onlyResQtt: true });
        }
      }}
      className={cn(linkClassName)}
    >
      <button
        {...props}
        className={cn(
          "group p-3 md:p-2",
          scanning && "cursor-not-allowed",
          className
        )}
      >
        <ScanLine
          className={cn(
            "h-4 w-4 stroke-[2.2]",
            "text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50",
            scanning && "!text-accentBright",
            iconClassName
          )}
        />
        {text && <span>{text}</span>}
      </button>
    </Link>
  );
};

export const FavoriteBttn = ({
  className,
  iconClassName,
  songPos,
  ...props
}: React.ComponentProps<typeof Button> & {
  className?: string;
  iconClassName?: string;
  songPos: number;
}) => {
  const { state, dispatch } = useContext(MusicPlayerContext);

  const { crrPlayingSong } = state;
  const songsList = state[state.crrRoute].songsList;

  const song =
    (songsList &&
      (songPos === 0 || (songPos && songPos > 0)) &&
      songsList[songPos]) ||
    crrPlayingSong;
  const toggleFavoriteMutation = api.spotify.toggleFavorite.useMutation({
    onMutate: async ({ isFavorite }) => {
      console.log("💪running mutation!");
      dispatch({ type: "TOGGLE_FAVORITE", songPos, favorite: !isFavorite });
    },
    onError: async (_, { isFavorite }) => {
      // revert to original isFavorite value
      console.log("🔴error mutation!");
      dispatch({ type: "TOGGLE_FAVORITE", songPos, favorite: isFavorite });
    },
    onSuccess: async () => {
      showToast("Added to favorite", "success");
    },
  });

  const scanning = song && song.scanning;
  const favorite = song && song.favorite;
  const disabled = props.disabled || scanning;

  return (
    <button
      {...props}
      className={cn("p-2", className ? className : "")}
      onClick={() => {
        if (songsList && !disabled && song) {
          console.log("🖱favorite button cliecke!");
          toggleFavoriteMutation.mutate({
            trackId: song.id,
            isFavorite: song.favorite,
          });
        }
      }}
    >
      <Heart
        className={cn(
          !disabled &&
            !favorite &&
            "group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50",
          disabled && "text-slate-400",
          favorite && "fill-accent text-accent dark:text-accent",
          iconClassName
        )}
      />
    </button>
  );
};

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <>
      <style jsx global>{`
				:root {
					--font-sans: ${fontSans.style.fontFamily};
				}
			}`}</style>
      <Toaster position="top-center" />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SessionProvider session={session}>
          <MusicPlayerProvider>
            <Component {...pageProps} />
            <MusicPlayer />
            <ReactQueryDevtools initialIsOpen={true} />
          </MusicPlayerProvider>
        </SessionProvider>
      </ThemeProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
