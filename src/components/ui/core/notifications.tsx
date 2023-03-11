import { cn } from "@/utils/cn";
import { Check, Info } from "lucide-react";
import toast from "react-hot-toast";

type IToast = {
  message: string;
  toastVisible: boolean;
};

const SuccessToast = ({ message, toastVisible }: IToast) => (
  <div
    className={cn(
      "mb-2 flex h-9 items-center space-x-2 rounded-md bg-slate-900 p-3 text-sm font-semibold text-white shadow-md",
      "dark:bg-accent",
      toastVisible ? "animate-fade-in-down" : "animate-fade-in-up opacity-0"
    )}
  >
    <Check className="h-4 w-4" />
    <p>{message}</p>
  </div>
);
const ErrorToast = ({ message, toastVisible }: IToast) => (
  <div
    className={cn(
      "mb-2 flex h-9 items-center space-x-2 rounded-md bg-red-100 p-3 text-sm font-semibold text-red-900 shadow-md",
      "dark:bg-red-900 dark:text-red-100",
      toastVisible ? "animate-fade-in-down" : "animate-fade-in-up opacity-0"
    )}
  >
    <Info className="h-4 w-4" />
    <p>{message}</p>
  </div>
);

const WarningToast = ({ message, toastVisible }: IToast) => (
  <div
    className={cn(
      "mb-2 flex h-9 items-center space-x-2 rounded-md bg-slate-900 p-3 text-sm font-semibold text-white shadow-md",
      toastVisible ? "animate-fade-in-down" : "animate-fade-in-up opacity-0"
    )}
  >
    <Info className="h-4 w-4" />
    <p>{message}</p>
  </div>
);
const DefaultToast = ({ message, toastVisible }: IToast) => (
  <div
    className={cn(
      "mb-2 flex h-9 items-center space-x-2 rounded-md bg-slate-900 p-3 text-sm font-semibold text-white shadow-md",
      toastVisible ? "animate-fade-in-down" : "animate-fade-in-up opacity-0"
    )}
  >
    <Check className="h-4 w-4" />
    <p>{message}</p>
  </div>
);

const TOAST_VISIBLE_DURATION = 6000;

export default function showToast(
  message: string,
  variant: "success" | "warning" | "error",
  duration = TOAST_VISIBLE_DURATION
) {
  switch (variant) {
    case "success":
      toast.custom(
        (t) => <SuccessToast message={message} toastVisible={t.visible} />,
        { duration }
      );
      break;
    case "error":
      toast.custom(
        (t) => <ErrorToast message={message} toastVisible={t.visible} />,
        { duration }
      );
      break;
    case "warning":
      toast.custom(
        (t) => <WarningToast message={message} toastVisible={t.visible} />,
        { duration }
      );
      break;
    default:
      toast.custom(
        (t) => <DefaultToast message={message} toastVisible={t.visible} />,
        { duration }
      );
      break;
  }
}
