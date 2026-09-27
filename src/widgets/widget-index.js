// Lightweight navigation metadata. Full docs and examples stay in the lazy catalogue.
import { advancedChartIndex } from './chart-index.js';
import { cardIndex } from './card-index.js';
export const widgetIndex = [
  { id: "icons", name: "Icon library", category: "Foundations" },
  { id: "typography", name: "Text styles", category: "Foundations" },
  {
    id: "data-table",
    name: "Static table",
    category: "Data",
  },
  { id: "lazy-table", name: "Lazy loading", category: "Data" },
  { id: "selection-table", name: "Selection & bulk actions", category: "Data" },
  { id: "row-selection-table", name: "Row selection", category: "Data" },
  { id: "subtable", name: "Expandable subtables", category: "Data" },
  { id: "advanced-table", name: "Advanced filters", category: "Data" },
  {id:'calendar',name:'Calendar',category:'Scheduling'},
  {id:'scrum-board',name:'Scrum board',category:'Scheduling'},
  {id:'timeline',name:'Timeline',category:'Scheduling'},
  {
    id: "line-chart",
    name: "Line chart",
    category: "Charts",
  },
  {
    id: "bar-chart",
    name: "Bar chart",
    category: "Charts",
  },
  {
    id: "donut-chart",
    name: "Donut chart",
    category: "Charts",
  },
  {
    id: "metric-card",
    name: "Metric card",
    category: "Cards",
  },
  {id:'cards',name:'Card gallery',category:'Cards'},
  ...cardIndex,
  ...advancedChartIndex,
  {
    id: "card",
    name: "Card",
    category: "Cards",
  },
  {
    id: "button",
    name: "Buttons",
    category: "Actions",
  },
  {
    id: "input",
    name: "Text fields",
    category: "Forms",
  },
  { id: "form", name: "Form validation", category: "Forms" },
  {
    id: "select",
    name: "Select",
    category: "Forms",
  },
  { id: "radio", name: "Radio group", category: "Forms" },
  {
    id: "code-editor",
    name: "Code editor",
    category: "Forms",
  },
  {id:'wysiwyg',name:'WYSIWYG editor',category:'Forms'},
  {
    id: "slider",
    name: "Slider",
    category: "Forms",
  },
  {
    id: "switch",
    name: "Switch & checkbox",
    category: "Forms",
  },
  {
    id: "tabs",
    name: "Tabs",
    category: "Navigation",
  },
  {
    id: "dialog",
    name: "Dialog",
    category: "Feedback",
  },
  {
    id: "badge",
    name: "Badges",
    category: "Feedback",
  },
  {
    id: "alert",
    name: "Alerts",
    category: "Feedback",
  },
  {
    id: "empty-state",
    name: "Empty state",
    category: "Feedback",
  },
  {
    id: "skeleton",
    name: "Loading skeleton",
    category: "Feedback",
  },
  {
    id: "progress",
    name: "Progress",
    category: "Feedback",
  },
];
