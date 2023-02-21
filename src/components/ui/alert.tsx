import { cn } from "@/utils/cn";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { ReactNode } from "react";

export interface AlertProps {
  title?: ReactNode;
  message?: ReactNode;
  actions?: ReactNode;
  className?: string;
  severity: "success" | "warning" | "error" | "info";
}
export function Alert(props: AlertProps) {
  const { severity } = props;

  return (
    <div
      className={cn(
        "rounded-md border p-3",
        props.className,
        severity === "error" &&
          cn(
            "border-red-900/20 bg-red-50 text-red-800",
            "dark:bg-red-800 dark:text-white"
          ),
        severity === "warning" &&
          "border-yellow-700 bg-yellow-50 text-yellow-700",
        severity === "info" && "border-sky-700 bg-sky-50 text-sky-700",
        severity === "success" && "bg-gray-900 text-white"
      )}
    >
      <div className="flex">
        <div className="shrink-0">
          {severity === "error" && (
            <AlertCircle
              className={cn("h-5 w-5 text-red-400", "dark:text-white")}
              aria-hidden="true"
            />
          )}
          {severity === "warning" && (
            <AlertTriangle
              className={cn("h-5 w-5 text-yellow-400")}
              aria-hidden="true"
            />
          )}
          {severity === "info" && (
            <Info className={cn("h-5 w-5 text-sky-400")} aria-hidden="true" />
          )}
          {severity === "success" && (
            <CheckCircle
              className={cn("h-5 w-5 text-gray-400")}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="ml-3 grow">
          <h3 className="text-sm font-medium">{props.title}</h3>
          <div className="text-sm">{props.message}</div>
        </div>
        {props.actions && <div className="text-sm">{props.actions}</div>}
      </div>
    </div>
  );
}
