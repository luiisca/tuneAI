import { cn } from "@/utils/cn";
import { LucideIcon } from "lucide-react";
import React, { ReactNode } from "react";
import { Button } from "./button";

export default function EmptyScreen({
  Icon,
  headline,
  description,
  buttonText,
  buttonOnClick,
  buttonRaw,
}: {
  Icon: LucideIcon;
  headline: string;
  description: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  buttonRaw?: ReactNode; // Used incase you want to provide your own button.
}) {
  return (
    <>
      <div
        className={cn(
          "min-h-80 flex w-full flex-col items-center justify-center rounded-md border border-dashed p-7 lg:p-20",
          "dark:border-slate-800 dark:bg-slate-700"
        )}
      >
        <div
          className={cn(
            "flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-200",
            "dark:bg-slate-900"
          )}
        >
          <Icon className="inline-block h-10 w-10 stroke-[1.3px]" />
        </div>
        <div className="flex max-w-[420px] flex-col items-center">
          <h2 className="text-semibold font-cal mt-6 text-xl">{headline}</h2>
          <p className="mt-3 mb-8 text-center text-sm font-normal leading-6 text-slate-700 dark:text-slate-400">
            {description}
          </p>
          {buttonOnClick && buttonText && (
            <Button onClick={(e) => buttonOnClick(e)}>{buttonText}</Button>
          )}
          {buttonRaw}
        </div>
      </div>
    </>
  );
}
