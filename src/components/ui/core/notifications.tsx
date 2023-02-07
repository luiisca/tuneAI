import { cn } from "@/utils/cn";
import { Check, Info } from "lucide-react";
import toast from "react-hot-toast";

export default function showToast(
  message: string,
  variant: "success" | "warning" | "error"
) {
  switch (variant) {
    case "success":
      toast.custom(
        (t) => (
          <div
            className={cn(
              "mb-2 flex h-9 animate-accordion-up items-center space-x-2 rounded-md bg-slate-900 p-3 text-sm font-semibold text-white shadow-md",
              "dark:bg-accent",
              t.visible && "animate-accordion-up"
            )}
          >
            <Check className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
    case "error":
      toast.custom(
        (t) => (
          <div
            className={cn(
              "mb-2 flex h-9 animate-accordion-up items-center space-x-2 rounded-md bg-red-100 p-3 text-sm font-semibold text-red-900 shadow-md",
              "dark:bg-red-900 dark:text-red-100",
              t.visible && "animate-accordion-up"
            )}
          >
            <Info className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
    case "warning":
      toast.custom(
        (t) => (
          <div
            className={cn(
              "mb-2 flex h-9 animate-accordion-up items-center space-x-2 rounded-md bg-slate-900 p-3 text-sm font-semibold text-white shadow-md",
              t.visible && "animate-accordion-up"
            )}
          >
            <Info className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
    default:
      toast.custom(
        (t) => (
          <div
            className={cn(
              "mb-2 flex h-9 animate-accordion-up items-center space-x-2 rounded-md bg-slate-900 p-3 text-sm font-semibold text-white shadow-md",
              t.visible && "animate-accordion-up"
            )}
          >
            <Check className="h-4 w-4" />
            <p>{message}</p>
          </div>
        ),
        { duration: 6000 }
      );
      break;
  }
}
