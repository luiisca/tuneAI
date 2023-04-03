import Image from "next/image";
import {
  FavouriteBttn,
  MusicPlayerContext,
  ScanSimilarsBttn,
} from "../pages/_app";
import { formatSongDuration } from "@/utils/song-time";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import type { SongType } from "@/server/api/routers/discover";
import { useContext } from "react";
import showToast from "./ui/core/notifications";
import { cn } from "@/utils/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { ExternalLink, MoreVertical } from "lucide-react";
import Link from "next/link";

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
    <div
      onClick={(e) => {
        const target = e.target as HTMLLIElement;
        if (!target.closest("button")) {
          if (track.previewUrl) {
            dispatch({
              type: "SELECT_SONG",
              position: "crr",
              id: index,
            });
          } else {
            showToast("Cannot play. Sorry", "error");
          }
        }
      }}
      className={cn(
        "group/track flex h-14 cursor-pointer items-center justify-between rounded-md py-2 md:px-4 md:hover:bg-slate-100 md:dark:hover:bg-slate-700",
        !track.previewUrl && "cursor-default "
      )}
    >
      <div
        className={cn(
          "flex h-full w-1/2 space-x-4 md:w-2/3 lg:w-4/5",
          !track.previewUrl && "opacity-40"
        )}
      >
        <span className="hidden w-4 shrink-0 items-center justify-center font-semibold md:flex">
          {index + 1}
        </span>
        <div className="relative !ml-0 h-10 w-10 shrink-0 md:!ml-4">
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
      <div className="flex items-center space-x-2">
        <div className="flex items-center">
          {track.previewUrl && (
            <ScanSimilarsBttn trackPos={index} trackId={track.id} />
          )}

          <Link
            href={track.spotifyUrl}
            target="_blank"
            className="group hidden p-2 xl:group-hover/track:block"
          >
            <ExternalLink className="h-4 w-4 text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50" />
          </Link>
          <FavouriteBttn
            className="group"
            iconClassName="h-4 w-4"
            songPos={index}
          />
        </div>
        <span
          className={cn(
            "hidden w-[5ch] justify-end text-end text-sm tabular-nums text-slate-600 dark:text-slate-300 md:flex",

            !track.previewUrl && "opacity-40"
          )}
        >
          {formatSongDuration(track.duration)}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex h-10 items-center p-3 xl:hidden",
              "rounded-md text-slate-700 hover:text-slate-800 dark:text-slate-100 dark:hover:text-slate-200 "
            )}
          >
            <MoreVertical className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="mr-3">
            {track.previewUrl && (
              <DropdownMenuItem
                className="cursor-pointer "
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <ScanSimilarsBttn
                  trackPos={index}
                  trackId={track.id}
                  className="flex w-full items-center space-x-3 !p-0"
                  iconClassName="h-5 w-5 font-semibold"
                  text="Find similar songs"
                />
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              asChild
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="group flex cursor-pointer items-center space-x-3"
            >
              <Link href={track.spotifyUrl} target="_blank">
                <ExternalLink className="h-5 w-5 shrink-0 text-slate-600 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-slate-50" />

                <span>Listen on Spotify</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
