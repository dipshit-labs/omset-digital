"use client";

import { Dialog as BaseUISheet } from "@base-ui/react/dialog";
import type { ComponentProps, ReactElement } from "react";

import { cn } from "../utils/cn";

export type SheetProps = BaseUISheet.Root.Props;

export const Sheet = ({ ...props }: SheetProps): ReactElement => (
  <BaseUISheet.Root data-slot="sheet" {...props} />
);

export type SheetTriggerProps = BaseUISheet.Trigger.Props;

export const SheetTrigger = ({ ...props }: SheetTriggerProps): ReactElement => (
  <BaseUISheet.Trigger data-slot="sheet-trigger" {...props} />
);

export type SheetCloseProps = BaseUISheet.Close.Props;

export const SheetClose = ({ ...props }: SheetCloseProps): ReactElement => (
  <BaseUISheet.Close data-slot="sheet-close" {...props} />
);

export type SheetPortalProps = BaseUISheet.Portal.Props;

export const SheetPortal = ({ ...props }: SheetPortalProps): ReactElement => (
  <BaseUISheet.Portal data-slot="sheet-portal" {...props} />
);

export type SheetOverlayProps = BaseUISheet.Backdrop.Props;

export const SheetOverlay = ({
  className,
  ...props
}: SheetOverlayProps): ReactElement => (
  <BaseUISheet.Backdrop
    data-slot="sheet-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
      className
    )}
    {...props}
  />
);

export type SheetSide = "top" | "right" | "bottom" | "left";

export interface SheetContentProps extends BaseUISheet.Popup.Props {
  side?: SheetSide;
}

export const SheetContent = ({
  children,
  className,
  side = "right",
  ...props
}: SheetContentProps): ReactElement => (
  <SheetPortal>
    <SheetOverlay />
    <BaseUISheet.Popup
      data-slot="sheet-content"
      data-side={side}
      className={cn(
        "fixed z-50 flex flex-col gap-4 transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:-translate-x-10 data-[side=left]:data-starting-style:-translate-x-10 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-10 data-[side=right]:data-starting-style:translate-x-10 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:-translate-y-10 data-[side=top]:data-starting-style:-translate-y-10 data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
    </BaseUISheet.Popup>
  </SheetPortal>
);

export type SheetHeaderProps = ComponentProps<"div">;

export const SheetHeader = ({
  className,
  ...props
}: SheetHeaderProps): ReactElement => (
  <div
    data-slot="sheet-header"
    className={cn("flex flex-col gap-0.5", className)}
    {...props}
  />
);

export type SheetFooterProps = ComponentProps<"div">;

export const SheetFooter = ({
  className,
  ...props
}: SheetFooterProps): ReactElement => (
  <div
    data-slot="sheet-footer"
    className={cn("mt-auto flex flex-col gap-2", className)}
    {...props}
  />
);

export type SheetTitleProps = BaseUISheet.Title.Props;

export const SheetTitle = ({ ...props }: SheetTitleProps): ReactElement => (
  <BaseUISheet.Title data-slot="sheet-title" {...props} />
);

export type SheetDescriptionProps = BaseUISheet.Description.Props;

export const SheetDescription = ({
  ...props
}: SheetDescriptionProps): ReactElement => (
  <BaseUISheet.Description data-slot="sheet-description" {...props} />
);
