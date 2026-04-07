import {
  ApiChecklistSessionRepository,
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

  const today = new Date().toISOString().split('T')[0];

  const { checklistSessions, totalItem } =
    await checklistSessionRepository.fetchChecklistSessionList(
      {
        page: 1,
        itemPerPage: 10,
        filter: { dateFrom: today, dateTo: today },
      },
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    );

  return {
    props: {
      checklistSessionListParams: {
        checklistSessions,
        totalItem,
        filter: { dateFrom: today, dateTo: today },
      },
    },
  };
};

export default ChecklistSessionList;
