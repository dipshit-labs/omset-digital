"use client";

import type { HTMLAttributes, ReactElement } from "react";

import { cn } from "../utils/cn";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";
import type {
  SheetCloseProps,
  SheetContentProps,
  SheetDescriptionProps,
  SheetFooterProps,
  SheetHeaderProps,
  SheetProps,
  SheetTitleProps,
  SheetTriggerProps,
} from "./Sheet";

export type CartSheetProps = SheetProps;

export const CartSheet = (props: CartSheetProps): ReactElement => (
  <Sheet {...props} />
);

export type CartSheetTriggerProps = SheetTriggerProps;

export const CartSheetTrigger = ({
  ...props
}: CartSheetTriggerProps): ReactElement => (
  <SheetTrigger data-slot="cart-sheet-trigger" {...props} />
);

export type CartSheetContentProps = SheetContentProps;

export const CartSheetContent = ({
  className,
  side = "right",
  ...props
}: CartSheetContentProps): ReactElement => (
  <SheetContent
    className={cn(className)}
    data-slot="cart-sheet-content"
    side={side}
    {...props}
  />
);

export type CartSheetHeaderProps = SheetHeaderProps;

export const CartSheetHeader = ({
  className,
  ...props
}: CartSheetHeaderProps): ReactElement => (
  <SheetHeader
    className={cn(className)}
    data-slot="cart-sheet-header"
    {...props}
  />
);

export type CartSheetTitleProps = SheetTitleProps;

export const CartSheetTitle = ({
  className,
  ...props
}: CartSheetTitleProps): ReactElement => (
  <SheetTitle
    className={cn(className)}
    data-slot="cart-sheet-title"
    {...props}
  />
);

export type CartSheetDescriptionProps = SheetDescriptionProps;

export const CartSheetDescription = ({
  className,
  ...props
}: CartSheetDescriptionProps): ReactElement => (
  <SheetDescription
    className={cn(className)}
    data-slot="cart-sheet-description"
    {...props}
  />
);

export type CartSheetItemsProps = HTMLAttributes<HTMLDivElement>;

export const CartSheetItems = ({
  className,
  ...props
}: CartSheetItemsProps): ReactElement => (
  <div
    className={cn("flex-1 overflow-y-auto", className)}
    data-slot="cart-sheet-items"
    {...props}
  />
);

export type CartSheetFooterProps = SheetFooterProps;

export const CartSheetFooter = ({
  className,
  ...props
}: CartSheetFooterProps): ReactElement => (
  <SheetFooter
    className={cn(className)}
    data-slot="cart-sheet-footer"
    {...props}
  />
);

export type CartSheetCloseProps = SheetCloseProps;

export const CartSheetClose = ({
  className,
  ...props
}: CartSheetCloseProps): ReactElement => (
  <SheetClose
    className={cn(className)}
    data-slot="cart-sheet-close"
    {...props}
  />
);
