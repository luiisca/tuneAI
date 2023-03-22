import React from "react";

import Image from "next/image";
import { LOGO } from "@/utils/constants";
import { cn } from "@/utils/cn";

interface Props {
  footerText?: React.ReactNode | string;
  showLogo?: boolean;
  heading?: string;
  subtitle?: string;
  loading?: boolean;
}

export default function AuthContainer(props: React.PropsWithChildren<Props>) {
  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col bg-[#f3f4f6] sm:flex-row",
        "dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900"
      )}
    >
      <div
        className={cn(
          "flex h-1/2 w-full flex-col justify-center px-3 py-4 sm:px-6",
          "sm:h-full sm:w-1/2 lg:py-12 lg:px-8"
        )}
      >
        {props.showLogo && (
          <Image
            src={LOGO}
            alt="TuneAI Logo"
            height={78}
            width={256}
            className="mx-auto mb-auto h-auto w-1/12 min-w-[10rem] dark:invert"
          />
        )}
        <div
          className={cn(
            props.showLogo ? "text-center" : "",
            "sm:mx-auto sm:w-full"
          )}
        >
          {props.heading && (
            <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight md:text-6xl">
              {props.heading}
            </h2>
          )}
          {props.subtitle && (
            <h2 className="mx-auto mt-2 max-w-sm text-lg text-slate-700 dark:text-slate-400 sm:max-w-md md:text-xl lg:mt-4 lg:text-2xl ">
              {props.subtitle}
            </h2>
          )}
        </div>
        <div className="mt-4 mb-auto dark:mt-0 sm:mx-auto sm:w-full sm:max-w-md lg:mt-8">
          <div className="mx-2 p-4 py-0 md:px-10">{props.children}</div>
        </div>
      </div>
      <div className="h-1/2 w-full p-4 sm:h-full sm:w-1/2 sm:pl-0">
        <div className="relative h-full w-full overflow-hidden rounded-md">
          <Image
            src="/login-cover.webp"
            alt="trees"
            fill
            className="object-cover object-center"
          />
        </div>
      </div>
    </div>
  );
}
