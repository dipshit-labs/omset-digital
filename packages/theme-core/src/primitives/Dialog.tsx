"use client";

import { Dialog as BaseUIDialog } from "@base-ui/react/dialog";
import type { ComponentProps, ReactElement } from "react";

import { cn } from "../utils/cn";

export type DialogProps = BaseUIDialog.Root.Props;

export const Dialog = ({ ...props }: DialogProps): ReactElement => (
  <BaseUIDialog.Root data-slot="dialog" {...props} />
);

export type DialogTriggerProps = BaseUIDialog.Trigger.Props;

export const DialogTrigger = ({
  ...props
}: DialogTriggerProps): ReactElement => (
  <BaseUIDialog.Trigger data-slot="dialog-trigger" {...props} />
);

export type DialogPortalProps = BaseUIDialog.Portal.Props;

export const DialogPortal = ({ ...props }: DialogPortalProps): ReactElement => (
  <BaseUIDialog.Portal data-slot="dialog-portal" {...props} />
);

export type DialogCloseProps = BaseUIDialog.Close.Props;

export const DialogClose = ({ ...props }: DialogCloseProps): ReactElement => (
  <BaseUIDialog.Close data-slot="dialog-close" {...props} />
);

export type DialogOverlayProps = BaseUIDialog.Backdrop.Props;

export const DialogOverlay = ({
  className,
  ...props
}: DialogOverlayProps): ReactElement => (
  <BaseUIDialog.Backdrop
    className={cn(
      "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100",
      className
    )}
    data-slot="dialog-overlay"
    {...props}
  />
);

export type DialogContentProps = BaseUIDialog.Popup.Props;

export const DialogContent = ({
  children,
  className,
  ...props
}: DialogContentProps): ReactElement => (
  <DialogPortal>
    <DialogOverlay />
    <BaseUIDialog.Popup
      className={cn(
        "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 sm:max-w-sm",
        className
      )}
      data-slot="dialog-content"
      {...props}
    >
      {children}
    </BaseUIDialog.Popup>
  </DialogPortal>
);

export type DialogHeaderProps = ComponentProps<"div">;

export const DialogHeader = ({
  className,
  ...props
}: DialogHeaderProps): ReactElement => (
  <div
    className={cn("flex flex-col gap-2", className)}
    data-slot="dialog-header"
    {...props}
  />
);

export type DialogFooterProps = ComponentProps<"div">;

export const DialogFooter = ({
  className,
  ...props
}: DialogFooterProps): ReactElement => (
  <div
    data-slot="dialog-footer"
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);

export type DialogTitleProps = BaseUIDialog.Title.Props;

export const DialogTitle = ({ ...props }: DialogTitleProps): ReactElement => (
  <BaseUIDialog.Title data-slot="dialog-title" {...props} />
);

export type DialogDescriptionProps = BaseUIDialog.Description.Props;

export const DialogDescription = ({
  ...props
}: DialogDescriptionProps): ReactElement => (
  <BaseUIDialog.Description data-slot="dialog-description" {...props} />
);
