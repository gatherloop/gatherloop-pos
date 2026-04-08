import { H4, ScrollView, YStack } from 'tamagui';
import { ChecklistSessionFormView, ChecklistSessionList, Layout } from '../components';
import { ChecklistSession, ChecklistSessionListFilter, ChecklistTemplate } from '../../domain';
import { UseFormReturn } from 'react-hook-form';
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
  form: UseFormReturn<ChecklistSessionForm>;
  onSubmit: (values: ChecklistSessionForm) => void;
  isSubmitDisabled: boolean;
  checklistTemplates: ChecklistTemplate[];
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
  form,
  onSubmit,
  isSubmitDisabled,
  checklistTemplates,
}: ChecklistSessionListScreenProps) => {
  return (
    <Layout
      onLogoutPress={onLogoutPress}
      title="Checklist Sessions"
    >
      <ScrollView>
        <YStack gap="$4">
          <YStack gap="$2">
            <H4>Execute New Session</H4>
            <ChecklistSessionFormView
              form={form}
              onSubmit={onSubmit}
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
          />
        </YStack>
      </ScrollView>
    </Layout>
  );
};
