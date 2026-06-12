import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage?: boolean;
}

export function Pagination({ currentPage, totalPages, onPageChange, hasNextPage }: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} {totalPages > 0 ? `of ${totalPages}` : ""}
      </span>
      <Button
        variant="outline"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={totalPages > 0 ? currentPage >= totalPages : !hasNextPage}
      >
        Next
      </Button>
    </div>
  );
}
