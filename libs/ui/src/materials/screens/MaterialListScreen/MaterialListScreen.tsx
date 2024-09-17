import { Button } from 'tamagui';
import { Layout } from '../../../base';
import { MaterialList } from '../../components';
import { Link } from 'solito/link';
import { Plus } from '@tamagui/lucide-icons';
import { MaterialDeleteAlert } from '../../components/MaterialDeleteAlert';

export const MaterialListScreen = () => {
  return (
    <Layout
      title="Materials"
      rightActionItem={
        <Link href="/materials/create">
          <Button size="$3" icon={Plus} variant="outlined" disabled />
        </Link>
      }
    >
      <MaterialList />
      <MaterialDeleteAlert />
    </Layout>
  );
};
