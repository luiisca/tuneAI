import { PlayerSong } from "@/pages/_app";

export const getClosestPlayableSong = ({
  position,
  closesestTrackPosId,
  songsList,
  loadingMore,
}: {
  position: "next" | "prev";
  closesestTrackPosId: number;
  songsList: PlayerSong[] | null;
  loadingMore: boolean;
}) => {
  if (songsList) {
    // no closest song found
    if (!songsList[closesestTrackPosId]?.audioSrc) {
      // go through all previous or next songs until finding a playable track
      for (
        let i = closesestTrackPosId;
        position === "prev" ? i >= 0 : i <= songsList.length;
        position === "prev" ? i-- : i++
      ) {
        // valid track found
        if (songsList[i]?.audioSrc) {
          return songsList[i];
        }

        // last songsList selected and trying to go next loads more results
        if (position === "next" && songsList.length === i && !loadingMore) {
          return "LOAD_MORE";
        }
      }
    } else {
      return songsList[closesestTrackPosId];
    }
  }
};
