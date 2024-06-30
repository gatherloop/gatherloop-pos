import { H2, Paragraph, XStack, YStack } from 'tamagui';
import { Navbar, Sidebar, ListItem } from '../../base';

const categories = [
  {
    name: 'Food',
    description: 'Lorem Ipsum Dolor Sit Amet',
    imageUrl:
      'https://d1vbn70lmn1nqe.cloudfront.net/prod/wp-content/uploads/2023/03/03032538/Resep-Sehat-Bahan-Burger-Rendah-Kalori-dan-Cocok-untuk-Diet.png.webp',
  },
  {
    name: 'Beverage',
    description: 'Lorem Ipsum Dolor Sit Amet',
    imageUrl:
      'https://d1vbn70lmn1nqe.cloudfront.net/prod/wp-content/uploads/2023/03/03032538/Resep-Sehat-Bahan-Burger-Rendah-Kalori-dan-Cocok-untuk-Diet.png.webp',
  },
  {
    name: 'Board Game',
    description: 'Lorem Ipsum Dolor Sit Amet',
    imageUrl:
      'https://d1vbn70lmn1nqe.cloudfront.net/prod/wp-content/uploads/2023/03/03032538/Resep-Sehat-Bahan-Burger-Rendah-Kalori-dan-Cocok-untuk-Diet.png.webp',
  },
];

export const CategoryListScreen = () => {
  return (
    <XStack flex={1}>
      <Sidebar />
      <YStack flex={1}>
        <Navbar />
        <YStack padding="$5" gap="$3">
          <H2>Categories</H2>
          <Paragraph>Manage your product category</Paragraph>
          <XStack gap="$3" flexWrap="wrap">
            {categories.map((category, index) => (
              <ListItem
                key={index}
                title={category.name}
                subtitle={category.description}
                thumbnailSrc={category.imageUrl}
                $xs={{ flexBasis: '100%' }}
                $sm={{ flexBasis: '40%' }}
                flexBasis="30%"
              />
            ))}
          </XStack>
        </YStack>
      </YStack>
    </XStack>
  );
};
