import { env } from "@/env/server.mjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

const searchSongsQueryDocument = `
query FreeTextSearch($text: String!) {
  freeTextSearch(
    first: 10
    target: { spotify: {} }
    searchText: $text
  ) {
    ... on FreeTextSearchError {
      message
      code
    }
    ... on FreeTextSearchConnection {
      edges {
        cursor
        node {
          title
          audioAnalysisV6 {
            ... on AudioAnalysisV6Finished {
              result {
                genreTags
                moodTags
                instrumentTags
                musicalEraTag
              }
            }
          }
        }
      }
    }
  }
}
`;

interface SearchSongsResult {
  data: {
    freeTextSearch: {
      edges: {
        cursor: string;
        node: {
          title: string;
          audioAnalysisV6: {
            result: {
              genreTags: string[];
              moodTags: string[];
              instrumentTags: string[];
              musicalEraTag: string;
            };
          };
        };
      }[];
    };
  };
}
export type SongType = {
  id: string;
  title: string;
  previewUrl: string | null;
  coverUrl: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  musicalEra: string;
};

// cianity api calls
const getAiRecomSongs = async (text: string) => {
  const res = await fetch(env.API_URL, {
    method: "POST",
    body: JSON.stringify({
      query: searchSongsQueryDocument,
      variables: {
        text,
      },
    }),
    headers: {
      Authorization: `Bearer ${env.ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const songs = (await res.json()) as SearchSongsResult;
  console.log("CIANYTE SONGS", songs);
  return songs.data.freeTextSearch.edges;
};

// spotify api calls
// should be an api endpoint https://github.com/trpc/trpc/discussions/997
const getAccessToken = async (refreshToken: string): Promise<string | null> => {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await res.json();
  console.log("ACCESS TOKEN DATA", data);
  return data.access_token;
};
const getSpotifyTrackData = async (trackId: string, refreshToken: string) => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(`${env.SPOTIFY_API_ENDPOINT}/tracks/${trackId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = (await res.json()) as SpotifyApi.TrackObjectFull;
  console.log("SPOTIFY DATA", data);
  return {
    coverUrl:
      data?.album?.images[0]?.url ||
      data?.album?.images[1]?.url ||
      "/defaultSongCover.jpeg",
    previewUrl: data?.preview_url,
  };
};

// routers
export const searchAiRouter = createTRPCRouter({
  getSongs: publicProcedure
    .input(z.string())
    .query(async ({ ctx, input: text }) => {
      const { session } = ctx;
      let songs: SongType[] = [];

      if (session) {
        const recomSongsRes = await getAiRecomSongs(text);
        console.log("RECOM SONGS RESP", recomSongsRes);

        const promises = recomSongsRes.map(async (recomSong) => {
          const trackId = recomSong.cursor;
          const spotifyTrack = await getSpotifyTrackData(
            trackId,
            session.accessToken
          );

          return {
            ...spotifyTrack,
            id: recomSong.cursor,
            title: recomSong.node.title,
            genres: recomSong.node.audioAnalysisV6.result.genreTags,
            moods: recomSong.node.audioAnalysisV6.result.moodTags,
            instruments: recomSong.node.audioAnalysisV6.result.instrumentTags,
            musicalEra: recomSong.node.audioAnalysisV6.result.musicalEraTag,
          };
        });
        const results = await Promise.allSettled(promises);
        songs = results.flatMap((result) =>
          result.status === "fulfilled" ? result.value : []
        );

        return songs;
      }
    }),
});
