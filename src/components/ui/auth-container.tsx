import React, { useEffect, useState } from "react";

import Image from "next/image";
import { cn } from "@/utils/cn";
import { Icons } from "./core/icons";
import { useTheme } from "next-themes";
import { shimmer, toBase64 } from "@/utils/blur-effect";
import { SkeletonContainer } from "./skeleton";

interface Props {
  footerText?: React.ReactNode | string;
  showLogo?: boolean;
  heading?: string;
  subtitle?: string;
  loading?: boolean;
}

export default function AuthContainer(props: React.PropsWithChildren<Props>) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  useEffect(() => setMounted(true), []);

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col bg-gray-100 sm:flex-row",
        "dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900"
      )}
    >
      <div
        className={cn(
          "flex h-1/2 w-full flex-col justify-center px-3 py-4 sm:px-6",
          "sm:h-full sm:w-1/2 lg:py-12 lg:px-8"
        )}
      >
        <Icons.logo
          theme={mounted && resolvedTheme === "dark" ? "dark" : "light"}
          className={cn(
            "mx-auto mb-auto h-auto w-1/12 min-w-[8rem]",
            mounted ? "cursor-pointer opacity-100" : "cursor-default opacity-0"
          )}
        />
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
        <div className="mt-4 mb-auto sm:mx-auto sm:w-full sm:max-w-md lg:mt-8">
          <div className="mx-2 p-4 py-0 md:px-10">{props.children}</div>
        </div>
      </div>
      <div className="h-1/2 w-full p-4 sm:h-full sm:w-1/2 sm:pl-0">
        <div className="relative h-full w-full overflow-hidden rounded-md">
          <Image
            src="/login-cover.webp"
            alt="trees"
            fill
            placeholder="blur"
            blurDataURL={`data:image/svg+xml;base64,${toBase64(
              shimmer(700, 475)
            )}`}
            sizes="50vw"
            className="object-cover object-center"
          />
        </div>
      </div>
    </div>
  );
}
