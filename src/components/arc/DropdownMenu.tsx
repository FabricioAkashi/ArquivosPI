"use client";

import React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronDown, MoreVertical } from "lucide-react";

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export interface DropdownMenuProps {
  label?: string;
  trigger?: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "start" | "center" | "end";
}

export default function DropdownMenu({
  label,
  trigger,
  items,
  align = "end",
}: DropdownMenuProps) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>
        {trigger || (
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-medium text-neutral-700 shadow-2xs transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            {label && <span>{label}</span>}
            <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
          </button>
        )}
      </DropdownPrimitive.Trigger>

      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={6}
          className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 text-xs shadow-xl animate-in fade-in-0 zoom-in-95 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.separatorBefore && (
                <DropdownPrimitive.Separator className="my-1 h-px bg-neutral-100 dark:bg-neutral-800" />
              )}
              <DropdownPrimitive.Item
                disabled={item.disabled}
                onSelect={(e) => {
                  if (item.onSelect) item.onSelect();
                }}
                className={`relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium outline-none transition-colors ${
                  item.destructive
                    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white"
                } ${item.disabled ? "opacity-50 pointer-events-none" : ""}`}
              >
                {item.icon && <span className="h-3.5 w-3.5 shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </DropdownPrimitive.Item>
            </React.Fragment>
          ))}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
