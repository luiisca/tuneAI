import { debounce } from "lodash";
import { type UIEvent, useCallback, useRef } from "react";

const useLoadMore = <T extends HTMLElement>({
  loadingMore,
  update,
  isFetching,
  isFetched,
}: {
  loadingMore: boolean;
  update: () => void;
  isFetching: boolean;
  isFetched: boolean;
}) => {
  let interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMore = useCallback(
    debounce((e: UIEvent<T>) => {
      console.log("running load more fn");
      interval.current && clearInterval(interval.current);

      if (e) {
        const el = e.target as T;
        const clientHeight = el.clientHeight;
        const scrollHeight = el.scrollHeight;
        const scrollTop = el.scrollTop;

        if (scrollTop + clientHeight >= scrollHeight) {
          console.log("bottom reached");
          interval.current = setInterval(() => {
            console.log("running interval", "isfetched", isFetched);
            if (isFetched) {
              update();
              interval.current && clearInterval(interval.current);
            }
          }, 400);

          if (!loadingMore && !isFetching) {
            console.log("updating");
            update();
            clearInterval(interval.current);
          }
        }
      }
    }, 400),
    [isFetching, loadingMore]
  );

  return [loadMore] as const;
};

export default useLoadMore;
