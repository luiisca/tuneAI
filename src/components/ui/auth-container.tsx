import React from "react";

import Image from "next/image";
import { LOGO } from "@/utils/constants";
import { cn } from "@/utils/cn";

interface Props {
  footerText?: React.ReactNode | string;
  showLogo?: boolean;
  heading?: string;
  loading?: boolean;
}

export default function AuthContainer(props: React.PropsWithChildren<Props>) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col justify-center bg-[#f3f4f6] py-12 sm:px-6 lg:px-8",
        "dark:bg-gradient-to-b dark:from-slate-800 dark:to-slate-900"
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
          "sm:mx-auto sm:w-full sm:max-w-md"
        )}
      >
        {props.heading && (
          <h2 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {props.heading}
          </h2>
        )}
      </div>
      {/* {props.loading && ( */}
      {/*   <div className="absolute z-50 flex h-screen w-full items-center bg-gray-50"> */}
      {/*     <Loader /> */}
      {/*   </div> */}
      {/* )} */}
      <div className="mt-8 mb-auto dark:mt-0 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-2 rounded-md border border-gray-200 bg-white px-4 py-10 dark:border-0 dark:bg-transparent sm:px-10">
          {props.children}
        </div>
        <div className="mt-8 text-center text-sm text-neutral-600">
          {props.footerText}
        </div>
      </div>
    </div>
  );
}
