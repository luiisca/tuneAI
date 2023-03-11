import { type AppType } from "next/app";
import { useSession } from "next-auth/react";
import { type Session } from "next-auth";
import { Inter as FontSans } from "@next/font/google";
import { SessionProvider } from "next-auth/react";
import * as SliderPrimitive from "@radix-ui/react-slider";
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
import { Button } from "@/components/ui/core/button";
import {
  DEFAULT_RESULTS_QTT,
  DEFAULT_SOUND,
  MIN_VOL_TO_MUTE,
} from "@/utils/constants";
import { Progress } from "@/components/ui/progress";
import { convertToSeconds, formatSongDuration } from "@/utils/song-time";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/router";
import Link from "next/link";
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
      type: "RESET_SIMILAR_SONGS";
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
      type: "TOGGLE_FAVOURITE";
      songPos: number;
      favourite: boolean;
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
      type: "SELECT_SCANNED_SONG";
    }
  | {
      type: "SELECT_SONG";
      forwardLoadingMore?: boolean;
      songPos: number;
      position?: "prev" | "next";
      loadingMore?: boolean;
      trackReady?: boolean;
    }
  | {
      type: "RESET_SEARCH";
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
  favourite: boolean;
  audioSrc: string | null;
};
const playerPages = ["ai", "similar"] as const;
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
  ai: {
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
      console.log("SAVING SONGS", state.crrRoute);
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
    case "RESET_SIMILAR_SONGS": {
      const { audioRef } = state;
      if (audioRef && audioRef.current) {
        audioRef.current.src = "";
        audioRef.current.currentTime = 0;
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
      }
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
        const newSongsList = state[state.crrRoute].songsList!;
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
    case "TOGGLE_FAVOURITE": {
      if (state[state.crrRoute].songsList) {
        const newSongsList = state[state.crrRoute].songsList!;
        const newSongItem = newSongsList[action.songPos];

        if (newSongItem) {
          newSongsList[action.songPos] = {
            ...newSongItem,
            favourite: action.favourite,
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
    case "SELECT_SCANNED_SONG": {
      return {
        ...state,
        crrPlayingSong: state.similar.scannedSong,
      };
    }
    case "SELECT_SONG": {
      // determine if forward or backward
      const prev = action.position === "prev";
      const next = action.position === "next";
      const positionId = prev
        ? action.songPos - 1
        : next
        ? action.songPos + 1
        : action.songPos;

      const songsList = state[state.crrRoute].songsList;
      const {
        audioRef,
        crrRoute,
        similar: { scannedSong },
      } = state;

      const scannedIsPrev =
        prev && scannedSong && positionId === -1 && crrRoute === "similar";
      const nextFromScanned =
        next && scannedSong && positionId === 0 && crrRoute === "similar";
      const selectScanned =
        !prev &&
        !next &&
        positionId === -1 &&
        scannedSong &&
        crrRoute === "similar";

      // jump from selected track and songsList and viceversa when forwarding or backwarding
      if (scannedIsPrev || selectScanned) {
        if (audioRef && audioRef.current) {
          audioRef.current.src = scannedSong.audioSrc || "";
        }

        return {
          ...state,
          crrPlayingPos: action.songPos,
          crrPlayingSong: scannedSong,
          similar: {
            ...state.similar,
            forwardLoadingMore: false,
          },
        };
      }
      if (nextFromScanned) {
        if (audioRef && audioRef.current && songsList && songsList[0]) {
          audioRef.current.src = songsList[0].audioSrc || "";
        }

        return {
          ...state,
          crrPlayingPos: action.songPos,
          crrPlayingSong: songsList ? songsList[0] : null,
          similar: {
            ...state.similar,
            forwardLoadingMore: false,
          },
        };
      }

      const nonInvalidSongPos = action.songPos === -1 || action.songPos > -1;

      const getClosestPlayableSong = () => {
        if (songsList && (next || prev) && !songsList[positionId]?.audioSrc) {
          if (next && positionId >= songsList.length) {
            console.log("latest el selected, returning load more");
            return "LOAD_MORE";
          }
          for (
            let i = positionId;
            prev ? i >= 0 : i < songsList.length;
            prev ? i-- : i++
          ) {
            console.log("inside for", songsList.length, "index", i);
            if (songsList[i]?.audioSrc) {
              console.log("audio available");
              return songsList[i];
            } else if (next && songsList.length - 1 === i) {
              console.log("last item selected");
              // is the last one and theres still is no audio, return load more signal
              return "LOAD_MORE";
            }
          }
        }

        if (songsList) {
          console.log("current one selected, returning crr song");
          return songsList[positionId];
        }
      };
      console.log("POSITION ID", positionId, "action", action.songPos);

      const closestSongRes = getClosestPlayableSong();
      console.log("closestSongRes", closestSongRes);

      if (closestSongRes === "LOAD_MORE") {
        console.log("updating state to load more");
        console.log("forwarding", action.forwardLoadingMore);
        return {
          ...state,
          [state.crrRoute]: {
            ...state[state.crrRoute],
            forwardLoadingMore: true,
            resPage: state[state.crrRoute].resPage + 1,
            resQtt: (state[state.crrRoute].resPage + 1) * DEFAULT_RESULTS_QTT,
            loadingMore: true,
          },
          trackReady: action.trackReady || false,
        };
      }

      if (
        audioRef &&
        audioRef.current &&
        nonInvalidSongPos &&
        songsList &&
        closestSongRes
      ) {
        console.log("setting audio src");
        // set audioRef src
        audioRef.current.src = closestSongRes.audioSrc || "";
      }

      return {
        ...state,
        crrPlayingPos: action.songPos,
        crrPlayingSong:
          (songsList &&
            nonInvalidSongPos &&
            (getClosestPlayableSong() as PlayerSong)) ||
          null,
        [state.crrRoute]: {
          ...state[state.crrRoute],
          forwardLoadingMore: action.forwardLoadingMore || false,
        },
      };
    }
    case "RESET_SEARCH": {
      if (state.audioRef.current) {
        state.audioRef.current.src = "";
        state.audioRef.current.currentTime = 0;
      }
      console.log("is reset serach running");

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
      console.log(
        "MUSICPLAYER REDUCER: inside SHOW_MORE_SIMILAR case fn",
        "action object",
        action
      );
      console.log("MUSICPLAYER REDUCER: crr route", state.crrRoute);
      console.log("MUSICPLAYER REDUCER: state", state);
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
      console.log("ABOUT TO stop loading more state");
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
  ai: {
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
    const crrRoute = router.pathname.includes("similar") ? "similar" : "ai";
    dispatch({ type: "SAVE_CRR_ROUTE", route: crrRoute });
    dispatch({ type: "RESET_SEARCH", route: crrRoute });
  }, [router.pathname]);

  const [soundHovered, setSoundHovered] = useState(false);

  const [crrSoundPerc, setCrrSoundPerc] = useState<number>(DEFAULT_SOUND);
  const [initSoundVal, setInitSoundVal] = useState<number>(DEFAULT_SOUND);

  const [crrSongPerc, setCrrSongPerc] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    dispatch({ type: "SAVE_AUDIO_REF", audioRef });
  }, [audioRef]);

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
            // console.log("ON LOADED DATA", e);
            setDuration(target.duration);
            setCrrSoundPerc(target.volume);
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
            const percentage = target.currentTime / duration!;

            crrPlayingSong && setCrrSongPerc(percentage);
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
                songPos: crrPlayingSong.position,
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
                <div className="dark:slate-50 w-[calc(100%-8rem)] text-sm">
                  <p className="truncate font-bold">{crrPlayingSong.title}</p>
                  <p className="truncate font-normal">
                    {crrPlayingSong.artists.join(", ")}
                  </p>
                </div>
                {/* controls */}
                <div className="absolute right-0 z-50 flex h-full">
                  {crrPlayingSong && (
                    <FavouriteBttn songPos={crrPlayingSong.position} />
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
              "fixed inset-0 flex h-screen w-screen transform flex-col transition duration-200 ease-in-out md:hidden",
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

              <p className="dark:slate-50 w-full text-center text-sm font-bold">
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
            {/* title and favourite */}
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
                <FavouriteBttn
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
                {scanning ? (
                  <>
                    <SkeletonText className="w-8" />
                    <SkeletonText className="w-8" />
                  </>
                ) : (
                  <>
                    <span className="block h-4">
                      {duration &&
                        formatSongDuration(
                          convertToSeconds(duration, crrSongPerc)
                        )}
                    </span>
                    <span>{duration && formatSongDuration(duration)}</span>
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
                <div className="dark:slate-50 mx-3.5 w-1/2 text-sm">
                  <p className="truncate">{crrPlayingSong.title}</p>
                  <p className="truncate text-[0.6875rem] text-slate-500 dark:text-slate-400">
                    {crrPlayingSong.artists.join(", ")}
                  </p>
                </div>
              )}

              {/* favourite */}
              {crrPlayingSong && (
                <FavouriteBttn
                  className="group"
                  iconClassName="h-4 w-4"
                  songPos={crrPlayingSong.position}
                />
              )}
            </div>
            <div className="w-full ">
              <PlaybackControls className="mb-2" />
              <div className="flex space-x-2 text-[0.6875rem]">
                {scanning ? (
                  <>
                    <SkeletonText className="w-8 dark:bg-slate-700" />
                  </>
                ) : (
                  <>
                    <span>
                      {duration &&
                        formatSongDuration(
                          convertToSeconds(duration, crrSongPerc)
                        )}
                    </span>
                  </>
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
                {scanning ? (
                  <>
                    <SkeletonText className="w-8 dark:bg-slate-700" />
                  </>
                ) : (
                  <>
                    <span>{duration && formatSongDuration(duration)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="mr-1 flex w-full items-center justify-end">
              <div className="relative flex w-full items-center justify-end">
                <button
                  className={cn("group p-2", scanning && "cursor-not-allowed")}
                  disabled={scanning ?? false}
                  onClick={() => {
                    showToast("Coming Soon!", "warning");
                  }}
                >
                  <MonitorSpeaker
                    className={cn(
                      "h-4 w-4",
                      !scanning &&
                        "text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50",
                      scanning && "text-slate-400"
                    )}
                  />
                </button>
                <button
                  className={cn("group p-2", scanning && "cursor-not-allowed")}
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
                            !scanning &&
                              "text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50",
                            scanning && "text-slate-400"
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
        className={cn(
          "group p-3 md:p-2",
          (scanning || firstSong) && "cursor-not-allowed text-slate-400"
        )}
        disabled={scanning || !!firstSong}
        onClick={() => {
          if (crrPlayingSong && !firstSong) {
            dispatch({
              type: "SELECT_SONG",
              position: "prev",
              songPos: crrPlayingSong.position,
            });
          }
        }}
      >
        <SkipBack
          className={cn(
            "h-8 w-8 fill-current md:h-4 md:w-4",
            !scanning &&
              !firstSong &&
              "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50",
            (scanning || firstSong) && "fill-slate-400 md:text-slate-400"
          )}
        />
      </button>

      {/* play button */}
      <PlayBttn
        className={cn(
          "relative m-1 rounded-full bg-white p-3.5 text-center md:p-2",
          (scanning || !trackReady) && "cursor-not-allowed opacity-50",
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
        className={cn(
          "group p-3 md:p-2",
          scanning && "cursor-not-allowed text-slate-400"
        )}
        disabled={scanning}
        onClick={() => {
          if (crrPlayingSong) {
            dispatch({
              type: "SELECT_SONG",
              position: "next",
              songPos: crrPlayingSong.position,
            });
          }
        }}
      >
        <SkipForward
          className={cn(
            "h-8 w-8 fill-current md:h-4 md:w-4",
            !scanning &&
              "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50",
            scanning && "fill-slate-400 md:text-slate-400"
          )}
        />
      </button>

      {/* loop button */}
      <button
        className={cn(
          "group p-3 md:p-2",
          scanning && "cursor-not-allowed text-slate-400"
        )}
        onClick={() => dispatch({ type: "TOGGLE_LOOP" })}
      >
        <Repeat
          className={cn(
            "md:h-4 md:w-4",
            !loop &&
              !scanning &&
              "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50",
            loop &&
              "text-accentBright md:text-accent md:group-hover:text-accentBright"
          )}
        />
      </button>
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
  musicPlayer,
  className,
  iconClassName,
  ...props
}: React.ComponentProps<typeof Button> & {
  trackPos?: number;
  trackId?: string;
  musicPlayer?: boolean;
  className?: string;
  iconClassName?: string;
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
      shallow={true}
      href={`${process.env.NEXT_PUBLIC_VERCEL_URL}/discover/similar?trackid=${trackId}`}
      onClick={() => {
        if (!scanning) {
          showToast("Discovering similar songs!", "success");
          dispatch({
            type: "SET_SCANNING",
            index: validIndex as number,
            scanning: true,
          });
          dispatch({ type: "RESET_SIMILAR_SONGS", onlyResQtt: true });
        }
      }}
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
            "h-4 w-4",
            "text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50",
            scanning && "!text-accentBright",
            iconClassName
          )}
        />
      </button>
    </Link>
  );
};

export const FavouriteBttn = ({
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

  // console.log("SONG", song);
  const scanning = song && song.scanning;
  const favourite = song && song.favourite;
  const disabled = props.disabled || scanning;

  return (
    <button
      {...props}
      className={cn(
        "p-2",
        disabled && "cursor-not-allowed",
        className ? className : ""
      )}
      onClick={() => {
        if (songsList && !disabled) {
          !favourite && showToast("Coming Soon!", "warning");
          dispatch({ type: "TOGGLE_FAVOURITE", songPos, favourite: true });
          setTimeout(() => {
            dispatch({ type: "TOGGLE_FAVOURITE", songPos, favourite: false });
          }, 1000);
        }
      }}
    >
      <Heart
        className={cn(
          "text-slate-600 dark:text-slate-400",
          !disabled &&
            !favourite &&
            "group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50",
          disabled && "text-slate-400",
          favourite && "fill-accent text-accent dark:text-accent",
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
