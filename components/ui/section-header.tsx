import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "action"> {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function SectionHeader({
  title,
  description,
  action,
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    >
      <div className="min-w-0 flex-col">
        <h2 className="text-sm font-medium tracking-tight text-text">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-text-2">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export { SectionHeader };
