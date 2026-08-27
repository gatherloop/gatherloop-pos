import { H4, ScrollView, YStack } from 'tamagui';
import {
  ChecklistSessionFormView,
  ChecklistSessionList,
  Layout,
} from '../components';
import {
  ChecklistSession,
  ChecklistSessionListFilter,
  ChecklistTemplate,
} from '../../domain';
import { FormVariant } from '../components/base';
import { ChecklistSessionForm } from '../../domain';

export type ChecklistSessionListScreenProps = {
  onLogoutPress: () => void;
  onItemPress: (checklistSession: ChecklistSession) => void;
  onRetryButtonPress: () => void;
  onFilterChange: (filter: ChecklistSessionListFilter) => void;
  onPageChange: (page: number) => void;
  filter: ChecklistSessionListFilter;
  currentPage: number;
  totalItem: number;
  itemPerPage: number;
  variant:
    | { type: 'loading' }
    | { type: 'error' }
    | { type: 'empty' }
    | { type: 'loaded'; items: ChecklistSession[] };
  createFormVariant: FormVariant;
  createFormDefaultValues: ChecklistSessionForm;
  onSubmit: (values: ChecklistSessionForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  checklistTemplates: ChecklistTemplate[];
  isRevalidating?: boolean;
  onEmptyActionPress?: () => void;
};

export const ChecklistSessionListScreen = ({
  onLogoutPress,
  onItemPress,
  onRetryButtonPress,
  onFilterChange,
  onPageChange,
  filter,
  currentPage,
  totalItem,
  itemPerPage,
  variant,
  createFormVariant,
  createFormDefaultValues,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  checklistTemplates,
  isRevalidating,
  onEmptyActionPress,
}: ChecklistSessionListScreenProps) => {
  return (
    <Layout onLogoutPress={onLogoutPress} title="Checklist Sessions">
      <ScrollView>
        <YStack gap="$4">
          <YStack gap="$2">
            <H4>Execute New Session</H4>
            <ChecklistSessionFormView
              variant={createFormVariant}
              defaultValues={createFormDefaultValues}
              onSubmit={onSubmit}
              isSubmitting={isSubmitting}
              isSubmitDisabled={isSubmitDisabled}
              checklistTemplates={checklistTemplates}
            />
          </YStack>

          <ChecklistSessionList
            variant={variant}
            filter={filter}
            onFilterChange={onFilterChange}
            onRetryButtonPress={onRetryButtonPress}
            onPageChange={onPageChange}
            onItemPress={onItemPress}
            currentPage={currentPage}
            totalItem={totalItem}
            itemPerPage={itemPerPage}
            isRevalidating={isRevalidating}
          />
        </YStack>
      </ScrollView>
    </Layout>
  );
};
