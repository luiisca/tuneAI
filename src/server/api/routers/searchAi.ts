import { env } from "@/env/server.mjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../trpc";

const searchSongsQuery = `
query FreeTextSearch($text: String!) {
  freeTextSearch(
    first: 2
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
type SongType = {
  id: string;
  title: string;
  genres: string[];
  moods: string[];
  instruments: string[];
  musicalEra: string;
};

export const searchAiRouter = createTRPCRouter({
  getSongs: publicProcedure.input(z.string()).query(async ({ input: text }) => {
    let songs: SongType[] = [];
    try {
      const result = await fetch(env.API_URL, {
        method: "GET",
        body: JSON.stringify({
          query: searchSongsQuery,
          variables: {
            text,
          },
        }),
      });
      result.json().then((result: SearchSongsResult) => {
        songs = result.data.freeTextSearch.edges.map((song) => ({
          id: song.cursor,
          title: song.node.title,
          genres: song.node.audioAnalysisV6.result.genreTags,
          moods: song.node.audioAnalysisV6.result.moodTags,
          instruments: song.node.audioAnalysisV6.result.instrumentTags,
          musicalEra: song.node.audioAnalysisV6.result.musicalEraTag,
        }));
      });
    } catch (e) {
      throw new TRPCError({ message: "", code: "INTERNAL_SERVER_ERROR" });
    }

    return songs;
  }),
});
