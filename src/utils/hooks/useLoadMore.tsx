import { debounce } from "lodash";
import { useRouter } from "next/router";
import { type UIEvent, useCallback, useRef } from "react";

const useLoadMore = <T extends HTMLElement>({
  loadingMore,
  update,
  isFetching,
  isFetched,
  allResultsShown,
  resPage,
}: {
  loadingMore: boolean;
  update: () => void;
  isFetching: boolean;
  isFetched: boolean;
  allResultsShown: boolean;
  resPage: number;
}) => {
  const loadMore = useCallback(
    (e: UIEvent<T>) => {
      if (!allResultsShown) {
        console.log("LOAD MORE DEBOUNCED FN : ", "isFetched", isFetched);

        if (e) {
          const el = e.target as T;
          const clientHeight = el.clientHeight;
          const scrollHeight = el.scrollHeight;
          const scrollTop = el.scrollTop;

          if (scrollTop + clientHeight >= scrollHeight) {
            console.log("LOAD MORE DEBOUNCED FN:  bottom reached");
            console.log("loading more", loadingMore);

            if (!loadingMore && !isFetching && (isFetched || resPage === 1)) {
              console.log("LOAD MORE FN INSIDE HOOK: running update fn");
              update();
            }
          }
        }
      }
    },
    [isFetching, isFetched, loadingMore, allResultsShown, resPage]
  );

  return [loadMore] as const;
};

export default useLoadMore;
