import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { Inter as FontSans } from "@next/font/google";
import { SessionProvider } from "next-auth/react";

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
} from "lucide-react";
import { useState } from "react";
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

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

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
      <Toaster position="bottom-center" />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SessionProvider session={session}>
          <Component {...pageProps} />
          <MusicPlayer />
        </SessionProvider>
      </ThemeProvider>
    </>
  );
};

const MusicPlayer = () => {
  const [favourite, setFavourite] = useState(false);
  const [playerOpen, setPlayerOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [scanning, setScanning] = useState(false);

  return (
    <div className={cn("fixed right-0 bottom-[88px] z-40 w-full")}>
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
          <button
            className="p-2"
            onClick={() => {
              !favourite && showToast("Coming Soon!", "warning");
              setFavourite(!favourite);
            }}
          >
            <Heart
              className={cn(
                "stroke-slate-600 dark:stroke-slate-400",
                favourite && "fill-accent stroke-accent dark:stroke-accent"
              )}
            />
          </button>
          <button className="p-2">
            <Play className="fill-slate-900 dark:fill-white" />
          </button>
        </div>
      </div>
      {/* mobile overlay player */}
      <aside
        className={cn(
          "fixed inset-0 flex h-screen w-screen transform flex-col transition duration-200 ease-in-out",
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
          <button
            className={cn("p-3 pr-0", scanning && "cursor-not-allowed")}
            onClick={() => {
              !favourite && showToast("Coming Soon!", "warning");
              setFavourite(!favourite);
            }}
            disabled={scanning}
          >
            <Heart
              className={cn(
                "text-slate-600 dark:text-slate-400",
                favourite && "fill-accent text-accent dark:text-accent",
                scanning && "text-slate-400"
              )}
            />
          </button>
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
        <div className="mb-4 flex items-center justify-between">
          <button
            className="p-3"
            onClick={() => {
              setScanning(true);
              showToast("Discovering new similar songs!", "success");
              setTimeout(() => {
                setScanning(false);
                showToast("10 songs found", "success");
              }, 3000);
            }}
          >
            <ScanLine className={cn(scanning && "text-accent")} />
          </button>
          <button
            className={cn(
              "p-3",
              scanning && "cursor-not-allowed text-slate-400"
            )}
            disabled={scanning}
          >
            <SkipBack className="h-8 w-8" />
          </button>

          <button
            className={cn(
              "m-1 rounded-full bg-white p-3.5 text-center",
              scanning && "cursor-not-allowed"
            )}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? (
              <Play
                className={cn(
                  "h-7 w-7 translate-x-0.5 fill-black text-black",
                  scanning && "fill-slate-400 text-slate-400"
                )}
              />
            ) : (
              <Pause
                className={cn(
                  "h-7 w-7 fill-black text-black",
                  scanning && "fill-slate-400 text-slate-400"
                )}
              />
            )}
          </button>
          <button
            className={cn(
              "p-3",
              scanning && "cursor-not-allowed text-slate-400"
            )}
          >
            <SkipForward className="h-8 w-8" />
          </button>
          <button
            className={cn(
              "p-3",
              scanning && "cursor-not-allowed text-slate-400"
            )}
            onClick={() => setLoop(!loop)}
          >
            <Repeat className={cn(loop && "text-accent")} />
          </button>
        </div>
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
    </div>
  );
};

// "md:border-t md:border-t-slate-700 md:bg-slate-900 "
export default api.withTRPC(MyApp);
