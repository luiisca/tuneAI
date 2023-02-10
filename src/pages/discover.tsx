import { Button } from "@/components/ui/core/button";
import { Input } from "@/components/ui/core/input";
import Shell from "@/components/ui/core/shell";
import { api } from "@/utils/api";
import { debounce } from "lodash";
import { useState } from "react";

const Discover = () => {
  const [searchValue, setSearchValue] = useState("");

  return (
    <Shell heading="Discover" subtitle="Find new songs with AI">
      <Input
        placeholder="I dont know what to listen. What do you recommend"
        onChange={debounce((e) => {
          if (e.target.value.trim()) {
            console.log("hey let's go");
            setSearchValue(e.target.value);
          }
        }, 800)}
      />
    </Shell>
  );
};

export default Discover;
