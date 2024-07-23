import { useRouter } from 'solito/router';

export const useNavbarState = () => {
  const router = useRouter();

  const onBackButtonPress = () => {
    router.back();
  };

  return { onBackButtonPress };
};
