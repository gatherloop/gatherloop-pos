import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons';
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
  return totalPage === 1 ? null : (
    <XStack gap="$3">
      <Button
        size="$2"
        icon={ChevronLeft}
        disabled={isPrevDisabled}
        onPress={() => onChangePage(currentPage - 1)}
      />
      {Array.from(Array(totalPage)).map((_, index) => (
        <Button
          size="$2"
          onPress={() => onChangePage(index + 1)}
          disabled={currentPage === index + 1}
          theme={index + 1 === currentPage ? 'blue' : undefined}
        >
          {index + 1}
        </Button>
      ))}
      <Button
        size="$2"
        icon={ChevronRight}
        disabled={isNextDisabled}
        onPress={() => onChangePage(currentPage + 1)}
      />
    </XStack>
  );
};
