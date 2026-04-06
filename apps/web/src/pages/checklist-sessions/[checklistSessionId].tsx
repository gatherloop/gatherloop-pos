import {
  ApiChecklistSessionRepository,
  ChecklistSessionDetail,
  ChecklistSessionDetailProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  ChecklistSessionDetailProps,
  { checklistSessionId: string }
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

  const checklistSessionId = parseInt(
    ctx.params?.checklistSessionId ?? ''
  );

  const checklistSession =
    await checklistSessionRepository.fetchChecklistSessionById(
      checklistSessionId,
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    );

  return {
    props: {
      checklistSessionDetailParams: {
        checklistSession,
        checklistSessionId,
      },
    },
  };
};

export default ChecklistSessionDetail;
