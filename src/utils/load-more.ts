import type { UIEvent } from "react";

export const loadMore = <T extends HTMLElement>({
  e,
  update,
}: {
  e: UIEvent<T>;
  update: () => void;
}) => {
  if (e) {
    const el = e.target as T;

    if (
      Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight ||
      Math.ceil(el.scrollTop + el.clientHeight + 10) >= el.scrollHeight
    ) {
      update();
    }
  }
};
