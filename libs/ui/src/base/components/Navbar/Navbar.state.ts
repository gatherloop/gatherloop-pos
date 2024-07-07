import { useRouter } from 'solito/router';

export const useNavbarState = () => {
  const router = useRouter();

  const onBackButtonPress = () => {
    console.log("back yuk")
    router.back();
  };

  return { onBackButtonPress };
};
