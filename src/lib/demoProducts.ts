export type DemoRoutineProduct = {
  id: string;
  product_id: string;
  custom_name: string;
  custom_category: string;
  usage_instructions: string;
  routine_slot: "AM" | "PM" | "Both";
  step_order: number;
  source: "demo-preview";
  products: null;
};

// Local-only sample content. These rows are only passed through navigation and
// must never be written to Supabase.
export const DEMO_PRODUCTS: DemoRoutineProduct[] = [
  { id: "demo-cleanser", product_id: "demo-cleanser", custom_name: "Gentle Daily Cleanser", custom_category: "cleanser", usage_instructions: "Massage onto damp skin, then rinse.", routine_slot: "Both", step_order: 1, source: "demo-preview", products: null },
  { id: "demo-serum", product_id: "demo-serum", custom_name: "Hydrating Serum", custom_category: "serum", usage_instructions: "Apply a few drops after cleansing.", routine_slot: "Both", step_order: 2, source: "demo-preview", products: null },
  { id: "demo-moisturizer", product_id: "demo-moisturizer", custom_name: "Daily Moisturizer", custom_category: "moisturizer", usage_instructions: "Apply after serum to seal in hydration.", routine_slot: "Both", step_order: 3, source: "demo-preview", products: null },
  { id: "demo-sunscreen", product_id: "demo-sunscreen", custom_name: "Broad-Spectrum SPF 30", custom_category: "sunscreen", usage_instructions: "Apply generously as the final morning step.", routine_slot: "AM", step_order: 4, source: "demo-preview", products: null },
];
