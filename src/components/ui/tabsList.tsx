import { cn } from "@/utils/cn";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export const TabsList = ({
  list,
}: {
  list: {
    href: string;
    name: string;
  }[];
}) => {
  const router = useRouter();

  const [selectedId, setSelectedId] = useState<null | number>(null);
  useEffect(() => {
    setSelectedId(list.findIndex((item) => router.pathname === item.href));
  }, [router.pathname]);

  return (
    <div className="mb-2.5 inline-flex w-min items-center justify-center rounded-md bg-slate-100 p-1 dark:bg-slate-800">
      {list.map((item, crrId) => (
        <Tab
          {...item}
          slideFrom={
            // @TODO: extend for more than 2 tabs
            crrId === 0 ? "right" : "left"
          }
          selected={crrId === selectedId}
        />
      ))}
    </div>
  );
};

export const Tab = ({
  href,
  name,
  slideFrom,
  selected,
}: {
  href: string;
  name: string;
  slideFrom: "right" | "left";
  selected: boolean;
}) => {
  return (
    <Link href={href}>
      <button
        className={cn(
          "relative inline-flex min-w-[100px] items-center justify-center px-3 py-1.5  transition-all disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-full rounded-[0.185rem] ",
            "animate-in dark:text-slate-200",
            slideFrom === "right"
              ? "slide-in-from-right"
              : "slide-in-from-left",
            selected &&
              "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
          )}
        />
        <span className="z-10 text-sm font-medium text-slate-700  dark:text-slate-200">
          {name}
        </span>
      </button>
    </Link>
  );
};

export default TabsList;
