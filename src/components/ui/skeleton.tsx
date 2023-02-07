import { cn } from "@/utils/cn";
import React from "react";

type SkeletonBaseProps = {
  className?: string;
};

interface SkeletonContainer {
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
  className?: string;
}

const SkeletonAvatar: React.FC<SkeletonBaseProps> = ({ className }) => {
  return (
    <div
      className={cn(
        `mt-1 mr-2 rounded-full bg-gray-200 dark:bg-slate-900`,
        className
      )}
    />
  );
};

type SkeletonProps<T> = {
  as: keyof JSX.IntrinsicElements | React.FC;
  className?: string;
  children: React.ReactNode;
  loading?: boolean;
  waitForTranslation?: boolean;
  loadingClassName?: string;
} & (T extends React.FC<infer P>
  ? P
  : T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : never);

const Skeleton = <T extends keyof JSX.IntrinsicElements | React.FC>({
  as,
  className = "",
  children,
  loading = false,
  /**
   * Classes that you need only in loading state
   */
  loadingClassName = "",
  ...rest
}: SkeletonProps<T>) => {
  const Component = as;
  return (
    <Component
      className={cn(
        loading
          ? cn(
              "font-size-0 animate-pulse rounded-md bg-gray-300 text-transparent dark:bg-slate-900",
              loadingClassName
            )
          : "",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
};

const SkeletonText: React.FC<SkeletonBaseProps & { invisible?: boolean }> = ({
  className = "",
  invisible = false,
}) => {
  return (
    <span
      className={cn(
        `font-size-0 inline-block animate-pulse rounded-md bg-gray-300 empty:before:inline-block empty:before:content-['']`,
        invisible ? "invisible" : "",
        "dark:bg-slate-900",
        className
      )}
    />
  );
};

const SkeletonButton: React.FC<SkeletonBaseProps> = ({ className }) => {
  return (
    <SkeletonContainer>
      <div
        className={cn(`rounded-md bg-gray-200 dark:bg-slate-900`, className)}
      />
    </SkeletonContainer>
  );
};

const SkeletonContainer: React.FC<SkeletonContainer> = ({
  children,
  as,
  className,
}) => {
  const Component = as || "div";
  return (
    <Component className={cn("animate-pulse", className)}>{children}</Component>
  );
};

export {
  Skeleton,
  SkeletonAvatar,
  SkeletonText,
  SkeletonButton,
  SkeletonContainer,
};
