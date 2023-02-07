import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { Inter as FontSans } from "@next/font/google";
import { SessionProvider } from "next-auth/react";

import { api } from "../utils/api";

import "../styles/globals.css";
import { ThemeProvider } from "next-themes";
import { cn } from "@/utils/cn";
import { Heart, Play } from "lucide-react";
import { useState } from "react";
import { Toaster } from "react-hot-toast";
import showToast from "@/components/ui/core/notifications";

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

  return (
    <div className={cn("fixed right-0 bottom-[88px] z-40 w-full")}>
      {/* mobile floating playing bar */}
      <div
        className={cn(
          "mx-2 flex items-center space-x-2 rounded-lg border border-gray-100 bg-gray-50 p-2 backdrop-blur-0 dark:border-transparent dark:bg-slate-700 md:hidden"
        )}
      >
        {/* track cover */}
        <div className="mr-1 ">
          <div className="h-10 w-10 animate-pulse rounded-md bg-slate-900"></div>
        </div>
        {/* Text */}
        <div className="w-full text-sm">
          <p className="font-bold">song's name</p>
          <p className="font-normal">artist name</p>
        </div>
        {/* controls */}
        <div className="flex h-full">
          <div
            className="p-2"
            onClick={() => {
              !favourite && showToast("Soon!", "warning");
              setFavourite(!favourite);
            }}
          >
            <Heart
              className={cn(
                "stroke-slate-600 dark:stroke-slate-400",
                favourite && "fill-accent stroke-accent"
              )}
            />
          </div>
          <div className="p-2 ">
            <Play className="fill-slate-900 dark:fill-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

// "md:border-t md:border-t-slate-700 md:bg-slate-900 "
export default api.withTRPC(MyApp);
