import { env } from "@/env/server.mjs";
import { DEFAULT_RESULTS_QTT } from "@/utils/constants";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

const searchSongsQueryDocument = `
query FreeTextSearch($text: String!, $first: Int!) {
  freeTextSearch(
    first: $first
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
  artists: string[];
  previewUrl: string | null;
  duration: number;
  coverUrl: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  musicalEra: string;
};

// cianity api calls
const getAiRecomSongs = async (text: string, first: number) => {
  const res = await fetch(env.API_URL, {
    method: "POST",
    body: JSON.stringify({
      query: searchSongsQueryDocument,
      variables: {
        text,
        first,
      },
    }),
    headers: {
      Authorization: `Bearer ${env.ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const songs = (await res.json()) as SearchSongsResult;
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
  return data.access_token;
};
const getSpotifyTracksData = async (tracksId: string, refreshToken: string) => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(
    `${env.SPOTIFY_API_ENDPOINT}/tracks?ids=${tracksId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log("res spotify", res.headers);
  const data = (await res.json()) as SpotifyApi.MultipleTracksResponse;
  console.log("spotify data", data);

  return data.tracks;
};

// routers
export const searchAiRouter = createTRPCRouter({
  getSongs: publicProcedure
    .input(
      z.object({
        text: z.string(),
        first: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session } = ctx;
      const { text, first } = input;
      // should now receive page so it could use it to only query the results for that page
      // e.i instead of sending 100 requests to the spotify API, we could use the current page and
      // to slice the cyanity API results and that way always make requests for the last 10 results
      // so instead of 100 just 10 that then get returned and accumulated thanks to keepPreviousData: true in react query
      let songs: SongType[] = [];

      // just use another endpoint, instead of calling the same endpoint with different tracks multiple times
      // make a batch request: https://developer.spotify.com/documentation/web-api/reference/#/operations/get-several-tracks
      if (session) {
        const recomSongsRes = await getAiRecomSongs(text, first);
        const lastTenRecomSongs = recomSongsRes.slice(
          recomSongsRes.length - DEFAULT_RESULTS_QTT
        );
        let ids = lastTenRecomSongs.reduce(
          (prevSongId, crrSong) => `${prevSongId},${crrSong.cursor}`,
          ""
        );
        ids = ids.slice(1);

        // join all track ids in one big string and pass it to api/tracks
        const spotifyTracks = await getSpotifyTracksData(
          ids,
          session.accessToken
        );
        songs = spotifyTracks.map((track: SpotifyApi.TrackObjectFull, id) => {
          const recomSong = lastTenRecomSongs[id];

          return {
            id: recomSong!.cursor,
            genres: recomSong!.node.audioAnalysisV6.result.genreTags,
            moods: recomSong!.node.audioAnalysisV6.result.moodTags,
            instruments: recomSong!.node.audioAnalysisV6.result.instrumentTags,
            musicalEra: recomSong!.node.audioAnalysisV6.result.musicalEraTag,
            duration: track.duration_ms / 1000,
            coverUrl:
              track?.album?.images[0]?.url ||
              track?.album?.images[1]?.url ||
              "/defaultSongCover.jpeg",
            previewUrl: track?.preview_url,
            title: track.name,
            artists: track.artists.map((artist) => artist.name),
          };
        });

        return songs;
      }
    }),
});
