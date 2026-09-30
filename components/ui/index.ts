// Barrel de primitivos de UI.
// Los imports por archivo (`@/components/ui/button`) siguen funcionando igual.

export { Button, buttonVariants, type ButtonProps } from "./button";
export { Input, type InputProps } from "./input";
export { Textarea, type TextareaProps } from "./textarea";
export { Label } from "./label";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
} from "./select";

export { Badge, badgeVariants, type BadgeProps } from "./badge";
export { Progress, type ProgressProps } from "./progress";
export { Switch } from "./switch";
export { Checkbox } from "./checkbox";
export { Separator } from "./separator";
export { Skeleton } from "./skeleton";

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./popover";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./dropdown-menu";

export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  toastVariants,
  type ToastProps,
  type ToastActionElement,
} from "./toast";
export { Toaster } from "./toaster";
export { useToast, toast } from "./use-toast";

export { EmptyState, type EmptyStateProps } from "./empty-state";
export { Stat, type StatProps } from "./stat";
export { SectionHeader, type SectionHeaderProps } from "./section-header";
