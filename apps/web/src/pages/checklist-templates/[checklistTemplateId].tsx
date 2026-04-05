import {
  ApiChecklistTemplateRepository,
  ChecklistTemplateUpdate,
  ChecklistTemplateUpdateProps,
} from '@gatherloop-pos/ui';
import { GetServerSideProps } from 'next';
import { QueryClient } from '@tanstack/react-query';

export const getServerSideProps: GetServerSideProps<
  ChecklistTemplateUpdateProps,
  { checklistTemplateId: string }
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

  const checklistTemplateId = parseInt(
    ctx.params?.checklistTemplateId ?? ''
  );
  const checklistTemplate =
    await checklistTemplateRepository.fetchChecklistTemplateById(
      checklistTemplateId,
      {
        headers: { Cookie: ctx.req.headers.cookie },
      }
    );

  return {
    props: {
      checklistTemplateUpdateParams: {
        checklistTemplate,
        checklistTemplateId,
      },
    },
  };
};

export default ChecklistTemplateUpdate;
