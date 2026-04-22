import type {
  CatalogProductAdminRecord,
  CatalogProductFormulaOption,
  CatalogProductSpecOption
} from '@xiaipet/shared/types/catalog-admin';

interface ProductPricingSelection {
  specId: string;
  formulaId: string;
}

interface ProductCombinationPriceResolution {
  specId: string;
  formulaId: string;
  basePrice: number;
  specSurcharge: number;
  formulaSurcharge: number;
  computedPrice: number;
  finalPrice: number;
  source: 'default' | 'override';
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function findOption<T extends CatalogProductSpecOption | CatalogProductFormulaOption>(
  entries: T[],
  id: string,
  label: 'spec' | 'formula'
): T {
  const entry = entries.find((candidate) => candidate.id === id);

  if (!entry) {
    throw new Error(`Unknown ${label} option: ${id}`);
  }

  return entry;
}

export function resolveProductCombinationPrice(
  product: Pick<CatalogProductAdminRecord, 'basePrice' | 'specs' | 'formulas' | 'priceOverrides'>,
  selection: ProductPricingSelection
): ProductCombinationPriceResolution {
  const spec = findOption(product.specs, selection.specId, 'spec');
  const formula = findOption(product.formulas, selection.formulaId, 'formula');
  const computedPrice = roundCurrency(product.basePrice + spec.surcharge + formula.surcharge);
  const override = product.priceOverrides.find(
    (entry) => entry.specId === selection.specId && entry.formulaId === selection.formulaId
  );

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
