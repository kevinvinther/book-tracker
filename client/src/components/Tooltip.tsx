import { cloneElement } from "react";
import type { ReactElement, HTMLAttributes } from "react";

interface TooltipProps {
  content: string;
  children: ReactElement<HTMLAttributes<HTMLElement>>;
}

export function Tooltip({ content, children }: TooltipProps) {
  return cloneElement(children, { title: content } as HTMLAttributes<HTMLElement>);
}