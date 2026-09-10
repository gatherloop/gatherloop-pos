import { Ref } from 'react';
import { Label, SizableText, XStack, YStack } from 'tamagui';
import type { LayoutChangeEvent, TextInput } from 'react-native';
import { InputNumber, useIsCompactLayout } from '../base';

export type StockCheckItemRowProps = {
  materialName: string;
  purchaseUnit: string;
  fieldName: string;
  inputId: string;
  isPending: boolean;
  isErrorRow: boolean;
  hidden: boolean;
  onLayout?: (y: number) => void;
  inputRef?: Ref<TextInput>;
};

const PendingBadge = ({ isErrorRow }: { isErrorRow: boolean }) => (
  <XStack
    backgroundColor={isErrorRow ? '$red5' : '$yellow5'}
    paddingHorizontal="$2"
    paddingVertical="$1"
    borderRadius="$10"
  >
    <SizableText size="$1" color={isErrorRow ? '$red11' : '$yellow11'}>
      Pending
    </SizableText>
  </XStack>
);

const RowError = () => (
  <SizableText size="$1" color="$red10" role="alert">
    Please enter the current stock
  </SizableText>
);

export const StockCheckItemRow = ({
  materialName,
  purchaseUnit,
  fieldName,
  inputId,
  isPending,
  isErrorRow,
  hidden,
  onLayout,
  inputRef,
}: StockCheckItemRowProps) => {
  const isCompactLayout = useIsCompactLayout();
  const backgroundColor = isErrorRow
    ? '$red3'
    : isPending
    ? '$yellow3'
    : undefined;

  const handleLayout = onLayout
    ? (event: LayoutChangeEvent) => onLayout(event.nativeEvent.layout.y)
    : undefined;

  if (isCompactLayout) {
    return (
      <YStack
        gap="$1"
        paddingVertical="$2"
        paddingHorizontal="$3"
        borderWidth={1}
        borderColor="$borderColor"
        display={hidden ? 'none' : 'flex'}
        backgroundColor={backgroundColor}
        borderRadius="$4"
        onLayout={handleLayout}
      >
        <XStack gap="$2" alignItems="flex-start" justifyContent="space-between">
          <Label flex={1} numberOfLines={2} htmlFor={inputId}>
            {materialName}
          </Label>
          {isPending && <PendingBadge isErrorRow={isErrorRow} />}
        </XStack>

        <XStack gap="$2" alignItems="center">
          <SizableText flex={1} numberOfLines={1} color="$gray10">
            {purchaseUnit}
          </SizableText>
          <InputNumber
            ref={inputRef}
            name={fieldName}
            id={inputId}
            error={isErrorRow}
            aria-invalid={isErrorRow || undefined}
            width={72}
            minWidth={72}
            maxWidth={72}
            textAlign="center"
            buttonSize="$3"
          />
        </XStack>

        {isErrorRow && <RowError />}
      </YStack>
    );
  }

  return (
    <XStack
      gap="$2"
      alignItems="center"
      paddingVertical="$3"
      paddingHorizontal="$4"
      borderWidth={1}
      borderColor="$borderColor"
      display={hidden ? 'none' : 'flex'}
      backgroundColor={backgroundColor}
      borderRadius="$4"
      onLayout={handleLayout}
    >
      <Label flex={1} numberOfLines={1} htmlFor={inputId}>
        {materialName}
      </Label>
      <YStack>
        <InputNumber
          ref={inputRef}
          name={fieldName}
          width={100}
          id={inputId}
          error={isErrorRow}
          aria-invalid={isErrorRow || undefined}
        />
        {isErrorRow && <RowError />}
      </YStack>
      <SizableText width={60} color="$gray10">
        {purchaseUnit}
      </SizableText>
      <XStack width={60} justifyContent="center">
        {isPending && <PendingBadge isErrorRow={isErrorRow} />}
      </XStack>
    </XStack>
  );
};
