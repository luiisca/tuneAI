import { NextRouter, useRouter } from "next/router";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from "react";
// import useMeQuery from "server/trpc/hooks/useMeQuery";
import Link from "next/link";
import { noop } from "lodash";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/core/button";
import { Icons } from "./icons";
import { Compass, Library, LucideIcon, Megaphone } from "lucide-react";
import { cn } from "@/utils/cn";

// const useRedirectToLoginIfUnauthenticated = () => {
//   const router = useRouter();
//   const { data: session, status } = useSession();
//   const loading = status === "loading";
//
//   useEffect(() => {
//     if (!loading && !session) {
//       router.replace({
//         pathname: "/auth/login",
//       });
//     }
//   }, [router, loading, session]);
//
//   return {
//     loading: loading && !session,
//     session,
//   };
// };
// const useRedirectToOnboardingIfNeeded = () => {
//   const router = useRouter();
//   const query = useMeQuery();
//   const user = query.data;
//
//   const isRedirectingToOnboarding = user && !user.completedOnboarding;
//
//   useEffect(() => {
//     if (isRedirectingToOnboarding) {
//       router.replace({
//         pathname: "/getting-started",
//       });
//     }
//   }, [router, isRedirectingToOnboarding]);
//
//   return {
//     isRedirectingToOnboarding,
//   };
// };

type NavigationItemType = {
  name: string;
  href: string;
  icon?: LucideIcon;
};

type DrawerState = [
  isOpen: boolean,
  setDrawerOpen: Dispatch<SetStateAction<boolean>>
];

type LayoutProps = {
  centered?: boolean;
  title?: string;
  heading?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  CTA?: ReactNode;
  large?: boolean;
  SettingsSidebarContainer?: ReactNode;
  MobileNavigationContainer?: ReactNode;
  SidebarContainer?: ReactNode;
  TopNavContainer?: ReactNode;
  drawerState?: DrawerState;
  HeadingLeftIcon?: ReactNode;
  backPath?: string; // renders back button to specified path
  // use when content needs to expand with flex
  flexChildrenContainer?: boolean;
  withoutMain?: boolean;
};

export default function Shell(props: LayoutProps) {
  // useRedirectToLoginIfUnauthenticated();
  // useRedirectToOnboardingIfNeeded();

  return (
    <div className="flex h-screen overflow-hidden">
      {props.SidebarContainer || <SideBar />}
      <div className="flex w-0 flex-1 flex-col overflow-hidden">
        <MainContainer {...props} />
      </div>
    </div>
  );
}

// function UserDropdown({ small }: { small?: boolean }) {
//   const query = useMeQuery();
//   const user = query.data;
//
//   const [feedbackOpen, setFeedbackOpen] = useState(false);
//   const [menuOpen, setMenuOpen] = useState(false);
//   if (!user) {
//     return null;
//   }
//   const onFeedbackItemSelect = () => {
//     setFeedbackOpen(false);
//     setMenuOpen(false);
//   };
//
//   return (
//     <Dropdown open={menuOpen} onOpenChange={() => setFeedbackOpen(false)}>
//       <DropdownMenuTrigger asChild onClick={() => setMenuOpen(true)}>
//         <button
//           className={classNames(
//             "group flex w-full cursor-pointer appearance-none items-center rounded-full p-2 text-left outline-none sm:ml-1 md:ml-0 md:rounded-md",
//             "transition-all hover:bg-gray-100",
//             "dark:bg-dark-secondary dark:shadow-darkBorder dark:hover:border-dark-500 dark:hover:bg-dark-tertiary",
//             small &&
//               "[&:not(:focus-visible)]:dark:hover:border-dark-500 [&:not(:focus-visible)]:dark:hover:bg-dark-tertiary [&:not(:focus-visible)]:dark:hover:shadow-darkBorder [&:not(:focus-visible)]:dark:border-transparent [&:not(:focus-visible)]:dark:bg-transparent [&:not(:focus-visible)]:dark:shadow-none"
//           )}
//         >
//           {/*Avatar*/}
//           <span
//             className={classNames(
//               small ? "h-8 w-8" : "mr-2 h-9 w-9",
//               "relative flex-shrink-0 rounded-full bg-gray-300 "
//             )}
//           >
//             {
//               // eslint-disable-next-line @next/next/no-img-element
//               <img
//                 className="rounded-full"
//                 src={user.avatar}
//                 alt={user.username || "Nameless User"}
//               />
//             }
//           </span>
//           {/*Text*/}
//           {!small && (
//             <span className="flex flex-grow items-center truncate">
//               <span className="flex-grow truncate text-sm">
//                 <span className="dark:text-dark-neutral block truncate font-medium text-gray-900">
//                   {user.name || "Nameless User"}
//                 </span>
//                 <span className="dark:text-dark-600 block truncate font-normal text-neutral-500">
//                   {user.username || undefined}
//                 </span>
//               </span>
//               <FiMoreVertical
//                 className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-400"
//                 aria-hidden="true"
//               />
//             </span>
//           )}
//         </button>
//       </DropdownMenuTrigger>
//       <DropdownMenuPortal>
//         <DropdownMenuContent onInteractOutside={() => setMenuOpen(false)}>
//           {feedbackOpen ? (
//             <FeedbackMenuItem
//               onFeedbackItemSelect={() => onFeedbackItemSelect()}
//             />
//           ) : (
//             <>
//               {/* <DropdownMenuItem> */}
//               {/*   <button */}
//               {/*     className={classNames( */}
//               {/*       "flex w-full items-center px-4 py-2 text-sm" */}
//               {/*     )} */}
//               {/*     onClick={() => setFeedbackOpen(true)} */}
//               {/*   > */}
//               {/*     <FiHeart */}
//               {/*       className={classNames( */}
//               {/*         "mr-2 h-4 w-4 flex-shrink-0", */}
//               {/*         "text-gray-500 group-hover:text-neutral-500", */}
//               {/*         "dark:text-dark-600 dark:group-hover:text-dark-neutral" */}
//               {/*       )} */}
//               {/*       aria-hidden="true" */}
//               {/*     /> */}
//               {/*     Feedback */}
//               {/*   </button> */}
//               {/* </DropdownMenuItem> */}
//               {/**/}
//               {/* <DropdownMenuSeparator /> */}
//
//               <DropdownMenuItem>
//                 <a
//                   onClick={() => signOut({ callbackUrl: "/auth/logout" })}
//                   className="group flex cursor-pointer items-center px-4 py-2"
//                 >
//                   <FiLogOut
//                     className={classNames(
//                       "mr-2 h-4 w-4 flex-shrink-0",
//                       "text-gray-500 group-hover:text-neutral-500",
//                       "dark:text-dark-600 dark:group-hover:text-dark-neutral"
//                     )}
//                     aria-hidden="true"
//                   />
//                   Sign out
//                 </a>
//               </DropdownMenuItem>
//             </>
//           )}
//         </DropdownMenuContent>
//       </DropdownMenuPortal>
//     </Dropdown>
//   );
// }

const navigation: NavigationItemType[] = [
  {
    name: "Discover",
    href: "/discover",
    icon: Compass,
  },
  {
    name: "Share",
    href: "/share",
    icon: Megaphone,
  },
  {
    name: "Prompts library",
    href: "/prompts",
    icon: Library,
  },
  {
    name: "Spotify library",
    href: "/spotify",
    icon: Icons.spotify,
  },
];

const isCurrent: ({
  item,
  router,
}: {
  item: NavigationItemType;
  router: NextRouter;
}) => boolean = ({ item, router }) => {
  return router.asPath.startsWith(item.href);
};

const Navigation = () => {
  return (
    <nav className="mt-2 flex-1 space-y-1 md:px-2 lg:mt-5 lg:px-0">
      {navigation.map((item) => (
        <NavigationItem key={item.name} item={item} />
      ))}
    </nav>
  );
};

const NavigationItem: React.FC<{ item: NavigationItemType }> = ({ item }) => {
  const router = useRouter();
  const current = isCurrent({ item, router });

  return (
    <Link
      href={item.href}
      aria-label={item.name}
      className={cn(
        "group flex items-center space-x-2 rounded-md py-2 px-3 text-sm font-medium lg:px-[14px]",
        "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",

        current && "bg-slate-100 dark:[&[aria-current='page']]:bg-slate-800"
      )}
      aria-current={current ? "page" : undefined}
    >
      {item.icon && (
        <item.icon
          className={cn("h-4 w-4 flex-shrink-0", current && "text-inherit")}
          aria-hidden="true"
          aria-current={current ? "page" : undefined}
        />
      )}
      <span className="hidden w-full justify-between lg:flex">
        <div className="flex">{item.name}</div>
      </span>
    </Link>
  );
};

const MobileNavigation = () => {
  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 z-30 -mx-4 flex w-full border-t border-t-gray-200 bg-gray-50 bg-opacity-40 px-1 shadow backdrop-blur-md md:hidden",
          "dark:border-t-slate-700 dark:bg-slate-900"
        )}
      >
        {navigation.map((item) => (
          <MobileNavigationItem key={item.name} item={item} />
        ))}
      </nav>
      {/* add padding to content for mobile navigation*/}
      <div className="block pt-12 md:hidden" />
    </>
  );
};

const MobileNavigationItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item } = props;
  const router = useRouter();
  const current = isCurrent({ item, router });

  return (
    <Link
      key={item.name}
      href={item.href}
      className={cn(
        "relative my-2 min-w-0 flex-1 overflow-hidden rounded-md py-2 px-1 text-center text-xs font-medium text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus:z-10 sm:text-sm",
        "[&[aria-current='page']]:text-gray-900 dark:[&[aria-current='page']]:text-slate-50"
      )}
      aria-current={current ? "page" : undefined}
    >
      {item.icon && (
        <item.icon
          className={cn(
            "mx-auto mb-1 block h-5 w-5 flex-shrink-0 text-center text-inherit [&[aria-current='page']]:text-gray-900",
            "dark:[&[aria-current='page']]:text-slate-50"
          )}
          aria-hidden="true"
          aria-current={current ? "page" : undefined}
        />
      )}
      <span className="block truncate">{item.name}</span>
    </Link>
  );
};

function SideBar() {
  return (
    <aside
      className={cn(
        "relative hidden w-14 flex-col border-r md:flex lg:w-56 lg:flex-shrink-0 lg:px-4",
        "border-r-slate-200 bg-white dark:border-r-slate-700 dark:bg-slate-900"
      )}
    >
      <div className="flex h-0 flex-1 flex-col pt-3 pb-4 lg:pt-5">
        <header className="items-center justify-between md:hidden lg:flex">
          <Link href="/discover" className="flex justify-center px-3">
            <Icons.logo />
          </Link>
          <ThemeToggle className="absolute right-4 hidden lg:flex" />
        </header>

        {/* logo icon for tablet */}
        <Link href="/discover" className="text-center md:inline lg:hidden">
          <Icons.logo small icon />
        </Link>

        <Navigation />
      </div>

      <div className="mb-2 flex flex-col items-center">
        <ThemeToggle className="mb-2 lg:hidden" />
        <span className="hidden w-full lg:inline">
          {/* <UserDropdown /> */}
          <span>User</span>
        </span>
        <span className="hidden md:inline lg:hidden">
          {/* <UserDropdown small /> */}
          <span>User</span>
        </span>
      </div>
    </aside>
  );
}

export function ShellMain(props: LayoutProps) {
  return (
    <>
      <div className="flex items-baseline sm:mt-0">
        {props.heading && (
          <header
            className={cn(
              props.large && "py-8",
              "mb-4 flex w-full items-center pt-4 md:p-0 lg:mb-10"
            )}
          >
            {props.HeadingLeftIcon && (
              <div className="mr-4">{props.HeadingLeftIcon}</div>
            )}
            <div className="mr-4 w-full sm:block">
              {props.heading && (
                <h1
                  className={cn(
                    "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl"
                  )}
                >
                  {props.heading}
                </h1>
              )}
              {props.subtitle && (
                <p className="hidden text-lg text-slate-700 dark:text-slate-400 sm:block sm:text-xl">
                  {props.subtitle}
                </p>
              )}
            </div>
            {props.CTA && (
              <div
                className={cn(
                  props.backPath ? "relative" : "fixed",
                  props.CTA && "cta",
                  "relative bottom-auto right-auto mb-4 flex-shrink-0"
                )}
              >
                {props.CTA}
              </div>
            )}
          </header>
        )}
      </div>
      {/* <div */}
      {/*   className={classNames( */}
      {/*     props.flexChildrenContainer && "flex flex-1 flex-col", */}
      {/*   )} */}
      {/* > */}
      {/* </div> */}
      {props.children}
    </>
  );
}

const SettingsSidebarContainerDefault = () => null;

function MainContainer({
  SettingsSidebarContainer: SettingsSidebarContainerProp = (
    <SettingsSidebarContainerDefault />
  ),
  MobileNavigationContainer: MobileNavigationContainerProp = (
    <MobileNavigation />
  ),
  TopNavContainer: TopNavContainerProp = <TopNav />,
  ...props
}: LayoutProps) {
  const [sideContainerOpen, setSideContainerOpen] = props.drawerState || [
    false,
    noop,
  ];

  return (
    <main className="relative z-0 flex flex-1 flex-col overflow-y-auto focus:outline-none">
      {/* show top navigation for md and smaller (tablet and phones) */}
      {TopNavContainerProp}

      <div
        className={cn(
          "absolute z-40 m-0 h-screen w-screen opacity-50",
          !sideContainerOpen && "hidden"
        )}
        onClick={() => {
          setSideContainerOpen(false);
        }}
      />
      {SettingsSidebarContainerProp}

      <div className="flex h-screen flex-col px-4 py-2 lg:py-8 lg:px-12">
        {/* add padding to top for mobile when App Bar is fixed */}
        <div className="pt-14 sm:hidden" />
        {!props.withoutMain ? (
          <ShellMain {...props}>{props.children}</ShellMain>
        ) : (
          props.children
        )}

        {/* show bottom navigation for md and smaller (tablet and phones) on pages where back button doesn't exist */}
        {!props.backPath ? MobileNavigationContainerProp : null}
      </div>
    </main>
  );
}

function TopNav() {
  return (
    <>
      <nav
        className={cn(
          "fixed z-40 flex w-full items-center justify-between border-b py-1.5 px-4 backdrop-blur-lg sm:relative sm:p-4 md:hidden",
          "border-b-slate-200 bg-white dark:border-b-slate-700 dark:bg-slate-900"
        )}
      >
        <Link href="/discover">
          <Icons.logo />
        </Link>
        <div className="flex items-center gap-2 self-center">
          <ThemeToggle className="flex-shrink-0 md:hidden" />
          {/* <UserDropdown small /> */}
        </div>
      </nav>
    </>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true));

  return (
    <Button
      className={className}
      variant="ghost"
      size="sm"
      onClick={() => {
        console.log("what's goint on ");
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
      }}
    >
      {mounted && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          {resolvedTheme === "dark" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          )}
        </svg>
      )}
    </Button>
  );
}
