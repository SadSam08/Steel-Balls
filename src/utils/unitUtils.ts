import type { WeightUnit } from '../types';

export const KG_TO_LB = 2.20462;

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  if (from === 'kg' && to === 'lb') {
    return Math.round(weight * KG_TO_LB * 10) / 10;
  }
  if (from === 'lb' && to === 'kg') {
    return Math.round((weight / KG_TO_LB) * 10) / 10;
  }
  return weight;
}

export function formatWeight(
  weight: number,
  unit: WeightUnit = 'kg',
  isBodyweight: boolean = false
): string {
  const rounded = Math.round(weight * 10) / 10;
  if (isBodyweight) {
    if (rounded === 0) return `BW (+0 ${unit})`;
    return `+${rounded} ${unit}`;
  }
  return `${rounded} ${unit}`;
}
