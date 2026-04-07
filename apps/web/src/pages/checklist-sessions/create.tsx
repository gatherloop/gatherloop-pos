import {
  ApiChecklistTemplateRepository,
  ChecklistSessionCreate,
  ChecklistSessionCreateProps,
} from '@gatherloop-pos/ui';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<
  ChecklistSessionCreateProps
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

  const { checklistTemplates } =
    await checklistTemplateRepository.fetchChecklistTemplateList(
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
    );

  const today = new Date().toISOString().split('T')[0];
  const templateId = ctx.query.templateId
    ? parseInt(ctx.query.templateId as string)
    : null;

  return {
    props: {
      checklistSessionCreateParams: {
        checklistTemplateId: templateId,
        date: today,
      },
      checklistTemplates,
    },
  };
};

export default ChecklistSessionCreate;
