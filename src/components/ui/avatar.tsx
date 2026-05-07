import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
}

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full items-center justify-center bg-primary/20 text-primary text-xs font-semibold",
          className
        )}
        {...props}
      >
        {getInitials(name)}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
