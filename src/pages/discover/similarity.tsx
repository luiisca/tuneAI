import { debounce } from "lodash";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { DEFAULT_RESULTS_QTT } from "@/utils/constants";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/core/select";
import { Input } from "@/components/ui/core/input";
// import { MusicPlayerContext } from "../_app";
import { ListSkeleton, TrackItem } from "./ai";
import { CyaniteEvent } from "../api/cyanite-webhook";

// const MenuListCustomComponent = <
//   Option,
//   IsMulti extends boolean = false,
//   Group extends GroupBase<Option> = GroupBase<Option>
// >({
//   setSelectKey,
//   setResultsPage,
//   setSongsOptions,
//   searchQuery,
//   ...props
// }: MenuListProps<Option, IsMulti, Group> & {
//   setSelectKey: Dispatch<SetStateAction<number>>;
//   setResultsPage: Dispatch<SetStateAction<number>>;
//   setSongsOptions: Dispatch<
//     SetStateAction<[] | { value: string; label: string }[]>
//   >;
//   searchQuery?: { offset: number; trackName: string };
// }) => {
//   const refList = useRef<null | HTMLDivElement>(null);
//   const utils = api.useContext();
//
//   return (
//     <MenuListComponent
//       {...props}
//       innerRef={refList}
//       innerProps={{
//         onScroll: async (e) => {
//           const { scrollTop, clientHeight, scrollHeight } = e.target;
//           if (Math.ceil(scrollTop + clientHeight) >= scrollHeight) {
//             console.log("reached the bottom, ready to make a request");
//             setResultsPage((prev) => prev + 1);
//             setSelectKey(Math.random());
//             const newSongs = await utils.discover.getSongs.similar.fetch({
//               trackName: searchQuery?.trackName,
//               offset: searchQuery?.offset + DEFAULT_RESULTS_QTT,
//             });
//             if (newSongs && newSongs.length > 0) {
//               const newSongsOptions = newSongs.map((song) => ({
//                 value: song.title,
//                 label: song.title,
//               }));
//               setSongsOptions([...newSongsOptions, ...props.options]);
//             }
//           }
//         },
//       }}
//     >
//       <>
//         {/* {console.log( */}
//         {/*   "children", */}
//         {/**/}
//         {/*   props.getValue() */}
//         {/* )} */}
//       </>
//       {props.children}
//     </MenuListComponent>
//   );
// };
//
// export const OptionCustomComponent = <
//   Option,
//   IsMulti extends boolean = false,
//   Group extends GroupBase<Option> = GroupBase<Option>
// >({
//   className,
//   ...props
// }: OptionProps<Option, IsMulti, Group>) => {
//   console.log("props", props);
//   return <OptionComponent {...props}>{props.children}</OptionComponent>;
// };
//
const Similar = () => {
  const [resultsOpen, setResultsOpen] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<null | string>(null);
  const [spotifyResultsPage, setSpotifyResultsPage] = useState(0);
  const [simResultsPage, setSimResultsPage] = useState(0);
  const [resultsQtt, setResultsQtt] = useState(DEFAULT_RESULTS_QTT);
  const [searchValue, setSearchValue] = useState("");
  const [loadingMore] = useState(false);

  const utils = api.useContext();
  // const {
  //   state: { songsList },
  //   dispatch,
  // } = useContext(MusicPlayerContext);
  useEffect(() => {
    const eventSource = new EventSource("/api/cyanite-webhook");

    eventSource.addEventListener("message", (event: Event) => {
      const messageEvent = event as MessageEvent<CyaniteEvent>;

      console.log("SENT EVENT", event);
      console.log("MESSAGE event", messageEvent);
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const {
    data: spotifyTracks,
    isFetching: spotifyIsFetching,
    // isFetched: spotifyIsFetched,
    // isError: spotifyIsError,
    // error: spotifyError,
  } = api.discover.getSongs.spotify.useQuery(
    {
      trackName: searchValue,
      offset: spotifyResultsPage * DEFAULT_RESULTS_QTT,
    },
    {
      enabled: !!searchValue || !!spotifyResultsPage,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: () => {
        const prevData = utils.discover.getSongs.spotify.getData({
          trackName: searchValue,
          offset:
            spotifyResultsPage * DEFAULT_RESULTS_QTT - DEFAULT_RESULTS_QTT,
        });

        utils.discover.getSongs.spotify.setData(
          {
            trackName: searchValue,
            offset: spotifyResultsPage * DEFAULT_RESULTS_QTT,
          },
          (oldData) => {
            if (prevData && oldData) {
              return [...prevData, ...oldData];
            }

            return oldData;
          }
        );
      },
    }
  );

  const {
    data: simTracks,
    // isFetching: simIsFetching,
    // isFetched: simIsFetched,
    // isError: simIsError,
    // error: simError,
  } = api.discover.getSongs.similar.useQuery(
    {
      trackId: selectedSongId as string,
      first: resultsQtt,
    },
    {
      enabled: !!selectedSongId || !!simResultsPage,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      onSuccess: () => {
        const prevData = utils.discover.getSongs.similar.getData({
          trackId: selectedSongId as string,
          first: resultsQtt - DEFAULT_RESULTS_QTT,
        });

        utils.discover.getSongs.similar.setData(
          {
            trackId: selectedSongId as string,
            first: resultsQtt,
          },
          (oldData) => {
            if (prevData && oldData) {
              return [...prevData, ...oldData];
            }

            return oldData;
          }
        );
      },
    }
  );

  return (
    <Shell heading="Discover" subtitle="Find similar songs with AI">
      <Select
        onOpenChange={setResultsOpen}
        open={resultsOpen}
        onValueChange={setSelectedSongId}
      >
        <Input
          tabIndex={1}
          className="mb-2"
          autoFocus
          placeholder="Search Spotify tracks"
          onChange={debounce((e) => {
            const { target } = e as Event & { target: HTMLInputElement };
            const text = target.value.trim();
            if (text) {
              setSearchValue(text);
              setSpotifyResultsPage(0);
              setSimResultsPage(0);
              setResultsQtt(DEFAULT_RESULTS_QTT);
              setResultsOpen(true);
            }
          }, 800)}
        />
        <SelectTrigger className="h-0 border-0 p-0 opacity-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          className="disable-focus-visible !max-h-96"
        >
          {spotifyIsFetching && !loadingMore && <ListSkeleton />}

          {!spotifyTracks || spotifyTracks.length === 0 ? (
            <span>No tracks</span>
          ) : (
            <ul className="space-y-2">
              {spotifyTracks.map((track, index) => (
                <SelectItem value={track.id} key={track.id}>
                  <TrackItem index={index} track={track} />
                </SelectItem>
              ))}
            </ul>
          )}
        </SelectContent>
      </Select>

      {/* similar songs */}
      {simTracks?.map((track, index) => (
        <TrackItem index={index} track={track} key={track.id} />
      ))}
    </Shell>
  );
};

// onInputChange={debounce((inputValue) => {
//   console.log("VALUE", inputValue);
//   const trimmedInput = inputValue.trim();
//   if (trimmedInput) {
//     setSearchValue(trimmedInput);
//     utils.discover.getSongs.similar
//       .fetch({
//         trackName: trimmedInput,
//         offset: resultsPage,
//       })
//       .then((songs) => {
//         if (songs && songs.length > 0) {
//           const newSongsOptions = songs.map((song) => ({
//             value: song.title,
//             label: song.title,
//           }));
//           if (trimmedInput === searchValue) {
//             setSongsOptions([...songsOptions, ...newSongsOptions]);
//           } else {
//             console.log("normal setSongsOptions", newSongsOptions);
//             setSongsOptions(newSongsOptions);
//           }
//           setKey(Math.random());
//           setKeepOpen(true);
//         }
//       });
//   }
// }, 800)}

export default Similar;
