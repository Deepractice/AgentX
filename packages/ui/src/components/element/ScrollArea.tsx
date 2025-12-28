import * as React from "react";
import { cn } from "~/utils/utils";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const ScrollArea: React.ForwardRefExoticComponent<
  ScrollAreaProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, ScrollAreaProps>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <div
      className="h-full w-full rounded-[inherit] overflow-auto"
      style={
        {
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  </div>
));
ScrollArea.displayName = "ScrollArea";

export { ScrollArea };
