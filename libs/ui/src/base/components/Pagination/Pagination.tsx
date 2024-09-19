import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@tamagui/lucide-icons';
import { Button, XStack } from 'tamagui';

export type PaginationProps = {
  onChangePage: (page: number) => void;
  currentPage: number;
  itemPerPage: number;
  totalItem: number;
};

export const Pagination = ({
  currentPage,
  itemPerPage,
  onChangePage,
  totalItem,
}: PaginationProps) => {
  const totalPage = Math.ceil(totalItem / itemPerPage);
  const isPrevDisabled = currentPage === 1;
  const isNextDisabled = currentPage === totalPage;

  const paginations = Array.from(Array(totalPage)).map((_, index) => index + 1);

  const numItemBeforeAfter = 2;
  const currentIndex = currentPage - 1;

  const startIndex = currentIndex - numItemBeforeAfter;
  const endIndex = currentIndex + numItemBeforeAfter;

  const shownPaginations = paginations.slice(
    startIndex >= 0 ? startIndex : 0,
    endIndex + 1
  );

  return totalPage === 1 ? null : (
    <XStack gap="$3">
      {currentPage !== 1 && (
        <Button size="$2" icon={ChevronsLeft} onPress={() => onChangePage(1)} />
      )}

      <Button
        size="$2"
        icon={ChevronLeft}
        disabled={isPrevDisabled}
        onPress={() => onChangePage(currentPage - 1)}
      />
      {currentIndex > numItemBeforeAfter && (
        <Button
          size="$2"
          onPress={() => onChangePage(currentPage - (numItemBeforeAfter + 1))}
        >
          ...
        </Button>
      )}

      {shownPaginations.map((page) => (
        <Button
          key={page}
          size="$2"
          onPress={() => onChangePage(page)}
          disabled={currentPage === page}
          theme={page === currentPage ? 'blue' : undefined}
        >
          {page}
        </Button>
      ))}

      {currentPage <= totalPage - 3 && (
        <Button
          size="$2"
          onPress={() => onChangePage(currentPage + (numItemBeforeAfter + 1))}
        >
          ...
        </Button>
      )}

      <Button
        size="$2"
        icon={ChevronRight}
        disabled={isNextDisabled}
        onPress={() => onChangePage(currentPage + 1)}
      />

      {currentPage !== totalPage && (
        <Button
          size="$2"
          icon={ChevronsRight}
          onPress={() => onChangePage(totalPage)}
        />
      )}
    </XStack>
  );
};
