"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X, ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean);

  const toggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const remove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={cn(
          "flex min-h-[40px] w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm cursor-pointer transition-colors",
          "hover:border-gray-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20",
          disabled && "opacity-50 cursor-not-allowed",
          open && "border-indigo-500 ring-2 ring-indigo-500/20"
        )}
      >
        <div className="flex flex-wrap gap-1.5 flex-1">
          {selectedLabels.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            selectedLabels.map((label, i) => (
              <span
                key={value[i]}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200"
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => remove(value[i], e)}
                  className="rounded-full hover:bg-indigo-200 p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 shrink-0 ml-2 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              No options available
            </div>
          ) : (
            options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggle(option.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors",
                    isSelected
                      ? "bg-indigo-50 text-indigo-700"
                      : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0",
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3 text-white"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M10 3L4.5 8.5L2 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span>{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
