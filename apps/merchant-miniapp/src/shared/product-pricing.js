"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveProductCombinationPrice = resolveProductCombinationPrice;
function roundCurrency(value) {
    return Number(value.toFixed(2));
}
function findOption(entries, id, label) {
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry) {
        throw new Error(`Unknown ${label} option: ${id}`);
    }
    return entry;
}
function resolveProductCombinationPrice(product, selection) {
    const spec = findOption(product.specs, selection.specId, 'spec');
    const formula = findOption(product.formulas, selection.formulaId, 'formula');
    const computedPrice = roundCurrency(product.basePrice + spec.surcharge + formula.surcharge);
    const override = product.priceOverrides.find((entry) => entry.specId === selection.specId && entry.formulaId === selection.formulaId);
    return {
        specId: selection.specId,
        formulaId: selection.formulaId,
        basePrice: roundCurrency(product.basePrice),
        specSurcharge: roundCurrency(spec.surcharge),
        formulaSurcharge: roundCurrency(formula.surcharge),
        computedPrice,
        finalPrice: override ? roundCurrency(override.price) : computedPrice,
        source: override ? 'override' : 'default'
    };
}
