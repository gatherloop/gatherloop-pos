import {
  ApiChecklistSessionRepository,
  ApiChecklistTemplateRepository,
  ChecklistSessionList,
  ChecklistSessionListProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  ChecklistSessionListProps
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
  const checklistSessionRepository = new ApiChecklistSessionRepository(client);
  const checklistTemplateRepository = new ApiChecklistTemplateRepository(client);

  const today = new Date().toISOString().split('T')[0];

  const [sessionResult, templateResult] = await Promise.all([
    checklistSessionRepository.fetchChecklistSessionList(
      {
        page: 1,
        itemPerPage: 10,
        filter: { dateFrom: today, dateTo: today },
      },
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    ),
    checklistTemplateRepository.fetchChecklistTemplateList(
      {
        page: 1,
        itemPerPage: 100,
        orderBy: 'asc',
        query: '',
        sortBy: 'created_at',
      },
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    ),
  ]);

  return {
    props: {
      checklistSessionListParams: {
        checklistSessions: sessionResult.checklistSessions,
        totalItem: sessionResult.totalItem,
        filter: { dateFrom: today, dateTo: today },
      },
      checklistSessionCreateParams: {
        date: today,
      },
      checklistTemplates: templateResult.checklistTemplates,
    },
  };
};

export default ChecklistSessionList;
