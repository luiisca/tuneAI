import Select from "@/components/ui/core/select";
import Shell from "@/components/ui/core/shell";

const Similar = () => {
  return (
    <Shell heading="Discover" subtitle="Find similar songs with AI">
      <Select
        cacheOptions
        loadOptions={(inputValue, callback) => {
          const delay = (time: number) =>
            new Promise((resolve) => setTimeout(resolve, time));
          delay(2000).then(() =>
            callback([
              { value: "what", label: "Hold on" },
              { value: "world", label: "World" },
              { value: inputValue, label: inputValue.toUpperCase() },
            ])
          );
        }}
      />
    </Shell>
  );
};

export default Similar;
