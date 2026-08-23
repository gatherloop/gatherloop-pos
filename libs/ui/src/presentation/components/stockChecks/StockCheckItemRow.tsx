import { forwardRef } from 'react';
import { Label, SizableText, TamaguiElement, XStack, YStack } from 'tamagui';
import { InputNumber } from '../base';

export type StockCheckItemRowProps = {
  materialName: string;
  purchaseUnit: string;
  fieldName: string;
  inputId: string;
  isPending: boolean;
  isErrorRow: boolean;
  hidden: boolean;
};

export const StockCheckItemRow = forwardRef<
  TamaguiElement,
  StockCheckItemRowProps
>(
  (
    {
      materialName,
      purchaseUnit,
      fieldName,
      inputId,
      isPending,
      isErrorRow,
      hidden,
    },
    ref
  ) => {
    return (
      <XStack
        gap="$2"
        alignItems="center"
        paddingVertical="$3"
        paddingHorizontal="$4"
        borderWidth={1}
        borderColor="$borderColor"
        display={hidden ? 'none' : 'flex'}
        backgroundColor={
          isErrorRow ? '$red3' : isPending ? '$yellow3' : undefined
        }
        borderRadius="$4"
        ref={ref}
      >
        <Label flex={1} numberOfLines={1} htmlFor={inputId}>
          {materialName}
        </Label>
        <YStack>
          <InputNumber
            name={fieldName}
            width={100}
            id={inputId}
            error={isErrorRow}
            aria-invalid={isErrorRow || undefined}
          />
          {isErrorRow && (
            <SizableText size="$1" color="$red10" role="alert">
              Please enter the current stock
            </SizableText>
          )}
        </YStack>
        <SizableText width={60} color="$gray10">
          {purchaseUnit}
        </SizableText>
        <XStack width={60} justifyContent="center">
          {isPending && (
            <XStack
              backgroundColor={isErrorRow ? '$red5' : '$yellow5'}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$10"
            >
              <SizableText
                size="$1"
                color={isErrorRow ? '$red11' : '$yellow11'}
              >
                Pending
              </SizableText>
            </XStack>
          )}
        </XStack>
      </XStack>
    );
  }
);

StockCheckItemRow.displayName = 'StockCheckItemRow';
