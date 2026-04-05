import {
  ApiChecklistTemplateRepository,
  ChecklistTemplateList,
  ChecklistTemplateListProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  ChecklistTemplateListProps
> = async (ctx) => {
  const isLoggedIn = ctx.req.headers.cookie?.includes('Authorization');
  if (!isLoggedIn) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const client = new QueryClient();
  const checklistTemplateRepository = new ApiChecklistTemplateRepository(
    client
  );
  const { checklistTemplates, totalItem } =
    await checklistTemplateRepository.fetchChecklistTemplateList(
      {
        page: 1,
        itemPerPage: 10,
        orderBy: 'asc',
        query: '',
        sortBy: 'created_at',
      },
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    );

  return {
    props: {
      checklistTemplateListParams: {
        checklistTemplates,
        totalItem,
      },
    },
  };
};

export default ChecklistTemplateList;
