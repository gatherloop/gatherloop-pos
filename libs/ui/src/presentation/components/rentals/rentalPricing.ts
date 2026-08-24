import { PricingTier } from '../../../domain';

export function calculateSubtotal(
  tiers: PricingTier[],
  checkinAt: string,
  now: Date
): number {
  if (tiers.length === 0) return 0;
  const durationMinutes = Math.ceil(
    (now.getTime() - new Date(checkinAt).getTime()) / 60000
  );
  for (const tier of tiers) {
    if (tier.upToMinutes >= durationMinutes) return tier.price;
  }
  return tiers[tiers.length - 1].price;
}

export function formatDuration(checkinAt: string, now: Date): string {
  const totalMinutes = Math.ceil(
    (now.getTime() - new Date(checkinAt).getTime()) / 60000
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}
