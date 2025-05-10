declare module '../rules/woodfencerules.js' {
  export const woodFenceRules: any;
  export function getHeightFactor(height: number): number;
  export function calculateWoodFenceCost(linearFeet: number, height: number, state: string, options?: {
    demolition?: boolean;
    painting?: boolean;
    laborRate?: number | null;
    additionalLattice?: boolean;
    postType?: string;
  }): any;
}