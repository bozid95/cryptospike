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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3.5 rounded-lg border bg-muted/50 mt-2">
      {/* Page Size Selector */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Baris per halaman:</span>
        <Select
          value={`${pageSize}`}
          onValueChange={(val) => {
            onPageSizeChange(Number(val));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="h-8 w-[76px] text-xs bg-background font-semibold">
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

      {/* Page Navigation & Item Count */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground font-medium">
          Halaman{" "}
          <span className="text-foreground font-semibold font-mono">
            {safeCurrentPage}
          </span>{" "}
          dari{" "}
          <span className="text-foreground font-semibold font-mono">
            {safeTotalPages}
          </span>
          <span className="ml-1 text-[11px] text-muted-foreground/80">
            (Total {totalItems} {itemLabel})
          </span>
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1}
            title="Halaman Pertama"
          >
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            title="Halaman Sebelumnya"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages}
            title="Halaman Berikutnya"
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8 bg-background hover:bg-muted"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={safeCurrentPage >= safeTotalPages}
            title="Halaman Terakhir"
          >
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
