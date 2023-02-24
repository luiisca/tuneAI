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
import { DEFAULT_SOUND, MIN_VOL_TO_MUTE } from "@/utils/constants";
import { Progress } from "@/components/ui/progress";
import { convertToSeconds, formatSongDuration } from "@/utils/song-time";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const ScanSimilarsBttn = ({
  index,
  musicPlayer,
  className,
  iconClassName,
  ...props
}: React.ComponentProps<typeof Button> & {
  index?: number;
  musicPlayer?: boolean;
  className?: string;
  iconClassName?: string;
}) => {
  const {
    state: { songsList, crrPlayingSong },
    dispatch,
  } = useContext(MusicPlayerContext);
  const scanning =
    (songsList &&
      (index === 0 || (index && index > 0)) &&
      songsList[index]?.scanning) ||
    crrPlayingSong?.scanning;

  const disabled = props.disabled || scanning;

  index = crrPlayingSong?.position || index;

  return (
    <button
      {...props}
      className={cn(
        "group p-3 md:p-2",
        disabled && "cursor-not-allowed",
        className
      )}
      onClick={() => {
        if (!disabled) {
          dispatch({
            type: "SET_SCANNING",
            index: index as number,
            scanning: true,
          });
          showToast("Discovering similar songs!", "success");
          setTimeout(() => {
            dispatch({
              type: "SET_SCANNING",
              index: index as number,
              scanning: false,
            });
            showToast("10 songs found", "success");
          }, 3000);
        }
      }}
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
  const {
    state: { songsList, crrPlayingSong },
    dispatch,
  } = useContext(MusicPlayerContext);
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

type ActionType =
  | {
      type: "SAVE_SONGS";
      songs: PlayerSong[];
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
      type: "SET_SCANNING";
      index: number;
      scanning: boolean;
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
      type: "SELECT_SONG";
      songPos: number;
      position?: "prev" | "next";
    };

type PlayerSong = {
  position: number;
  id: string;
  title: string;
  scanning: boolean;
  artists: string[];
  coverUrl: string;
  favourite: boolean;
  audioSrc: string;
};
type InitStateType = {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  songsList: PlayerSong[] | null;
  playing: boolean;
  crrPlayingId: string | null;
  crrPlayingSong: PlayerSong | null;
  loop: boolean;
  trackReady: boolean | null;
};

const musicPlayerReducer = (state: InitStateType, action: ActionType) => {
  switch (action.type) {
    case "SAVE_SONGS": {
      return {
        ...state,
        songsList: action.songs,
      };
    }
    case "TOGGLE_PLAY": {
      return {
        ...state,
        playing: action.playing ?? !state.playing,
      };
    }
    case "TOGGLE_FAVOURITE": {
      if (state.songsList) {
        const newSongsList = state.songsList;
        const newSongItem = newSongsList[action.songPos];

        if (newSongItem) {
          newSongsList[action.songPos] = {
            ...newSongItem,
            favourite: action.favourite,
          };
        }
        return {
          ...state,
          songsList: [...newSongsList],
        };
      }

      return state;
    }
    case "SET_SCANNING": {
      if (state.songsList) {
        const newSongsList = state.songsList;
        const newSongItem = newSongsList[action.index];

        if (newSongItem) {
          newSongsList[action.index] = {
            ...newSongItem,
            scanning: action.scanning,
          };
        }

        return {
          ...state,
          songsList: [...newSongsList],
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
    case "SELECT_SONG": {
      // determine if forward or backward
      const prev = action.position === "prev";
      const next = action.position === "next";
      const positionId = prev
        ? action.songPos - 1
        : next
        ? action.songPos + 1
        : action.songPos;

      const nonNegativeSongPos =
        action.songPos === 0 || (action.songPos && action.songPos > 0);

      const getClosestPlayableSong = () => {
        if (state.songsList && !state.songsList[positionId]?.audioSrc) {
          for (
            let i = positionId;
            prev ? i >= 0 : i < state.songsList.length;
            prev ? i-- : i++
          ) {
            if (state.songsList[i]?.audioSrc) {
              return state.songsList[i];
            }
          }
        }

        if (state.songsList) {
          return state.songsList[positionId];
        }
      };
      // set audioRef src
      if (
        state.audioRef &&
        state.audioRef.current &&
        nonNegativeSongPos &&
        state.songsList
      ) {
        state.audioRef.current.src = getClosestPlayableSong()?.audioSrc || "";
      }

      return {
        ...state,
        crrPlayingPos: action.songPos,
        crrPlayingSong:
          (state.songsList && nonNegativeSongPos && getClosestPlayableSong()) ||
          null,
      };
    }

    default: {
      return state;
    }
  }
};

const musicPlayerInitState: InitStateType = {
  playing: false,
  crrPlayingId: null,
  crrPlayingSong: null,
  loop: false,

  songsList: null,
  trackReady: null,
  audioRef: { current: null },
};

const [ctx, MusicPlayerProvider] = createCtx(
  musicPlayerReducer,
  musicPlayerInitState
);
export const MusicPlayerContext = ctx;

const MusicPlayer = () => {
  const { status } = useSession();

  const {
    state: { crrPlayingSong, loop, trackReady },
    dispatch,
  } = useContext(MusicPlayerContext);

  const [playerOpen, setPlayerOpen] = useState(false);
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
            dispatch({ type: "SET_TRACK_READY", ready: false });
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

            setCrrSongPerc(percentage);
          }}
          onWaiting={() => {
            dispatch({ type: "SET_TRACK_READY", ready: false });
          }}
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
                  setPlayerOpen(true);
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
                <div className="dark:slate-50 w-full text-sm">
                  <p className="truncate font-bold">{crrPlayingSong.title}</p>
                  <p className="truncate font-normal">
                    {crrPlayingSong.artists[0]}
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
              playerOpen ? "translate-y-0" : "translate-y-full"
            )}
          >
            {/* close and more */}
            <div className="mb-10 flex w-full items-center">
              <button className="p-2" onClick={() => setPlayerOpen(false)}>
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
                    className="flex items-center space-x-3"
                    onClick={() => showToast("Coming Soon!", "warning")}
                  >
                    <ListPlus />
                    <span className="font-bold">Add to Playlist</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-3">
                    <Disc />
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
                <div className="w-full">
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
                        {crrPlayingSong.artists[0]}
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
            <div className="flex w-full items-center justify-start">
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
                <div className="dark:slate-50 mx-3.5 text-sm ">
                  <p className="truncate">{crrPlayingSong.title}</p>
                  <p className="truncate text-[0.6875rem] text-slate-500 dark:text-slate-400">
                    {crrPlayingSong.artists[0]}
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
  const {
    state: { songsList, crrPlayingSong, loop, trackReady },
    dispatch,
  } = useContext(MusicPlayerContext);
  const firstSong = crrPlayingSong ? crrPlayingSong.position === 0 : false;
  const lastSong =
    crrPlayingSong && songsList?.length
      ? songsList.length - 1 === crrPlayingSong.position
      : false;
  const scanning = crrPlayingSong?.scanning;

  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between md:justify-center md:space-x-2",
        className ? className : ""
      )}
    >
      {/* scan button */}
      <ScanSimilarsBttn
        disabled={!crrPlayingSong}
        index={crrPlayingSong?.position as number}
        iconClassName="h-6 w-6 md:h-4 md:w-4"
      />

      {/* back button */}
      <button
        className={cn(
          "group p-3 md:p-2",
          (scanning || firstSong) && "cursor-not-allowed text-slate-400"
        )}
        disabled={scanning || firstSong}
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
          (scanning || lastSong) && "cursor-not-allowed text-slate-400"
        )}
        disabled={scanning || lastSong}
        onClick={() => {
          if (crrPlayingSong && !lastSong) {
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
              !lastSong &&
              "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50",
            (scanning || lastSong) && "fill-slate-400 md:text-slate-400"
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
      {trackReady === false && <LoadingIcon />}
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

// "md:border-t md:border-t-slate-700 md:bg-slate-900 "
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
            {/* <ReactQueryDevtools initialIsOpen={true} /> */}
          </MusicPlayerProvider>
        </SessionProvider>
      </ThemeProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
