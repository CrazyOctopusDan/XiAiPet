import type { DeliveryRuleTierRow } from '@xiaipet/shared/types/runtime-config';

import type { CustomerAddress } from './address';
import type { CustomerRuntimeConfig } from './runtime-config';

export interface DeliveryFeePreview {
  distanceKm: number;
  fee: number;
  ruleLabel: string;
  minimumOrderAmount: number | null;
  outOfRange: boolean;
}

export interface DeliveryRuleViolation {
  reason: 'delivery_minimum_not_met' | 'delivery_out_of_range';
  errorCode: 'DELIVERY_MINIMUM_NOT_MET' | 'DELIVERY_OUT_OF_RANGE';
  minimumOrderAmount?: number;
  distanceKm?: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function isCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function calculateDistanceKm(from: { latitude: number; longitude: number }, to: { latitude?: number; longitude?: number }) {
  const toLatitude = to.latitude;
  const toLongitude = to.longitude;

  if (!isCoordinate(toLatitude) || !isCoordinate(toLongitude)) {
    return null;
  }

  const latDelta = toRadians(toLatitude - from.latitude);
  const lonDelta = toRadians(toLongitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(toLatitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;

  return Number((EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).toFixed(1));
}

function formatRuleLabel(distanceKm: number | null, tierDistanceKm: number) {
  if (distanceKm === null) {
    return `${tierDistanceKm.toFixed(1)} 公里内`;
  }

  return `${distanceKm.toFixed(1)} 公里，${tierDistanceKm.toFixed(1)} 公里内`;
}

function sortTiers(tiers: DeliveryRuleTierRow[]) {
  return [...tiers].sort((left, right) => left.distanceKm - right.distanceKm);
}

export function resolveDeliveryFeePreview(
  runtimeConfig: CustomerRuntimeConfig,
  address: Pick<CustomerAddress, 'latitude' | 'longitude'> | null
): DeliveryFeePreview {
  if (!address) {
    return {
      distanceKm: 0,
      fee: 0,
      ruleLabel: '待选择配送地址',
      minimumOrderAmount: null,
      outOfRange: false
    };
  }

  const sortedTiers = sortTiers(runtimeConfig.deliveryRules.tiers);
  const distanceKm = calculateDistanceKm(runtimeConfig.store, address);
  const matchedTier = distanceKm === null
    ? sortedTiers[0]
    : sortedTiers.find((tier) => distanceKm <= tier.distanceKm);
  const maxTier = sortedTiers[sortedTiers.length - 1];

  if (!matchedTier) {
    return {
      distanceKm: distanceKm ?? 0,
      fee: 0,
      ruleLabel: maxTier
        ? `${(distanceKm ?? maxTier.distanceKm).toFixed(1)} 公里，超出 ${maxTier.distanceKm.toFixed(1)} 公里配送范围`
        : '配送费待确认',
      minimumOrderAmount: null,
      outOfRange: Boolean(maxTier)
    };
  }

  return {
    distanceKm: distanceKm ?? matchedTier.distanceKm,
    fee: matchedTier.deliveryFee,
    ruleLabel: formatRuleLabel(distanceKm, matchedTier.distanceKm),
    minimumOrderAmount: matchedTier.minimumOrderAmount,
    outOfRange: false
  };
}

export function getDeliveryRuleViolation(input: {
  runtimeConfig: CustomerRuntimeConfig;
  address: Pick<CustomerAddress, 'latitude' | 'longitude'> | null;
  itemsSubtotal: number;
}): DeliveryRuleViolation | null {
  const preview = resolveDeliveryFeePreview(input.runtimeConfig, input.address);

  if (preview.outOfRange) {
    return {
      reason: 'delivery_out_of_range',
      errorCode: 'DELIVERY_OUT_OF_RANGE',
      distanceKm: preview.distanceKm
    };
  }

  if (input.itemsSubtotal > 0 && preview.minimumOrderAmount !== null && input.itemsSubtotal < preview.minimumOrderAmount) {
    return {
      reason: 'delivery_minimum_not_met',
      errorCode: 'DELIVERY_MINIMUM_NOT_MET',
      minimumOrderAmount: preview.minimumOrderAmount,
      distanceKm: preview.distanceKm
    };
  }

  return null;
}
