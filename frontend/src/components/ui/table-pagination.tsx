import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = "data",
}: TablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-lg border bg-muted/50 mt-2">
      {/* Page Size & Items Count */}
      <div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground text-[11px] sm:text-xs">Rows:</span>
          <Select
            value={`${pageSize}`}
            onValueChange={(val) => {
              onPageSizeChange(Number(val));
              onPageChange(1);
            }}
          >
            <SelectTrigger className="h-7 sm:h-8 w-[68px] sm:w-[76px] text-xs bg-background font-semibold">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top" className="bg-popover">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
          <span className="text-foreground font-semibold font-mono">{safeCurrentPage}</span>/
          <span className="text-foreground font-semibold font-mono">{safeTotalPages}</span>
          <span className="ml-1 text-[10px] sm:text-[11px] text-muted-foreground/80">
            ({totalItems} {itemLabel})
          </span>
        </span>
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center justify-between sm:justify-end gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3 text-xs gap-1 bg-background hover:bg-muted"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
        >
          <ChevronLeftIcon className="size-4" />
          <span className="inline sm:hidden">Prev</span>
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex size-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            title="First Page"
          >
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <span className="sm:hidden text-xs font-mono font-semibold px-2">
            Hal. {safeCurrentPage}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="hidden sm:inline-flex size-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={safeCurrentPage >= safeTotalPages}
            title="Last Page"
          >
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 sm:px-3 text-xs gap-1 bg-background hover:bg-muted"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages}
        >
          <span className="inline sm:hidden">Next</span>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
