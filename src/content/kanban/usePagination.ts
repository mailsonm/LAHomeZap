import { useState, useMemo, useEffect } from 'react';
import type { PaginationState } from '../../types';

/**
 * Pure and testable pagination hook.
 *
 * @param items Array of items to paginate
 * @param pageSize Number of items displayed per page (default: 5)
 */
export function usePagination<T>(items: T[] = [], pageSize: number = 5): PaginationState<T> {
  const effectivePageSize = Math.max(1, pageSize);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(items.length / effectivePageSize));
  }, [items.length, effectivePageSize]);

  // If items length decreases such that currentPage is beyond totalPages, adjust it
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * effectivePageSize;
    return items.slice(startIndex, startIndex + effectivePageSize);
  }, [items, currentPage, effectivePageSize]);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    currentPage,
    totalPages,
    pageSize: effectivePageSize,
    pageItems,
    canNext,
    canPrev,
    nextPage,
    prevPage,
    goToPage,
  };
}
