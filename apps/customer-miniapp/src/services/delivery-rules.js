"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateDistanceKm = calculateDistanceKm;
exports.resolveDeliveryFeePreview = resolveDeliveryFeePreview;
exports.getDeliveryRuleViolation = getDeliveryRuleViolation;
const EARTH_RADIUS_KM = 6371;
function toRadians(value) {
    return (value * Math.PI) / 180;
}
function isCoordinate(value) {
    return typeof value === 'number' && Number.isFinite(value);
}
function calculateDistanceKm(from, to) {
    const toLatitude = to.latitude;
    const toLongitude = to.longitude;
    if (!isCoordinate(toLatitude) || !isCoordinate(toLongitude)) {
        return null;
    }
    const latDelta = toRadians(toLatitude - from.latitude);
    const lonDelta = toRadians(toLongitude - from.longitude);
    const fromLat = toRadians(from.latitude);
    const toLat = toRadians(toLatitude);
    const haversine = Math.sin(latDelta / 2) ** 2 +
        Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;
    return Number((EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))).toFixed(1));
}
function formatRuleLabel(distanceKm, tierDistanceKm) {
    if (distanceKm === null) {
        return `${tierDistanceKm.toFixed(1)} 公里内`;
    }
    return `${distanceKm.toFixed(1)} 公里，${tierDistanceKm.toFixed(1)} 公里内`;
}
function sortTiers(tiers) {
    return [...tiers].sort((left, right) => left.distanceKm - right.distanceKm);
}
function resolveDeliveryFeePreview(runtimeConfig, address) {
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
            distanceKm: distanceKm !== null && distanceKm !== void 0 ? distanceKm : 0,
            fee: 0,
            ruleLabel: maxTier
                ? `${(distanceKm !== null && distanceKm !== void 0 ? distanceKm : maxTier.distanceKm).toFixed(1)} 公里，超出 ${maxTier.distanceKm.toFixed(1)} 公里配送范围`
                : '配送费待确认',
            minimumOrderAmount: null,
            outOfRange: Boolean(maxTier)
        };
    }
    return {
        distanceKm: distanceKm !== null && distanceKm !== void 0 ? distanceKm : matchedTier.distanceKm,
        fee: matchedTier.deliveryFee,
        ruleLabel: formatRuleLabel(distanceKm, matchedTier.distanceKm),
        minimumOrderAmount: matchedTier.minimumOrderAmount,
        outOfRange: false
    };
}
function getDeliveryRuleViolation(input) {
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
