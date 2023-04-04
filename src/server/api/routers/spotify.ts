import { env } from "@/env/server.mjs";
import { DEFAULT_RESULTS_QTT } from "@/utils/constants";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "../trpc";
import { getAccessToken } from "../utils";

const getSpotifyTrack = async (trackId: string, refreshToken: string) => {
  const accessToken = await getAccessToken(refreshToken);
  // SPOTIFY ERROR
  if (!accessToken) {
    return {
      code: "AUTH_ERROR",
      message: "Access token failed",
    };
  }

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

  // SPOTIFY ERROR
  if ("message" in data) {
    return {
      code: "NOT_FOUND",
      message: data.message,
    };
  }

  return {
    id: data.id,
    position: -1,
    favorite: false,
    scanning: false,
    audioSrc: data.preview_url,
    title: data.name,
    artists: data.artists.map((artist) => artist.name),
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
  // SPOTIFY ERROR
  if (!accessToken) {
    return {
      code: "AUTH_ERROR",
      message: "Access token failed",
    };
  }

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
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  const data = (await res.json()) as
    | SpotifyApi.TrackSearchResponse
    | SpotifyApi.ErrorObject;

  // SPOTIFY ERROR
  if ("message" in data) {
    return {
      code: "NOT_FOUND",
      message: data.message,
    };
  }

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
        const tracks = await getSpotifySearchResults(
          trackName,
          offset,
          session.accessToken
        );
        if ("message" in tracks) {
          return tracks;
        }

        return tracks.items.map((track) => ({
          id: track.id,
          title: track.name,
          artists: track.artists.map((artist) => artist.name),
          previewUrl: track.preview_url,
          duration: track.duration_ms / 1000,
          coverUrl:
            track.album.images[0]?.url ||
            track.album.images[1]?.url ||
            "/defaultSongCover.jpeg",
        }));
      }

      return [];
    }),
  toggleFavorite: protectedProcedure
    .input(
      z.object({
        trackId: z.string(),
        isFavorite: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { trackId, isFavorite } = input;
      // throw new TRPCError({
      //   code: "CONFLICT",
      //   message: "NOPE",
      // });

      const accessToken = await getAccessToken(ctx.session.accessToken);
      // SPOTIFY ERROR
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Access token failed",
        });
      }

      const res = await fetch(`${env.SPOTIFY_API_ENDPOINT}/me/tracks`, {
        method: isFavorite ? "DELETE" : "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: [trackId] }),
      });

      if (res.status == 200) {
        return;
      }

      const data = (await res.json()) as SpotifyApi.ErrorObject;
      if ("message" in data) {
        throw new TRPCError({
          code: "CONFLICT",
          message: data.message,
        });
      }
    }),
});
