import { LogOut, User } from '@tamagui/lucide-icons';
import { Avatar, H6, ListItem, Popover, XStack, YGroup } from 'tamagui';

const ProfileMenu = () => {
  return (
    <Popover size="$5">
      <Popover.Trigger>
        <XStack gap="$3" alignItems="center">
          <Avatar circular size="$3">
            <Avatar.Image src="https://images.unsplash.com/photo-1548142813-c348350df52b?&w=150&h=150&dpr=2&q=80" />
            <Avatar.Fallback backgroundColor="$blue10" />
          </Avatar>
          <H6 $xs={{ display: 'none' }}>M. Nindra Zaka</H6>
        </XStack>
      </Popover.Trigger>

      <Popover.Content
        borderWidth={1}
        borderColor="$borderColor"
        enterStyle={{ y: -10, opacity: 0 }}
        exitStyle={{ y: -10, opacity: 0 }}
        elevate
        padding="$0"
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
      >
        <YGroup alignSelf="flex-start" bordered width={240} size="$4">
          <YGroup.Item>
            <ListItem hoverTheme icon={User}>
              Profile
            </ListItem>
          </YGroup.Item>
          <YGroup.Item>
            <ListItem hoverTheme icon={LogOut}>
              Logout
            </ListItem>
          </YGroup.Item>
        </YGroup>
      </Popover.Content>
    </Popover>
  );
};

export const Navbar = () => {
  return (
    <XStack
      padding="$3"
      justifyContent="flex-end"
      elevation="$1"
      backgroundColor="$gray1"
    >
      <ProfileMenu />
    </XStack>
  );
};
