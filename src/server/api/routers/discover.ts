import { env } from "@/env/server.mjs";
import { DEFAULT_RESULTS_QTT } from "@/utils/constants";
import { TRPCError } from "@trpc/server";
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
const searchSimilarSongsQueryDocument = `
query SimilarTracksQuery($trackId: ID!, $first: Int!) {
  spotifyTrack(id: $trackId) {
    ... on Error {
      message
    }
    ... on Track {
      id
      title
      similarTracks(first: $first, target: {spotify: {}}) {
        ... on SimilarTracksError {
          code
          message
        }
        ... on SimilarTracksConnection {
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
  }
}
`;
const spotifyTrackAnalysisEnqueueQueryDocument = `
mutation SpotifyTrackEnqueueMutation($input: SpotifyTrackEnqueueInput!) {
  spotifyTrackEnqueue(input: $input) {
    ... on SpotifyTrackEnqueueSuccess {
      enqueuedSpotifyTrack {
        id
      }
    }
    ... on Error {
      message
    }
  }
}`;

type SongResult = {
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
};
interface SearchSongsResult {
  data: {
    freeTextSearch: {
      edges: SongResult[];
    };
  };
}

interface SearchSimilarSongsResult {
  data: {
    spotifyTrack: {
      id: string;
      title: string;
      similarTracks:
        | {
            edges: SongResult[];
          }
        | {
            code: string;
            message: string;
          };
    };
  };
}

interface enqueuedSpotifyTrack {
  data: {
    spotifyTrackEnqueue: {
      enqueuedSpotifyTrack: {
        id: string;
      };
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

const getIdsString = (songs: SongResult[]) => {
  const ids = songs.reduce((prevSongId, crrSong) => {
    if (crrSong !== null) {
      return prevSongId === ""
        ? `${crrSong.cursor}`
        : `${prevSongId},${crrSong.cursor}`;
    }

    return `${prevSongId}`;
  }, "");
  return ids;
};

// cianity api calls
const uniqueRecomIds: string[] = [];
const uniqueRecomSongs: (SongResult | null)[] = [];

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

  const NEW_SONGS_START_INDEX =
    first === DEFAULT_RESULTS_QTT ? 0 : first - DEFAULT_RESULTS_QTT;
  const songs = songsResult.data.freeTextSearch.edges.slice(
    NEW_SONGS_START_INDEX
  );
  songs.forEach((song) => {
    if (!uniqueRecomIds.includes(song.cursor)) {
      uniqueRecomIds.push(song.cursor);
      uniqueRecomSongs.push(song);
    }

    uniqueRecomSongs.push(null);
  });

  return uniqueRecomSongs.slice(NEW_SONGS_START_INDEX);
};

const uniqueSimIds: string[] = [];
const uniqueSimSongs: ({
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

const getAiSimilarSongs = async (trackId: string, first: number) => {
  const res = await fetch(env.API_URL, {
    method: "POST",
    body: JSON.stringify({
      query: searchSimilarSongsQueryDocument,
      variables: {
        trackId,
        first,
      },
    }),
    headers: {
      Authorization: `Bearer ${env.ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const songsResponse = (await res.json()) as SearchSimilarSongsResult;

  const NEW_SONGS_START_INDEX =
    first === DEFAULT_RESULTS_QTT ? 0 : first - DEFAULT_RESULTS_QTT;
  const similarTracksResult = songsResponse.data.spotifyTrack.similarTracks;
  if ("edges" in similarTracksResult) {
    const songs = similarTracksResult.edges.slice(NEW_SONGS_START_INDEX);
    songs.forEach((song) => {
      if (!uniqueSimIds.includes(song.cursor)) {
        uniqueSimIds.push(song.cursor);
        uniqueSimSongs.push(song);
      }

      uniqueSimSongs.push(null);
    });
    console.log("SIMILAR SONGS", songs);
    console.log("UNIQUE songs", uniqueSimSongs);

    return uniqueSimSongs.slice(NEW_SONGS_START_INDEX);
  }

  return similarTracksResult;
};

const enqueueSpotifyTrackAnalysis = async (trackID: string) => {
  const res = await fetch(env.API_URL, {
    method: "POST",
    body: JSON.stringify({
      query: spotifyTrackAnalysisEnqueueQueryDocument,
      variables: {
        input: {
          spotifyTrackId: trackID,
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${env.ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const enqueuedSpotifyTrack = (await res.json()) as enqueuedSpotifyTrack;

  return enqueuedSpotifyTrack.data.spotifyTrackEnqueue.enqueuedSpotifyTrack.id;
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
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
};

const getSpotifyTracksData = async (tracksId: string, refreshToken: string) => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(
    `${env.SPOTIFY_API_ENDPOINT}/tracks?ids=${tracksId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken!}`,
        "Content-Type": "application/json",
      },
    }
  );
  console.log("res spotify", res.headers);
  const data = (await res.json()) as SpotifyApi.MultipleTracksResponse;
  console.log("spotify data", data);

  return data.tracks;
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
          const lastRecomSongs = await getAiRecomSongs(text, first);
          const ids = getIdsString(lastRecomSongs as SongResult[]);

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
    spotify: publicProcedure
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

          return tracks.items.map((track) => {
            return {
              id: track.id,
              duration: track.duration_ms / 1000,
              coverUrl:
                track.album.images[0]?.url ||
                track.album.images[1]?.url ||
                "/defaultSongCover.jpeg",
              previewUrl: track.preview_url,
              title: track.name,
              artists: track.artists.map((artist) => artist.name),
            };
          });
        }
      }),
    similar: publicProcedure
      .input(
        z.object({
          trackId: z.string(),
          first: z.number(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { session } = ctx;
        const { trackId, first } = input;
        let songs: SongType[] = [];

        if (session) {
          const lastSimSongs = await getAiSimilarSongs(trackId, first);
          if ("code" in lastSimSongs || "message" in lastSimSongs) {
            // song not analyzed yet
            await enqueueSpotifyTrackAnalysis(trackId);

            throw new TRPCError({
              code: "CONFLICT",
              message: "Analyzing track...",
            });
          }
          const ids = getIdsString(lastSimSongs as SongResult[]);

          const spotifyTracks = await getSpotifyTracksData(
            ids,
            session.accessToken
          );
          songs = spotifyTracks.map((track: SpotifyApi.TrackObjectFull) => {
            const simSong = lastSimSongs.find(
              (song) => song?.cursor === track.id
            );

            return {
              id: simSong!.cursor,
              genres: simSong!.node.audioAnalysisV6.result.genreTags,
              moods: simSong!.node.audioAnalysisV6.result.moodTags,
              instruments: simSong!.node.audioAnalysisV6.result.instrumentTags,
              musicalEra: simSong!.node.audioAnalysisV6.result.musicalEraTag,
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
        }

        return songs;
      }),
  }),
});
