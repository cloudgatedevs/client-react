export interface WidgetProp {
  name: string;
  type: string;
  description: string;
}
export interface WidgetDefinition {
  id: string;
  name: string;
  category: string;
  exports: string[];
  description: string;
  props: WidgetProp[];
  example: string;
}
export interface WidgetRecipe {
  id: string;
  name: string;
  description: string;
  widgets: string[];
  code: string;
}
export const widgetImport: string;
export const widgetGuidelines: string;
export const widgets: WidgetDefinition[];
export const widgetRecipes: WidgetRecipe[];
export const widgetCatalog: {
  schemaVersion: number;
  importPath: string;
  stylesheet: string;
  widgets: WidgetDefinition[];
  recipes: WidgetRecipe[];
};
export function searchWidgets(query?: string): WidgetDefinition[];
export function getWidget(id: string): WidgetDefinition | undefined;
export function getWidgetRecipe(id: string): WidgetRecipe | undefined;
