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
let uniqueIds: string[] = [];
let uniqueSongs: ({
  cursor: string;
  node: {
    audioAnalysisV6: {
      result: {
        genreTags: string[];
        moodTags: string[];
        instrumentTags: string[];
        musicalEraTag: string;
      };
    };
  };
} | null)[] = [];

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
  const songsResult = (await res.json()) as SearchSongsResult;

  const NEW_SONGS =
    first === DEFAULT_RESULTS_QTT ? 0 : first - DEFAULT_RESULTS_QTT;
  const songs = songsResult.data.freeTextSearch.edges.slice(NEW_SONGS);
  songs.forEach((song) => {
    if (!uniqueIds.includes(song.cursor)) {
      uniqueIds.push(song.cursor);
      uniqueSongs.push(song);
    }

    uniqueSongs.push(null);
  });

  return uniqueSongs;
};

// spotify api calls
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

const getSpotifySearchResults = async (trackName: string, offset: number) => {
  const query_params = new URLSearchParams({
    q: trackName,
    type: "track",
    limit: DEFAULT_RESULTS_QTT.toString(),
    offset: offset.toString(),
  });
  const res = await fetch(`${env.SPOTIFY_API_ENDPOINT}/search?${query_params}`);
  const data = (await res.json()) as SpotifyApi.TrackSearchResponse;

  return data.tracks;
};

// routers
export const discoverRouter = createTRPCRouter({
  getSongs: createTRPCRouter({
    ai: publicProcedure
      .input(
        z.object({
          text: z.string(),
          first: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { session } = ctx;
        const { text, first } = input;
        let songs: SongType[] = [];

        if (session) {
          const recomSongsRes = await getAiRecomSongs(text, first);
          const lastRecomSongs = recomSongsRes.slice(
            recomSongsRes.length - DEFAULT_RESULTS_QTT
          );
          const ids = lastRecomSongs.reduce((prevSongId, crrSong) => {
            if (crrSong !== null) {
              return prevSongId === ""
                ? `${crrSong.cursor}`
                : `${prevSongId},${crrSong.cursor}`;
            }

            return `${prevSongId}`;
          }, "");

          const spotifyTracks = await getSpotifyTracksData(
            ids,
            session.accessToken
          );
          songs = spotifyTracks.map((track: SpotifyApi.TrackObjectFull) => {
            const recomSong = lastRecomSongs.find(
              (song) => song?.cursor === track.id
            );

            return {
              id: recomSong!.cursor,
              genres: recomSong!.node.audioAnalysisV6.result.genreTags,
              moods: recomSong!.node.audioAnalysisV6.result.moodTags,
              instruments:
                recomSong!.node.audioAnalysisV6.result.instrumentTags,
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
    similar: publicProcedure
      .input(
        z.object({
          trackName: z.string(),
          offset: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        let songs;
        const tracks = await getSpotifySearchResults(
          input.trackName,
          input.offset
        );

        return {};
      }),
  }),
});
