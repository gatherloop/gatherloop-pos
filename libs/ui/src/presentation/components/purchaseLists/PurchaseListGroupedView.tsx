import {
  ExternalLink,
  Map as MapIcon,
  Phone,
  MessageCircle,
  Link,
  Package,
  ShoppingCart,
  DollarSign,
} from '@tamagui/lucide-icons';
import { Button, H5, Paragraph, Separator, XStack, YStack } from 'tamagui';
import { Linking, Platform } from 'react-native';
import { PurchaseList, PurchaseListItem } from '../../../domain';
import {
  MaterialSupplier,
  PurchaseType,
  PurchaseTypeFilter,
} from '../../../domain/entities/Material';
import { EmptyView, ListItem } from '../base';

type SupplierGroup = {
  supplierId: number | null;
  supplierName: string;
  items: Array<{ item: PurchaseListItem; supplier: MaterialSupplier | null }>;
  subtotalEstimatedCost: number;
};

function normalizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '62' + digits.slice(1);
  }
  return digits;
}

function getMapsUrl(mapsLink: string, address: string): string {
  if (mapsLink) return mapsLink;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

function openUrl(url: string) {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url);
  }
}

type ActionButtonsProps = {
  purchaseType: PurchaseType;
  supplier: MaterialSupplier;
  materialId: number;
};

function ActionButtons({
  purchaseType,
  supplier,
  materialId,
}: ActionButtonsProps) {
  if (purchaseType === 'online') {
    return (
      <Button
        size="$2"
        icon={ExternalLink}
        onPress={() => openUrl(supplier.purchaseUrl)}
        disabled={!supplier.purchaseUrl}
      >
        Open Store
      </Button>
    );
  }

  if (purchaseType === 'offline') {
    const mapsUrl = getMapsUrl(
      supplier.supplier.mapsLink,
      supplier.supplier.address
    );
    return (
      <Button size="$2" icon={MapIcon} onPress={() => openUrl(mapsUrl)}>
        Open Map
      </Button>
    );
  }

  if (purchaseType === 'delivery') {
    const phone = supplier.supplier.phone ?? '';
    const whatsappNumber = normalizePhoneForWhatsApp(phone);
    return (
      <XStack gap="$2">
        <Button
          size="$2"
          icon={Phone}
          onPress={() => openUrl(`tel:${phone}`)}
          disabled={!phone}
        >
          Call
        </Button>
        <Button
          size="$2"
          icon={MessageCircle}
          onPress={() => openUrl(`https://wa.me/${whatsappNumber}`)}
          disabled={!phone}
        >
          WhatsApp
        </Button>
      </XStack>
    );
  }

  return null;
}

type PurchaseListGroupItemProps = {
  item: PurchaseListItem;
  supplier: MaterialSupplier | null;
  materialEditUrl?: string;
};

function PurchaseListGroupItem({
  item,
  supplier,
  materialEditUrl,
}: PurchaseListGroupItemProps) {
  return (
    <YStack gap="$2">
      <ListItem
        title={item.materialName}
        subtitle={`Buy ${item.purchaseQuantity} ${item.purchaseUnit}`}
        footerItems={[
          {
            value: `${item.currentStock} / ${item.minimumStock} / ${item.normalStock} ${item.purchaseUnit}`,
            icon: Package,
            label: 'Current / Min / Normal',
            isShown: true,
          },
          {
            value: `${item.purchaseQuantity} ${item.purchaseUnit}`,
            icon: ShoppingCart,
            label: 'To Buy',
            isShown: true,
          },
          {
            value: `Rp. ${item.estimatedCost.toLocaleString('id')}`,
            icon: DollarSign,
            label: 'Est. Cost',
            isShown: true,
          },
        ]}
      />
      {supplier !== null ? (
        <XStack paddingHorizontal="$3" paddingBottom="$2">
          <ActionButtons
            purchaseType={supplier.purchaseType}
            supplier={supplier}
            materialId={item.materialId}
          />
        </XStack>
      ) : materialEditUrl ? (
        <XStack paddingHorizontal="$3" paddingBottom="$2">
          <Button
            size="$2"
            icon={Link}
            onPress={() => openUrl(materialEditUrl)}
          >
            Link a Supplier
          </Button>
        </XStack>
      ) : null}
    </YStack>
  );
}

type SupplierGroupSectionProps = {
  group: SupplierGroup;
  getMaterialEditUrl?: (materialId: number) => string;
};

function SupplierGroupSection({
  group,
  getMaterialEditUrl,
}: SupplierGroupSectionProps) {
  return (
    <YStack
      gap="$2"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$gray4"
      overflow="hidden"
    >
      <XStack
        backgroundColor="$gray3"
        paddingHorizontal="$3"
        paddingVertical="$2"
        justifyContent="space-between"
        alignItems="center"
      >
        <H5 fontWeight="bold">{group.supplierName}</H5>
        <Paragraph size="$3" color="$gray11">
          Rp. {group.subtotalEstimatedCost.toLocaleString('id')}
        </Paragraph>
      </XStack>
      <YStack gap="$2" padding="$2">
        {group.items.map(({ item, supplier }, index) => (
          <YStack
            key={`${item.materialId}-${
              supplier?.supplierId ?? 'unassigned'
            }-${index}`}
          >
            {index > 0 && <Separator marginVertical="$1" />}
            <PurchaseListGroupItem
              item={item}
              supplier={supplier}
              materialEditUrl={
                getMaterialEditUrl
                  ? getMaterialEditUrl(item.materialId)
                  : undefined
              }
            />
          </YStack>
        ))}
      </YStack>
    </YStack>
  );
}

function getOrCreateGroup(
  groupMap: Map<string, SupplierGroup>,
  key: string,
  factory: () => SupplierGroup
): SupplierGroup {
  const existing = groupMap.get(key);
  if (existing !== undefined) return existing;
  const created = factory();
  groupMap.set(key, created);
  return created;
}

function buildSupplierGroups(purchaseList: PurchaseList): SupplierGroup[] {
  const groupMap = new Map<string, SupplierGroup>([]);

  for (const item of purchaseList.items) {
    if (item.suppliers.length === 0) {
      const group = getOrCreateGroup(groupMap, 'unassigned', () => ({
        supplierId: null,
        supplierName: 'Unassigned',
        items: [],
        subtotalEstimatedCost: 0,
      }));
      group.items.push({ item, supplier: null });
      group.subtotalEstimatedCost += item.estimatedCost;
    } else {
      for (const supplier of item.suppliers) {
        const group = getOrCreateGroup(
          groupMap,
          String(supplier.supplierId),
          () => ({
            supplierId: supplier.supplierId,
            supplierName: supplier.supplier.name,
            items: [],
            subtotalEstimatedCost: 0,
          })
        );
        group.items.push({ item, supplier });
        group.subtotalEstimatedCost += item.estimatedCost;
      }
    }
  }

  const assigned: SupplierGroup[] = [];
  let unassigned: SupplierGroup | null = null;

  for (const group of groupMap.values()) {
    if (group.supplierId === null) {
      unassigned = group;
    } else {
      assigned.push(group);
    }
  }

  assigned.sort((a, b) => a.supplierName.localeCompare(b.supplierName));

  if (unassigned) {
    assigned.push(unassigned);
  }

  return assigned;
}

function applyFilter(
  groups: SupplierGroup[],
  filter: PurchaseTypeFilter
): SupplierGroup[] {
  if (filter === 'all') return groups;

  return groups
    .filter((group) => group.supplierId !== null)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        ({ supplier }) => supplier?.purchaseType === filter
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export type PurchaseListGroupedViewProps = {
  purchaseList: PurchaseList;
  getMaterialEditUrl?: (materialId: number) => string;
  purchaseTypeFilter: PurchaseTypeFilter;
};

export function PurchaseListGroupedView({
  purchaseList,
  getMaterialEditUrl,
  purchaseTypeFilter,
}: PurchaseListGroupedViewProps) {
  const allGroups = buildSupplierGroups(purchaseList);
  const groups = applyFilter(allGroups, purchaseTypeFilter);

  if (groups.length === 0) {
    if (purchaseTypeFilter !== 'all') {
      return (
        <EmptyView
          title={`No ${
            purchaseTypeFilter.charAt(0).toUpperCase() +
            purchaseTypeFilter.slice(1)
          } Purchases`}
          subtitle={`No materials need to be purchased via ${purchaseTypeFilter} right now.`}
        />
      );
    }
    return null;
  }

  return (
    <YStack gap="$3">
      {groups.map((group) => (
        <SupplierGroupSection
          key={group.supplierId ?? 'unassigned'}
          group={group}
          getMaterialEditUrl={getMaterialEditUrl}
        />
      ))}
    </YStack>
  );
}
