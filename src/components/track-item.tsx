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
        "group flex h-14 cursor-pointer items-center justify-between rounded-md py-2 md:px-4 md:hover:bg-slate-100 md:dark:hover:bg-slate-700",
        !track.previewUrl && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex h-full w-1/2 space-x-4 md:w-2/3 lg:w-4/5">
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
      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          {track.previewUrl && (
            <ScanSimilarsBttn
              trackPos={index}
              trackId={track.id}
              className="group-hover:opacity-100 lg:opacity-0"
            />
          )}
          <FavouriteBttn
            className="group group-hover:opacity-100 lg:opacity-0"
            iconClassName="h-4 w-4"
            songPos={index}
            disabled={!track.previewUrl}
          />
        </div>
        <span className="flex w-[5ch] justify-end text-end text-sm tabular-nums text-slate-600 dark:text-slate-300">
          {formatSongDuration(track.duration)}
        </span>
      </div>
    </li>
  );
};
