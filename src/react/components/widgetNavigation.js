import {
  Blocks,
  CalendarDays,
  BookOpen,
  CheckCheck,
  Layers,
  LayoutDashboard,
  MousePointer2,
  SlidersHorizontal,
  Shapes,
  Table2,
  TrendingUp,
  WandSparkles,
} from "lucide-react";
import { widgetIndex } from "../../widgets/widget-index.js";
import { BACKOFFICE_PERMISSIONS as P } from "../../platform/backoffice-permissions.js";

const categoryIcons = {
  Foundations: Shapes,
  Data: Table2,
  Scheduling: CalendarDays,
  Charts: TrendingUp,
  Cards: Layers,
  Actions: MousePointer2,
  Forms: SlidersHorizontal,
  Navigation: Blocks,
  Feedback: CheckCheck,
};
const link = (path, label, icon, keywords = []) => ({
  to: path,
  label,
  icon,
  keywords,
  permission: P.WidgetsView,
});
export const WIDGET_NAV = {
  id: "cloudgate-widgets",
  label: "Widget library",
  icon: Blocks,
  section: "platform",
  keywords: ["components", "design system"],
  children: [
    { ...link("/widgets", "Overview", LayoutDashboard), end: true },
    ...Object.entries(categoryIcons).map(([category, icon]) => ({
      id: `widgets-${category.toLowerCase()}`,
      label: category === 'Data' ? 'Tables' : category,
      icon,
      children: ['Charts','Cards'].includes(category) ? [...new Set(widgetIndex.filter(widget=>widget.category===category).map(widget=>widget.group || 'Essentials'))].map(group=>({
        id:`widgets-${category.toLowerCase()}-${group.toLowerCase()}`,label:group,icon,
        children:widgetIndex.filter(widget=>widget.category===category && (widget.group || 'Essentials')===group)
          .map(widget=>link(`/widgets/${widget.id}`,widget.name,null,[widget.id,widget.exportName || widget.name])),
      })) : widgetIndex
        .filter((widget) => widget.category === category)
        .map((widget) =>
          link(`/widgets/${widget.id}`, widget.name, null, [
            widget.id,
            ...(widget.id === "data-table"
              ? ["lazy loading", "pagination", "sorting", "filtering"]
              : []),
            ...(widget.id === "dialog" ? ["modal"] : []),
            ...(widget.id === "select" ? ["dropdown", "searchable", "search", "server"] : []),
            ...(widget.id === "radio" ? ["radio buttons", "choices"] : []),
            ...(widget.id === "icons" ? ["icons", "symbols", "lucide", "svg"] : []),
            ...(widget.id === "typography" ? ["text", "typography", "headings", "paragraphs", "fonts", "links", "quotes", "lists"] : []),
          ]),
        ),
    })),
    link("/widgets/recipes", "Recipes", WandSparkles),
    link("/widgets/guidelines", "Usage guide", BookOpen),
  ],
};
