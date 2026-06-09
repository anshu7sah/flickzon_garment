"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: "destructive" | "default";
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  variant = "destructive",
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative z-50 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "rounded-full p-2",
                variant === "destructive"
                  ? "bg-red-100"
                  : "bg-indigo-100"
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-5 w-5",
                  variant === "destructive"
                    ? "text-red-600"
                    : "text-indigo-600"
                )}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ConfirmDialog };
