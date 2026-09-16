import { ApiAvailabilityRepository, toSerializableProps } from '@gatherloop-pos/ui';
import { Availability, AvailabilityProps } from '@gatherloop-pos/ui/pos';
import { QueryClient } from '@tanstack/react-query';
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps<AvailabilityProps> = async (
  ctx
) => {
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
  const availabilityRepository = new ApiAvailabilityRepository(client);

  const products = await availabilityRepository.fetchAvailabilityList({
    headers: { Cookie: ctx.req.headers.cookie },
  });

  return {
    props: toSerializableProps({
      availabilityListParams: { products },
    }),
  };
};

export default Availability;
