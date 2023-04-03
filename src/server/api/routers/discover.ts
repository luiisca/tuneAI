import { env } from "@/env/server.mjs";
import { DEFAULT_RESULTS_QTT, NOT_ANALYZED_ERR_CODE } from "@/utils/constants";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";
import { getAccessToken } from "../utils";

const searchSimilarTracksQueryDocument = `
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

type SearchSimilarSongsResult =
  | {
      errors: Record<string, string> &
        {
          message: string;
          extensions: { code: string | "ERR_INVALID_CURSOR" };
        }[];
    }
  | {
      data: {
        spotifyTrack:
          | {
              message: string;
            }
          | {
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
    };

interface enqueuedSpotifyTrack {
  data: {
    spotifyTrackEnqueue:
      | {
          enqueuedSpotifyTrack: {
            id: string;
          };
        }
      | {
          message: string;
        };
  };
}

export type SongType = {
  id: string;
  spotifyUrl: string;
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

const getIdsString = (songs: (SongResult | null)[]) => {
  const ids = songs.reduce((prevSongId, crrSong) => {
    return crrSong ? `${prevSongId},${crrSong.cursor}` : `${prevSongId}`;
  }, "");
  return ids.slice(1);
};

// cianity api calls
let uniqueSimIds: string[] = [];
let uniqueSimSongs: (SongResult | null)[] = [];

const getAiSimilarSongs = async (trackId: string, first: number) => {
  const res = await fetch(env.API_URL, {
    method: "POST",
    body: JSON.stringify({
      query: searchSimilarTracksQueryDocument,
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
  const queryRes = (await res.json()) as SearchSimilarSongsResult;
  console.log("similar cyanite res", queryRes);

  // CYANITE ERROR
  if ("errors" in queryRes) {
    console.log(
      "INSIDE getAiSimilarSongs: cyanite similar tracks errors",
      queryRes
    );
    const error = queryRes.errors[0];
    if (error) {
      if (error.extensions.code === "ERR_INVALID_CURSOR") {
        return {
          code: "NOT_FOUND",
          message: "All results shown",
        };
      }
      return { code: "CONFLICT", message: error.message };
    }
  }

  const NEW_SONGS_START_INDEX =
    first === DEFAULT_RESULTS_QTT ? 0 : first - DEFAULT_RESULTS_QTT;

  if (first === DEFAULT_RESULTS_QTT) {
    uniqueSimIds = [];
    uniqueSimSongs = [];
  }

  if ("data" in queryRes) {
    console.log("INSIDE getAiSimilarSongs: cyanite data", queryRes);
    const spotifyTrackRes = queryRes.data.spotifyTrack;
    // CYANITE ERROR
    if ("message" in spotifyTrackRes) {
      console.log(
        "INSIDE getAiSimilarSongs: cyanite spotifyTracsRes errors",
        spotifyTrackRes
      );

      return {
        code: "BAD_REQUEST",
        message: spotifyTrackRes.message,
      };
    }

    const similarTracksRes = spotifyTrackRes.similarTracks;
    console.log(
      "INSIDE getAiSimilarSongs: cyanite similarTracksRes",
      similarTracksRes
    );
    // CYANITE ERROR
    if ("message" in similarTracksRes) {
      console.log(
        "INSIDE getAiSimilarSongs: cyanite similarTracksRes errors",
        similarTracksRes
      );

      return {
        code: similarTracksRes.code,
        message: similarTracksRes.message,
      };
    }

    const songs = similarTracksRes.edges.slice(NEW_SONGS_START_INDEX);
    console.log(
      "INSIDE getAiSimilarSongs: songs (similarTracksRes.edges)",
      songs
    );
    songs.forEach((song) => {
      if (!uniqueSimIds.includes(song.cursor)) {
        uniqueSimIds.push(song.cursor);
        uniqueSimSongs.push(song);

        return;
      }

      uniqueSimSongs.push(null);
    });
    // console.log("SIMILAR SONGS", songs);
    // console.log("UNIQUE songs", uniqueSimSongs);

    console.log(
      "INSIDE getAiSimilarSongs: slice",
      "uniqeuSimSongs",
      uniqueSimSongs
    );
    return uniqueSimSongs.slice(NEW_SONGS_START_INDEX);
  }

  console.log(
    "INSIDE getAiSimilarSongs: no data no error",
    "uniqeuSimSongs",
    uniqueSimSongs
  );
  return uniqueSimSongs.slice(NEW_SONGS_START_INDEX);
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

  const enqueuedSpotifyTrackResult =
    enqueuedSpotifyTrack.data.spotifyTrackEnqueue;
  console.log("enqueed", enqueuedSpotifyTrackResult);
  if ("message" in enqueuedSpotifyTrackResult) {
    return {
      code: "INTERNAL_SERVER_ERROR",
      message: enqueuedSpotifyTrackResult.message,
    };
  }

  return enqueuedSpotifyTrackResult.enqueuedSpotifyTrack.id;
};

const getSpotifyTracksData = async (tracksId: string, refreshToken: string) => {
  const accessToken = await getAccessToken(refreshToken);
  const res = await fetch(
    `${env.SPOTIFY_API_ENDPOINT}/tracks?ids=${tracksId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken || ""}`,
        "Content-Type": "application/json",
      },
    }
  );
  const data = (await res.json()) as
    | SpotifyApi.MultipleTracksResponse
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

export const discoverRouter = createTRPCRouter({
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

      const startingTime = Date.now() / 1000;
      console.log("STARTING TIME", startingTime);

      const recursiveGetAiSimilarSongs = async (): Promise<
        (SongResult | null)[] | { message: string }
      > => {
        console.log("🔁 RUNNIG RECURSIVE FN");
        const now = Date.now() / 1000;
        const lastSimSongs = await getAiSimilarSongs(trackId, first);
        console.log("LASTSIMSONGS", lastSimSongs);
        const timeout = now - startingTime >= 30;
        console.log("NOW TIME", now, startingTime, now - startingTime);

        if (timeout) {
          console.log("🕛 TIMEOUT!!!", timeout);
          return [];
        }

        if (
          "code" in lastSimSongs &&
          lastSimSongs.code === NOT_ANALYZED_ERR_CODE
        ) {
          console.log("ERROR, RETYRING", lastSimSongs);
          const enqueRes = await enqueueSpotifyTrackAnalysis(trackId);
          if (typeof enqueRes !== "string" && "message" in enqueRes) {
            return enqueRes;
          }

          return recursiveGetAiSimilarSongs();
        }

        return lastSimSongs;
      };

      if (session) {
        const lastSimSongs = await recursiveGetAiSimilarSongs();

        if (lastSimSongs) {
          // CYANITE ERROR
          if ("message" in lastSimSongs) {
            return lastSimSongs;
          }
          const ids = getIdsString(lastSimSongs);

          const spotifyTracks = await getSpotifyTracksData(
            ids,
            session.accessToken
          );
          // SPOTIFY ERROR
          if ("message" in spotifyTracks) {
            return spotifyTracks;
          }

          songs = spotifyTracks.map((track: SpotifyApi.TrackObjectFull) => {
            const simSong = lastSimSongs.find(
              (song) => song?.cursor === track.id
            ) as SongResult;

            return {
              id: simSong.cursor,
              spotifyUrl: track?.external_urls.spotify,
              genres: simSong.node.audioAnalysisV6.result.genreTags,
              moods: simSong.node.audioAnalysisV6.result.moodTags,
              instruments: simSong.node.audioAnalysisV6.result.instrumentTags,
              musicalEra: simSong.node.audioAnalysisV6.result.musicalEraTag,
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
      }

      return songs;
    }),
});
