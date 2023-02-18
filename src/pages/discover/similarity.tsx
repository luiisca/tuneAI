import Select from "@/components/ui/core/select";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useState } from "react";

const Similar = () => {
  const [resultsPage, setResultsPage] = useState(0);
  const utils = api.useContext();

  return (
    <Shell heading="Discover" subtitle="Find similar songs with AI">
      <Select
        cacheOptions
        loadOptions={debounce((inputValue, callback) => {
          if (inputValue.trim()) {
            setResultsPage(0);

            utils.discover.getSongs.similar
              .fetch({
                trackName: inputValue,
                offset: resultsPage,
              })
              .then((songs) => {
                if (songs) {
                  callback(
                    songs.map((song) => ({
                      value: song.title,
                      label: song.title,
                    }))
                  );
                }
              });
          }
        }, 800)}
      />
    </Shell>
  );
};

export default Similar;
