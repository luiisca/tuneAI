import { api } from "@/utils/api";

export function useMeQuery() {
  const meQuery = api.user.me.useQuery(undefined, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return meQuery;
}

export default useMeQuery;
