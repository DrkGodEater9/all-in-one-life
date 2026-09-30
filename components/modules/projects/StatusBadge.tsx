import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from "./constants";
import type { ProjectStatus } from "./types";

export function StatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
