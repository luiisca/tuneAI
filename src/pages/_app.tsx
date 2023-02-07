import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { Inter as FontSans } from "@next/font/google";
import { SessionProvider } from "next-auth/react";

import { api } from "../utils/api";

import "../styles/globals.css";
import { ThemeProvider } from "next-themes";

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
  return (
    <div className="fixed bottom-0 hidden border-t border-t-slate-700 bg-slate-900">
      {/* track cover */}
      <div>
        <div className="h-12 w-12 animate-pulse bg-slate-700">Image</div>
        <div>
          <p>song's name</p>
          <p>artist name</p>
        </div>
      </div>
      {/* controls */}
      <div>Controls</div>
    </div>
  );
};

export default api.withTRPC(MyApp);
