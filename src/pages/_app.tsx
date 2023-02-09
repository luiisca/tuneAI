import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { Inter as FontSans } from "@next/font/google";
import { SessionProvider } from "next-auth/react";
import * as SliderPrimitive from "@radix-ui/react-slider";

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
  Volume,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
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

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const FavouriteBttn = ({
  className,
  iconClassName,
  ...props
}: React.ComponentProps<typeof Button> & {
  className?: string;
  iconClassName?: string;
}) => {
  const {
    state: { favourite, scanning },
    dispatch,
  } = useContext(MusicPlayerContext);

  return (
    <button
      {...props}
      className={cn(
        "p-2",
        scanning && "cursor-not-allowed",
        className ? className : ""
      )}
      onClick={() => {
        !favourite && showToast("Coming Soon!", "warning");
        dispatch({ type: "TOGGLE_FAVOURITE" });
        setTimeout(() => {
          dispatch({ type: "TOGGLE_FAVOURITE" });
        }, 1000);
      }}
      disabled={scanning}
    >
      <Heart
        className={cn(
          "text-slate-600 dark:text-slate-400",
          !scanning &&
            "group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50",
          scanning && "text-slate-400",
          favourite && "fill-accent text-accent dark:text-accent",
          iconClassName ? iconClassName : ""
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
      type: "TOGGLE_PLAY";
      // payload: src, ai analysis
    }
  | {
      type: "TOGGLE_FAVOURITE";
    }
  | {
      type: "SET_SCANNING";
      scanning: boolean;
    }
  | {
      type: "TOGGLE_LOOP";
    };
type InitStateType = {
  index: number | null; // playing song id for play icon on songs list
  playing: boolean;
  favourite: boolean;
  scanning: boolean;
  loop: boolean;
};

const musicPlayerReducer = (state: InitStateType, action: ActionType) => {
  switch (action.type) {
    case "TOGGLE_PLAY": {
      return {
        ...state,
        playing: !state.playing,
        // set new src,
        // set ai analysis, etc
      };
    }
    case "TOGGLE_FAVOURITE": {
      return {
        ...state,
        favourite: !state.favourite,
      };
    }
    case "SET_SCANNING": {
      return {
        ...state,
        scanning: action.scanning,
      };
    }
    case "TOGGLE_LOOP": {
      return {
        ...state,
        loop: !state.loop,
      };
    }

    default: {
      return state;
    }
  }
};

const musicPlayerInitState: InitStateType = {
  playing: false,
  favourite: false,
  index: null,
  scanning: false,
  loop: false,
};

const [ctx, MusicPlayerProvider] = createCtx(
  musicPlayerReducer,
  musicPlayerInitState
);
export const MusicPlayerContext = ctx;

const MusicPlayer = () => {
  const {
    state: { scanning },
  } = useContext(MusicPlayerContext);
  const [playerOpen, setPlayerOpen] = useState(true);
  const [soundHovered, setSoundHovered] = useState(true);
  const [crrSoundVal, setCrrSoundVal] = useState<number>(DEFAULT_SOUND);
  const [initSoundVal, setInitSoundVal] = useState<number>(crrSoundVal);
  const [muted, setMuted] = useState(false);
  const sliderRef = useRef<React.ElementRef<
    typeof SliderPrimitive.Root
  > | null>(null);

  const updateSliderPosition = useCallback(
    (soundVal: number) => {
      if (sliderRef.current) {
        const sliderElement = Array.from(
          sliderRef.current.children as HTMLCollectionOf<HTMLElement>
        );
        if (sliderElement[0]) {
          const sliderTrack = Array.from(
            sliderElement[0].children as HTMLCollectionOf<HTMLElement>
          );
          if (sliderTrack[0]) {
            sliderTrack[0].style.right = `${100 - soundVal}%`;
          }
        }
        if (sliderElement[1]) {
          sliderElement[1].style.left = `calc(
                    ${soundVal}% +
                    ${
                      Math.floor(soundVal) === 0
                        ? "6px"
                        : soundVal === 100
                        ? "-6px"
                        : "3px"
                    }
                  )`;
        }
      }
    },
    [sliderRef.current?.children, sliderRef.current?.children[1]]
  );

  useEffect(() => {
    updateSliderPosition(initSoundVal);
  }, []);

  return (
    <div className={cn("fixed right-0 bottom-[88px] z-40 w-full md:bottom-0")}>
      {/* mobile floating playing bar */}
      <div
        className={cn(
          "relative mx-2 flex cursor-pointer items-center space-x-2 rounded-lg border border-gray-100 bg-gray-50 p-2 backdrop-blur-0 dark:border-transparent dark:bg-slate-700 md:hidden"
        )}
        onClick={(e) => {
          if (!e.target.closest("button")) {
            setPlayerOpen(true);
          }
        }}
      >
        {/* track cover */}
        <div className="mr-1 ">
          <div className="h-10 w-10 animate-pulse rounded-md bg-slate-900"></div>
        </div>
        {/* Text */}
        <div className="dark:slate-50 w-full text-sm">
          <p className="font-bold">Song's name</p>
          <p className="font-normal">Artist name</p>
        </div>
        {/* controls */}
        <div className="absolute right-0 z-50 flex h-full">
          <FavouriteBttn />
          <button className="p-2">
            <Play className="fill-slate-900 dark:fill-white" />
          </button>
        </div>
      </div>

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
          {/* {similars && <p>Similar songs</p>} */}

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
        <div className="mb-6 h-full p-0">
          <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900" />
        </div>
        {/* title and favourite */}
        <div className="mx-3 mb-4 flex items-center">
          <div className="w-full">
            {scanning ? (
              <div className="flex flex-col space-y-1">
                <SkeletonText className="w-1/2 text-xl" />
                <SkeletonText className="w-1/3" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold">Song's name</p>
                <p className="font-normal">Artist name</p>
              </>
            )}
          </div>
          <FavouriteBttn className="p-3 pr-0" />
        </div>

        {/* progress bar */}
        <div className="mx-3 mb-5">
          <Slider max={100} step={0.01} value={[20]} className="pt-5 pb-2" />
          <div className="flex justify-between text-[0.6875rem] dark:text-slate-50">
            {scanning ? (
              <>
                <SkeletonText className="w-8" />
                <SkeletonText className="w-8" />
              </>
            ) : (
              <>
                <span>0:00</span>
                <span>3:31</span>
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
            className={cn("p-2", scanning && "fill-slate-400 text-slate-400")}
          >
            <Share2 className="h-4 w-4" />
          </div>
        </div>
      </aside>

      {/* desktop player */}
      <div className="hidden h-24 border-t border-t-gray-100 bg-gray-50 p-4 dark:border-t-slate-700 dark:bg-slate-900 md:flex">
        <div className="flex w-full items-center justify-start">
          {/* track cover */}
          <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-md bg-slate-500"></div>

          {/* Text */}
          <div className="dark:slate-50 mx-3.5 text-sm ">
            <p>Song's name</p>
            <p className="text-[0.6875rem] text-slate-500 dark:text-slate-400">
              Artist name
            </p>
          </div>

          {/* favourite */}
          <FavouriteBttn className="group" iconClassName="h-4 w-4" />
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
                <span>0:00</span>
              </>
            )}
            <Slider max={100} step={0.01} value={[20]} className="" />
            {scanning ? (
              <>
                <SkeletonText className="w-8 dark:bg-slate-700" />
              </>
            ) : (
              <>
                <span>3:31</span>
              </>
            )}
          </div>
        </div>
        <div className="mr-1 flex w-full items-center justify-end">
          <button
            className={cn("group p-2", scanning && "cursor-not-allowed")}
            disabled={scanning}
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
          <div className="relative flex w-1/2 items-center">
            <button
              className={cn("group p-2", scanning && "cursor-not-allowed")}
              onMouseEnter={() => setSoundHovered(true)}
              onMouseLeave={() => setSoundHovered(false)}
              disabled={scanning}
              onClick={() => {
                if (Math.floor(crrSoundVal) <= MIN_VOL_TO_MUTE) {
                  setCrrSoundVal(initSoundVal);
                  updateSliderPosition(initSoundVal);
                } else {
                  setInitSoundVal(crrSoundVal);
                  const newSoundVal = crrSoundVal > 0 ? 0 : initSoundVal;
                  setCrrSoundVal(newSoundVal);
                  updateSliderPosition(newSoundVal);
                }
              }}
            >
              {(() => {
                let SoundIcon =
                  Math.floor(crrSoundVal) <= MIN_VOL_TO_MUTE
                    ? VolumeX
                    : crrSoundVal > MIN_VOL_TO_MUTE && crrSoundVal < 75
                    ? Volume1
                    : crrSoundVal >= 75
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
            <Slider
              max={100}
              step={1}
              value={[crrSoundVal]}
              defaultValue={[DEFAULT_SOUND]}
              onValueChange={(value) => {
                if (value[0]) {
                  console.log("value", value[0]);
                  if (value[0] <= MIN_VOL_TO_MUTE) {
                    setCrrSoundVal(0);
                    updateSliderPosition(0);
                  } else {
                    setCrrSoundVal(value[0]);
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
  );
};

const PlaybackControls = ({ className }: { className?: string }) => {
  const {
    state: { scanning, playing },
    dispatch,
  } = useContext(MusicPlayerContext);
  const [loop, setLoop] = useState(false);

  return (
    <div
      className={cn(
        "mb-4 flex items-center justify-between md:justify-center md:space-x-2",
        className ? className : ""
      )}
    >
      <button
        className="group p-3 md:p-2"
        onClick={() => {
          dispatch({ type: "SET_SCANNING", scanning: true });
          showToast("Discovering similar songs!", "success");
          setTimeout(() => {
            dispatch({ type: "SET_SCANNING", scanning: false });
            showToast("10 songs found", "success");
          }, 3000);
        }}
      >
        <ScanLine
          className={cn(
            "md:h-4 md:w-4",
            "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50",
            scanning && "!text-accentBright "
          )}
        />
      </button>
      <button
        className={cn(
          "group p-3 md:p-2",
          scanning && "cursor-not-allowed text-slate-400"
        )}
        disabled={scanning}
      >
        <SkipBack
          className={cn(
            "h-8 w-8 fill-current md:h-4 md:w-4",
            !scanning &&
              "md:text-slate-800 md:group-hover:text-slate-900 md:dark:text-slate-300 md:dark:group-hover:text-slate-50",
            scanning && "fill-slate-400 md:text-slate-400"
          )}
        />
      </button>

      <button
        className={cn(
          "m-1 rounded-full bg-white p-3.5 text-center hover:scale-125 md:p-2",
          scanning && "cursor-not-allowed"
        )}
        onClick={() => dispatch({ type: "TOGGLE_PLAY" })}
      >
        {playing ? (
          <Play
            className={cn(
              "h-7 w-7 translate-x-0.5 fill-black text-black md:h-4 md:w-4",
              scanning && "fill-slate-400 text-slate-400"
            )}
          />
        ) : (
          <Pause
            className={cn(
              "h-7 w-7 fill-black text-black md:h-4 md:w-4",
              scanning && "fill-slate-400 text-slate-400"
            )}
          />
        )}
      </button>
      <button
        className={cn(
          "group p-3 md:p-2",
          scanning && "cursor-not-allowed text-slate-400"
        )}
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
      <button
        className={cn(
          "group p-3 md:p-2",
          scanning && "cursor-not-allowed text-slate-400"
        )}
        onClick={() => setLoop(!loop)}
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
          </MusicPlayerProvider>
        </SessionProvider>
      </ThemeProvider>
    </>
  );
};

export default api.withTRPC(MyApp);
