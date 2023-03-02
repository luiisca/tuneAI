import { env } from "@/env/server.mjs";
import { DEFAULT_RESULTS_QTT } from "@/utils/constants";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "../trpc";
import { getAccessToken } from "../utils";

const getSpotifyTrack = async (trackId: string, refreshToken: string) => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(`${env.SPOTIFY_API_ENDPOINT}/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const data = (await res.json()) as
    | SpotifyApi.SingleTrackResponse
    | SpotifyApi.ErrorObject;
  console.log("single track data", data);

  if ("message" in data) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: data.message,
    });
  }

  return {
    id: data.id,
    title: data.name,
    artists: data.artists.map((artist) => artist.name),
    previewUrl: data.preview_url,
    duration: data.duration_ms / 1000,
    coverUrl:
      data?.album?.images[0]?.url ||
      data?.album?.images[1]?.url ||
      "/defaultSongCover.jpeg",
  };
};

const getSpotifySearchResults = async (
  trackName: string,
  offset: number,
  refreshToken: string
) => {
  const accessToken = await getAccessToken(refreshToken);
  const query_params = new URLSearchParams({
    q: trackName,
    type: "track",
    limit: DEFAULT_RESULTS_QTT.toString(),
    offset: offset.toString(),
  });
  const res = await fetch(
    `${env.SPOTIFY_API_ENDPOINT}/search?${query_params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken!}`,
        "Content-Type": "application/json",
      },
    }
  );
  const data = (await res.json()) as SpotifyApi.TrackSearchResponse;

  return data.tracks;
};

export const spotifyRouter = createTRPCRouter({
  singleTrack: protectedProcedure
    .input(
      z.object({
        trackId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session } = ctx;
      const { trackId } = input;
      return await getSpotifyTrack(trackId, session.accessToken);
    }),
  tracksList: protectedProcedure
    .input(
      z.object({
        trackName: z.string(),
        offset: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session } = ctx;
      const { trackName, offset } = input;
      if (session) {
        const tracks = (await getSpotifySearchResults(
          trackName,
          offset,
          session.accessToken
        )) as unknown as SpotifyApi.PagingObject<SpotifyApi.TrackObjectFull>;

        return tracks.items.map((track) => ({
          id: track.id,
          duration: track.duration_ms / 1000,
          coverUrl:
            track.album.images[0]?.url ||
            track.album.images[1]?.url ||
            "/defaultSongCover.jpeg",
          previewUrl: track.preview_url,
          title: track.name,
          artists: track.artists.map((artist) => artist.name),
        }));
      }
    }),
});
