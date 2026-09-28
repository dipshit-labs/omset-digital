import { Accordion as BaseUIAccordion } from "@base-ui/react/accordion";
import type { ReactElement } from "react";

import { cn } from "../utils/cn";

export type AccordionProps = BaseUIAccordion.Root.Props;

export const Accordion = ({
  className,
  ...props
}: AccordionProps): ReactElement => (
  <BaseUIAccordion.Root
    data-slot="accordion"
    className={cn("flex w-full flex-col", className)}
    {...props}
  />
);

export type AccordionItemProps = BaseUIAccordion.Item.Props;

export const AccordionItem = ({
  ...props
}: AccordionItemProps): ReactElement => (
  <BaseUIAccordion.Item data-slot="accordion-item" {...props} />
);

export type AccordionTriggerProps = BaseUIAccordion.Trigger.Props;

export const AccordionTrigger = ({
  children,
  className,
  ...props
}: AccordionTriggerProps): ReactElement => (
  <BaseUIAccordion.Header className="flex">
    <BaseUIAccordion.Trigger
      className={cn("flex flex-1 items-center justify-between", className)}
      data-slot="accordion-trigger"
      {...props}
    >
      {children}
    </BaseUIAccordion.Trigger>
  </BaseUIAccordion.Header>
);

export type AccordionContentProps = BaseUIAccordion.Panel.Props;

export const AccordionContent = ({
  children,
  className,
  ...props
}: AccordionContentProps): ReactElement => (
  <BaseUIAccordion.Panel
    className={cn(
      "data-open:animate-accordion-down data-closed:animate-accordion-up overflow-hidden",
      className
    )}
    data-slot="accordion-content"
    {...props}
  >
    {children}
  </BaseUIAccordion.Panel>
);
