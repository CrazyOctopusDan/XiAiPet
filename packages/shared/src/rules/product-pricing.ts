import type {
  CatalogProductAdminRecord,
  CatalogProductFormulaOption,
  CatalogProductSpecOption
} from '../types/catalog-admin';

export interface ProductPricingSelection {
  specId: string;
  formulaId: string;
}

export interface ProductCombinationPriceResolution {
  specId: string;
  formulaId: string;
  basePrice: number;
  specSurcharge: number;
  formulaSurcharge: number;
  computedPrice: number;
  finalPrice: number;
  source: 'default' | 'override';
}

export interface ProductSavePricingContractValidation {
  valid: boolean;
  issues: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function roundCurrency(value: number): number {
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

export function validateProductSavePricingContract(
  value: Partial<CatalogProductAdminRecord> | Record<string, unknown>
): ProductSavePricingContractValidation {
  const issues: string[] = [];

  if (!isNonEmptyString(value.imageFileId)) {
    issues.push('imageFileId');
  }

  if (!isNonEmptyString(value.name)) {
    issues.push('name');
  }

  if (!isNonEmptyString(value.categoryId)) {
    issues.push('categoryId');
  }

  if (!Array.isArray(value.fulfillmentModes) || value.fulfillmentModes.length === 0) {
    issues.push('fulfillmentModes');
  }

  if (typeof value.trackInventory !== 'boolean') {
    issues.push('trackInventory');
  }

  if (typeof value.status !== 'string') {
    issues.push('status');
  }

  return {
    valid: issues.length === 0,
    issues
  };
}
