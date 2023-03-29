import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type UIEvent,
} from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

import EmptyScreen from "@/components/ui/core/empty-screen";
import {
  ArrowRight,
  CircleSlashed,
  Music2,
  Bookmark,
  MoreVertical,
  Users,
} from "lucide-react";
import { SkeletonContainer, SkeletonText } from "@/components/ui/skeleton";
import { MusicPlayerContext } from "../_app";
import { cn } from "@/utils/cn";
import showToast from "@/components/ui/core/notifications";
import { DEFAULT_RESULTS_QTT, LOADED_MORE_ERROR_MSG } from "@/utils/constants";
import type { SongType } from "@/server/api/routers/discover";
import useLoadMore from "@/utils/hooks/useLoadMore";
import TabsList from "@/components/ui/tabsList";
import { useRouter } from "next/router";
import { TrackItem } from "@/components/track-item";
import { Button } from "@/components/ui/core/button";
import Link from "next/link";
import { Icons } from "@/components/ui/core/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";

export const ItemSkeleton = ({ time = true }: { time: boolean }) => {
  return (
    <div className="flex h-14 animate-pulse items-center justify-between space-x-2 py-2 dark:bg-slate-900 md:px-4">
      <div className="flex h-full w-full items-center space-x-4">
        {/* number */}
        <SkeletonText className="my-auto hidden h-1/3 w-4 md:block" />
        {/* image */}
        <SkeletonText className="!ml-0 h-10 w-10 shrink-0 md:!ml-4" />
        <div className="flex w-full flex-col justify-center space-y-1">
          {/* title */}
          <SkeletonText className="h-5 w-1/3" />
          {/* artist */}
          <SkeletonText className="h-4 w-1/4 text-sm" />
        </div>
      </div>
      {/* time */}
      {time && <SkeletonText className="my-auto h-1/3 w-[4ch]" />}
    </div>
  );
};
export const ListSkeleton = ({
  Item = ItemSkeleton,
}: {
  Item?: React.ElementType;
}) => {
  return (
    <SkeletonContainer>
      <div className="space-y-2">
        {Array(DEFAULT_RESULTS_QTT - 10) // -10 to avoid letting the user send more than 1 load more req when bottom reached
          .fill(null)
          .map((_, id) => (
            <Item key={id} />
          ))}
      </div>
    </SkeletonContainer>
  );
};

const Prompt = () => {
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [showHeading, setShowHeading] = useState(true);

  const [inputParentRef] = useAutoAnimate();
  const utils = api.useContext();
  const router = useRouter();

  const { state, dispatch } = useContext(MusicPlayerContext);

  const { prompt } = state;
  const songsList = state[state.crrRoute].songsList;

  const search = useCallback(
    (searchQuery: string) => {
      if (searchValue !== searchQuery) {
        dispatch({ type: "RESET_SEARCH" });
        router
          .push({
            pathname: router.pathname,
            query: {
              search: searchQuery,
            },
          })
          .catch(console.error);
      }
    },
    [searchValue, dispatch, router]
  );

  const {
    data: recomSongs,
    isFetching,
    isFetched,
  } = api.discover.prompt.useQuery<SongType[], SongType[]>(
    { text: searchValue.trim(), first: prompt.resQtt },
    {
      enabled: !!searchValue.trim() && !!prompt.resQtt,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: (data) => {
        // console.log("procedure DATA", data);
        // console.log("resutlsQTT", prompt.resQtt);
        const formatTracksForSongsList = (tracks: SongType[]) => {
          return tracks.map((track, index: number) => ({
            position: (songsList?.length || 0) + index,
            id: track.id,
            title: track.title,
            artists: track.artists,
            scanning: false,
            coverUrl: track.coverUrl,
            favourite: false, // @TODO: get them from spotify
            audioSrc: track.previewUrl || "",
          }));
        };
        const prevData = utils.discover.prompt.getData({
          text: searchValue,
          first: prompt.resQtt - DEFAULT_RESULTS_QTT,
        }) as SongType[];

        utils.discover.prompt.setData(
          {
            text: searchValue,
            first: prompt.resQtt,
          },
          () => {
            if (!("message" in data)) {
              if (prompt.resQtt === DEFAULT_RESULTS_QTT && data) {
                dispatch({
                  type: "SAVE_SONGS",
                  songs: [...formatTracksForSongsList(data)],
                });

                return data;
              }
              if (prevData && data) {
                dispatch({
                  type: "SAVE_SONGS",
                  songs: [
                    ...(songsList || []),
                    ...formatTracksForSongsList(data),
                  ],
                });

                return [...prevData, ...data];
              }

              if (data) {
                dispatch({
                  type: "SAVE_SONGS",
                  songs: [...formatTracksForSongsList(data)],
                });

                return data;
              }
            }
            if (data.message === LOADED_MORE_ERROR_MSG) {
              showToast(data.message as string, "success");
              dispatch({
                type: "ALL_RESULTS_SHOWN",
              });

              return prevData;
            }

            showToast(data.message as string, "error");

            return prevData;
          }
        );
      },
    }
  );

  useEffect(() => {
    if (isFetched && !isFetching && prompt.loadingMore) {
      dispatch({ type: "STOP_LOADING_MORE_SIMILAR" });

      const prevData = utils.discover.prompt.getData({
        text: searchValue,
        first: prompt.resQtt - DEFAULT_RESULTS_QTT,
      }) as SongType[];
      // console.log("prevData", prevData);
      if (prevData && prompt.forwardLoadingMore) {
        // console.log("ISFETCHED, dispatching", prevData);
        dispatch({
          type: "SELECT_SONG",
          forwardLoadingMore: false,
          songPos: prevData.length - 1,
          position: "next",
          trackReady: true,
          loadingMore: false,
        });
      }
    }
  }, [
    isFetched,
    isFetching,
    prompt.loadingMore,
    dispatch,
    prompt.forwardLoadingMore,
    prompt.resQtt,
    searchValue,
    utils.discover.prompt,
  ]);

  useEffect(() => {
    const query = router.asPath.split("?")[1];
    if (query?.includes("search")) {
      const search = new URLSearchParams(query).get("search");
      if (search) {
        setSearchValue(search);
        console.log("🚀update search!");
        setSearchEnabled(true);
      }
    }
  }, [router.asPath]);

  const [loadMore] = useLoadMore<HTMLUListElement>({
    loadingMore: prompt.loadingMore,
    update: () =>
      dispatch({
        type: "SHOW_MORE_SIMILAR",
      }),
    isFetching,
    isFetched,
    allResultsShown: prompt.allResultsShown,
    resPage: prompt.resPage,
  });

  return (
    <Shell
      heading="Discover"
      headingClassname={cn(showHeading ? "h-auto" : "h-0 m-0 -z-10")}
      subtitle="Discover music that matches your mood with AI"
    >
      <TabsList
        list={[
          { href: "/discover/prompt", name: "Prompt" },
          { href: "/discover/similar", name: "Similar" },
        ]}
      />

      <div className="flex space-x-2" ref={inputParentRef}>
        <div className="relative w-full">
          <Input
            defaultValue={searchValue}
            placeholder="I want to listen to something relaxing before bed"
            onKeyDown={(e) => {
              const { target } = e as unknown as Event & {
                target: HTMLInputElement;
              };
              if (target.value.trim() && e.code === "Enter") {
                search(target.value.trim());
              }
            }}
            onChange={() => setSearchEnabled(!!searchRef.current?.value.trim())}
            className="mb-2.5"
            ref={searchRef}
          />
          <Button
            size="sm"
            variant="subtle"
            disabled={!searchEnabled}
            onClick={() => {
              searchRef.current?.value &&
                search(searchRef.current.value.trim());
            }}
            className={cn("absolute right-1 top-1 h-8 w-8 transition-all")}
          >
            <ArrowRight />
          </Button>
        </div>
        {recomSongs && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex h-10 items-center p-3",
                "rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-800 "
              )}
            >
              <MoreVertical className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mr-3">
              <DropdownMenuItem
                className="disable-focus-visible flex cursor-pointer items-center space-x-3"
                onClick={() => showToast("Coming Soon!", "warning")}
              >
                <Users className="h-5 w-5 shrink-0" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="disable-focus-visible flex cursor-pointer items-center space-x-3"
                onClick={() => showToast("Coming Soon!", "warning")}
              >
                <Bookmark className="h-5 w-5 shrink-0" />
                <span>Bookmark</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="disable-focus-visible cursor-pointer"
                onClick={() => showToast("Coming Soon!", "warning")}
              >
                <Link
                  href={router.asPath}
                  className="flex items-center space-x-3"
                >
                  <Icons.spotify className="h-5 w-5 shrink-0" />
                  <span>Library</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {isFetching && !prompt.loadingMore && (
        <ListSkeleton Item={ItemSkeleton} />
      )}
      {!recomSongs && !isFetching && (
        <EmptyScreen
          Icon={() => <Music2 />}
          headline="Ready to discover new music?"
          description="Describe your mood and find your jam with AI-powered recommendations."
        />
      )}

      {recomSongs && !("message" in recomSongs) && recomSongs.length !== 0 && (
        <div className="h-[calc(100%-10.5rem)] sm:h-[calc(100%-12.5rem)] md:h-[calc(100%-7.5rem)] lg:h-[calc(100%-4.5rem)]">
          {(!isFetching || (isFetching && prompt.loadingMore)) && (
            <ul
              className={cn(
                "-mr-4 h-full space-y-2 overflow-y-auto pr-4 pb-3 lg:-mr-12 lg:pr-12",
                // custom scrollbar
                "scrollbar-track-w-[80px] rounded-md scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-md",
                "dark:scrollbar-thumb-accent dark:hover:scrollbar-thumb-accentBright"
              )}
              onScroll={(e) => {
                debounce((e: UIEvent<HTMLUListElement>) => {
                  loadMore(e);
                }, 1000)(e);

                const target = e.target as HTMLUListElement;
                setShowHeading(
                  Math.floor(target.scrollTop) >= 0 &&
                    Math.floor(target.scrollTop) <= 10
                );
              }}
            >
              {recomSongs.map((song, index) => (
                <TrackItem track={song} index={index} key={song.id} />
              ))}
              {isFetching && prompt.loadingMore && (
                <ListSkeleton Item={ItemSkeleton} />
              )}
            </ul>
          )}
        </div>
      )}
      {recomSongs && recomSongs.length === 0 && (
        <EmptyScreen
          Icon={() => <CircleSlashed />}
          headline="No results"
          description="Could not find any result for this query. Please try again."
        />
      )}
    </Shell>
  );
};

export default Prompt;
