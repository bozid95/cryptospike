import React from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TableToolbarProps<T extends string = string> {
  tabs?: TabItem<T>[];
  activeTab?: T;
  onTabChange?: (tabId: T) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;
  rightActions?: React.ReactNode;
  className?: string;
}

export function TableToolbar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  rightActions,
  className,
}: TableToolbarProps<T>) {
  return (
    <div
      className={cn(
        "px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/50",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
        {/* Consistent Segmented Tabs Pill */}
        {tabs && tabs.length > 0 && onTabChange && (
          <div className="inline-flex rounded-lg border bg-background p-0.5 text-xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "px-3 py-1 font-medium rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={cn(
                        "text-[10px] px-1 rounded font-mono",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                  {tab.badge}
                </button>
              );
            })}
          </div>
        )}

        {/* Consistent Search Bar */}
        {onSearchChange && (
          <div className="relative w-full sm:w-60">
            <SearchIcon className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchTerm || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        )}
      </div>

      {/* Right Side Info / Actions */}
      {rightActions && (
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs text-muted-foreground font-mono">
          {rightActions}
        </div>
      )}
    </div>
  );
}
