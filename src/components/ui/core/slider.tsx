import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/utils/cn";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    soundHovered?: boolean;
  }
>(({ className, soundHovered, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "group relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <SliderPrimitive.Range
        className={cn(
          "absolute h-full bg-slate-900 dark:bg-slate-400 dark:group-hover:bg-accent",
          soundHovered ? "dark:bg-accent" : ""
        )}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "disable-focus-visible block h-3 w-3 rounded-full bg-slate-900 opacity-0 transition-colors disabled:pointer-events-none disabled:opacity-50 group-hover:opacity-100 dark:bg-white",
        soundHovered ? "opacity-100" : ""
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
