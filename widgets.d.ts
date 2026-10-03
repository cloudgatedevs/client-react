import type * as React from "react";
export type Tone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";
export type Icon = React.ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;
export interface ScrumColumn {id:string;title:string;tone?:Tone;/** Advisory work-in-progress limit. */ limit?:number;}
export interface ScrumAssignee {id:string;name:string;avatar?:string;}
export interface ScrumCard {
  id:string;columnId:string;title:string;reference?:string;description?:string;
  priority?:'low'|'medium'|'high'|'urgent';tags?:string[];assignees?:ScrumAssignee[];
  /** YYYY-MM-DD calendar date, or a date-time string. */ dueDate?:string;
  checklist?:{completed:number;total:number};comments?:number;
}
export interface ScrumMove<T extends ScrumCard=ScrumCard> {
  card:T;cardId:string;fromColumnId:string;toColumnId:string;fromIndex:number;
  /** Zero-based insertion position after removing the moving card. */ toIndex:number;
}
export interface ScrumBoardProps<T extends ScrumCard=ScrumCard> {
  columns:ScrumColumn[];cards:T[];title?:string;description?:string;initialView?:'board'|'list';
  /** Controlled change. Return the save promise and update cards only after success. Reject to show an error. */
  onCardsChange?:(cards:T[],move:ScrumMove<T>)=>void|Promise<void>;
  onCardClick?:(card:T)=>void;onAddCard?:(columnId:string)=>void;
  searchable?:boolean;showAssigneeFilter?:boolean;maxColumnHeight?:number|string;locale?:string;
  /** Presentational contents; do not nest controls when onCardClick wraps them in a button. */ renderCard?:(card:T)=>React.ReactNode;
  loading?:boolean;error?:Error|string|null;onRetry?:()=>void;readOnly?:boolean;disabled?:boolean;className?:string;
}
export function ScrumBoard<T extends ScrumCard=ScrumCard>(props:ScrumBoardProps<T>):React.JSX.Element;
export const KanbanBoard:typeof ScrumBoard;
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export interface CalendarEvent {
  id:string | number;
  title:string;
  /** YYYY-MM-DD for all-day events; ISO date-time or Date for timed events. */
  start:string | Date;
  /** Exclusive end. Omitted events last one day or one hour, respectively. */
  end?:string | Date;
  allDay?:boolean;
  tone?:Tone;
  description?:string;
  [key:string]:unknown;
}
export interface CalendarRange {start:string;end:string;timeZone:string;view:CalendarView;}
export interface CalendarProps<T extends CalendarEvent=CalendarEvent> {
  events?:T[];
  /** Return all events overlapping the visible range. Forward signal to the authorized API. */
  loadEvents?:(range:{start:string;end:string;timeZone:string;signal:AbortSignal})=>Promise<T[]>;
  reloadKey?:unknown;
  initialDate?:string | Date;
  initialView?:CalendarView;
  views?:CalendarView[];
  onEventClick?:(event:T)=>void;
  onDateClick?:(selection:{date:string;allDay:boolean})=>void;
  onRangeSelect?:(selection:{start:string;end:string;allDay:boolean})=>void;
  onRangeChange?:(range:CalendarRange)=>void;
  locale?:string;
  timeZone?:string;
  firstDay?:0|1|2|3|4|5|6;
  weekends?:boolean;
  height?:number|string;
  maxEventsPerDay?:number;
  loading?:boolean;
  error?:string;
  onRetry?:()=>void;
  disabled?:boolean;
  readOnly?:boolean;
  label?:string;
  className?:string;
}
export function Calendar<T extends CalendarEvent=CalendarEvent>(props:CalendarProps<T>):React.JSX.Element;
export interface IconLibraryProps {
  initialSearch?: string;
  defaultIcon?: string;
  /** Called when a user chooses an icon from the installed Lucide collection. */
  onSelect?: (selection: { name: string; icon: Icon }) => void;
  className?: string;
}
export function IconLibrary(props: IconLibraryProps): React.JSX.Element;
export type TextTone = 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
export type TextAlign = 'start' | 'center' | 'end';
export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Semantic heading level, independent of visual size. Defaults to 2. */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  tone?: TextTone;
  align?: TextAlign;
  balance?: boolean;
}
export const Heading: React.ForwardRefExoticComponent<HeadingProps & React.RefAttributes<HTMLHeadingElement>>;
export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'span' | 'p' | 'div' | 'small' | 'strong' | 'em';
  variant?: 'body' | 'lead' | 'small' | 'caption' | 'label' | 'overline';
  tone?: TextTone;
  align?: TextAlign;
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  /** Limit line length to 65ch. Defaults to false. */
  measure?: boolean;
}
export const Text: React.ForwardRefExoticComponent<TextProps & React.RefAttributes<HTMLElement>>;
export const Paragraph: React.ForwardRefExoticComponent<Omit<TextProps, 'as'> & React.RefAttributes<HTMLParagraphElement>>;
export const TextLink: React.ForwardRefExoticComponent<React.AnchorHTMLAttributes<HTMLAnchorElement> & React.RefAttributes<HTMLAnchorElement>>;
export interface TextListProps extends React.HTMLAttributes<HTMLOListElement | HTMLUListElement> {
  ordered?: boolean;
  compact?: boolean;
  tone?: TextTone;
  start?: number;
  reversed?: boolean;
}
export const TextList: React.ForwardRefExoticComponent<TextListProps & React.RefAttributes<HTMLOListElement | HTMLUListElement>>;
export const Blockquote: React.ForwardRefExoticComponent<React.BlockquoteHTMLAttributes<HTMLQuoteElement> & { attribution?: React.ReactNode } & React.RefAttributes<HTMLQuoteElement>>;
export const InlineCode: React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLElement> & React.RefAttributes<HTMLElement>>;
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "neutral" | "success" | "warning" | "danger" | "info" | "ghost" | "link";
  /** Override the default visual weight. Ghost and link remain quiet styles. */
  appearance?: "solid" | "soft" | "outline";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: Icon;
  iconPosition?: "start" | "end";
}
export const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;
export const IconButton: React.ForwardRefExoticComponent<
  Omit<ButtonProps, "children"> & {
    label: string;
    icon: Icon;
  } & React.RefAttributes<HTMLButtonElement>
>;
export function Badge(
  props: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone; dot?: boolean },
): React.JSX.Element;
export function Card(
  props: Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    footer?: React.ReactNode;
    loading?: boolean;
  },
): React.JSX.Element;
export function MetricCard(props: {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  trend?: React.ReactNode;
  tone?: Tone;
  icon?: Icon;
  loading?: boolean;
  formatValue?: (value: number) => string;
  animate?: boolean;
  duration?: number;
  children?: React.ReactNode;
  className?: string;
}): React.JSX.Element;
export function CountUp(props: {
  value: number;
  formatValue?: (value: number) => string;
  animate?: boolean;
  duration?: number;
  loading?: boolean;
  className?: string;
}): React.JSX.Element;
export interface CardAction {
  label: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
  href?: string;
  icon?: Icon;
  variant?: ButtonProps['variant'];
  appearance?: ButtonProps['appearance'];
  disabled?: boolean;
  loading?: boolean;
}
export interface CardImage {src:string;alt:string;position?:string;}
export interface AppCardProps {
  title?: string;
  titleHref?: string;
  description?: React.ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  action?: CardAction;
  secondaryAction?: CardAction;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Disables built-in controls. Custom content must handle its own disabled state. */
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}
export interface MediaCardProps {image?:CardImage;media?:React.ReactNode;}
export interface CardRatingProps {rating?:number;reviewCount?:number;}
export interface CardMoneyProps {price?:number;currency?:string;locale?:string;}
export function CardGrid(props:{children?:React.ReactNode;minCardWidth?:number;className?:string;style?:React.CSSProperties}):React.JSX.Element;
export interface ProductCardProps extends AppCardProps, MediaCardProps, CardRatingProps, CardMoneyProps {
  title:string;category?:React.ReactNode;badge?:React.ReactNode;compareAtPrice?:number;available?:boolean;saved?:boolean;onSavedChange?:(saved:boolean)=>void;
}
export function ProductCard(props:ProductCardProps):React.JSX.Element;
export interface CourseCardProps extends AppCardProps, MediaCardProps, CardRatingProps {
  title:string;instructor?:string;instructorAvatar?:string;level?:React.ReactNode;lessons?:number;duration?:React.ReactNode;progress?:number;
}
export function CourseCard(props:CourseCardProps):React.JSX.Element;
export interface MetricChartCardProps extends AppCardProps {
  title:string;value?:React.ReactNode;formatValue?:(value:number)=>string;trend?:React.ReactNode;trendTone?:Tone;comparison?:React.ReactNode;
  data?:Record<string,unknown>[];series?:ChartSeries[];xKey?:string;chartType?:'line'|'bar';animate?:boolean;showDataTable?:boolean;
}
export function MetricChartCard(props:MetricChartCardProps):React.JSX.Element;
export interface TimelineCardProps extends AppCardProps {
  title:string;icon?:Icon;tone?:Tone;time?:React.ReactNode;dateTime?:string;actor?:string;actorAvatar?:string;status?:React.ReactNode;tags?:string[];
}
export function TimelineCard(props:TimelineCardProps):React.JSX.Element;
export interface TimelineItem extends TimelineCardProps {
  id:string;
  state?:'complete'|'current'|'upcoming'|'blocked';
  details?:React.ReactNode;
  detailsLabel?:string;
}
export interface TimelineProps {
  /** Supplied order is preserved. IDs must be unique strings. */ items?:TimelineItem[];
  label?:string;variant?:'cards'|'activity'|'alternating';orientation?:'vertical'|'horizontal';
  groupByDay?:boolean;locale?:string;timeZone?:string;headingLevel?:2|3|4|5|6;
  loading?:boolean;error?:Error|string|null;onRetry?:()=>void;disabled?:boolean;
  emptyTitle?:string;emptyDescription?:string;className?:string;
  hasMore?:boolean;onLoadMore?:()=>void|Promise<void>;loadingMore?:boolean;loadMoreLabel?:string;
}
export function Timeline(props:TimelineProps):React.JSX.Element;
export interface ArticleCardProps extends AppCardProps, MediaCardProps {
  title:string;category?:React.ReactNode;author?:string;authorAvatar?:string;publishedAt?:React.ReactNode;dateTime?:string;readingTime?:React.ReactNode;tags?:string[];
}
export function ArticleCard(props:ArticleCardProps):React.JSX.Element;
export interface ProfileCardProps extends AppCardProps {
  name:string;avatar?:string;role?:React.ReactNode;location?:React.ReactNode;status?:React.ReactNode;statusTone?:Tone;tags?:string[];
  stats?:{label:string;value:React.ReactNode;formatValue?:(value:number)=>string}[];animate?:boolean;
}
export function ProfileCard(props:ProfileCardProps):React.JSX.Element;
export interface ProjectCardProps extends AppCardProps {
  title:string;status?:React.ReactNode;statusTone?:Tone;progress?:number;dueDate?:React.ReactNode;tags?:string[];team?:{id?:string;name:string;avatar?:string}[];
}
export function ProjectCard(props:ProjectCardProps):React.JSX.Element;
export interface TaskCardProps extends AppCardProps {
  title:string;checked?:boolean;onCheckedChange?:(checked:boolean)=>void;priority?:React.ReactNode;priorityTone?:Tone;assignee?:string;assigneeAvatar?:string;dueDate?:React.ReactNode;tags?:string[];
}
export function TaskCard(props:TaskCardProps):React.JSX.Element;
export interface EventCardProps extends AppCardProps, MediaCardProps {
  title:string;date?:string;locale?:string;time?:React.ReactNode;location?:React.ReactNode;attendees?:number;category?:React.ReactNode;
}
export function EventCard(props:EventCardProps):React.JSX.Element;
export interface PricingCardProps extends AppCardProps, CardMoneyProps {
  name:string;period?:React.ReactNode;features?:(string | {label:React.ReactNode;included?:boolean})[];featured?:boolean;badge?:React.ReactNode;
}
export function PricingCard(props:PricingCardProps):React.JSX.Element;
export interface FileCardProps extends AppCardProps {
  name:string;fileType?:React.ReactNode;size?:React.ReactNode;updatedAt?:React.ReactNode;owner?:React.ReactNode;icon?:Icon;tags?:string[];
}
export function FileCard(props:FileCardProps):React.JSX.Element;
export interface TestimonialCardProps extends AppCardProps {
  name:string;avatar?:string;role?:React.ReactNode;quote:React.ReactNode;rating?:number;
}
export function TestimonialCard(props:TestimonialCardProps):React.JSX.Element;
export interface JobCardProps extends AppCardProps {
  title:string;company?:string;logo?:string;location?:React.ReactNode;employmentType?:React.ReactNode;compensation?:React.ReactNode;postedAt?:React.ReactNode;tags?:string[];
}
export function JobCard(props:JobCardProps):React.JSX.Element;
export interface ListingCardProps extends AppCardProps, MediaCardProps, CardMoneyProps, CardRatingProps {
  title:string;location?:React.ReactNode;priceSuffix?:React.ReactNode;highlights?:string[];saved?:boolean;onSavedChange?:(saved:boolean)=>void;badge?:React.ReactNode;
}
export function ListingCard(props:ListingCardProps):React.JSX.Element;
export interface GoalCardProps extends AppCardProps {
  title:string;value?:number;target?:number;formatValue?:(value:number)=>string;deadline?:React.ReactNode;animate?:boolean;tone?:Tone;
}
export function GoalCard(props:GoalCardProps):React.JSX.Element;
export interface NotificationCardProps extends AppCardProps {
  title:string;time?:React.ReactNode;dateTime?:string;unread?:boolean;tone?:Tone;icon?:Icon;onDismiss?:()=>void;
}
export function NotificationCard(props:NotificationCardProps):React.JSX.Element;
export interface IntegrationCardProps extends AppCardProps {
  name:string;icon?:Icon;status?:React.ReactNode;statusTone?:Tone;account?:React.ReactNode;tags?:string[];
}
export function IntegrationCard(props:IntegrationCardProps):React.JSX.Element;
export interface OrderCardProps extends AppCardProps {
  orderNumber:string;placedAt?:React.ReactNode;status?:React.ReactNode;statusTone?:Tone;deliveryLabel?:React.ReactNode;
  /** amount is the complete line total, not unit price. */
  items?:{id?:string | number;name:string;quantity?:number;amount?:number}[];
  total?:number;currency?:string;locale?:string;
}
export function OrderCard(props:OrderCardProps):React.JSX.Element;
export interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  /** Synchronous custom rule. Return an error message, or undefined when valid. */
  validate?: (value: string, formData?: FormData) => string | undefined;
  validationMessages?: Partial<Record<'required' | 'email' | 'url' | 'invalid' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'step', string>>;
}
export interface FormProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'noValidate'> {
  /** Called only after validation passes. Native navigation is prevented. */
  onSubmit?: (data: FormData, event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}
export const Form: React.ForwardRefExoticComponent<FormProps & React.RefAttributes<HTMLFormElement>>;
export interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: 'jsx' | 'tsx' | 'javascript' | 'typescript' | 'json' | 'html' | 'css' | 'python' | 'sql' | 'text';
  label?: string;
  /** Defaults to true. Set false and supply onChange for controlled editing. */
  readOnly?: boolean;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  copyable?: boolean;
  loading?: boolean;
  minHeight?: string;
  maxHeight?: string;
  className?: string;
}
export interface RichTextSummary {text:string;words:number;characters:number;hasContent:boolean;}
export interface RichTextEditorHandle {focus:()=>void;}
export interface RichTextEditorProps {
  value?:string;
  onChange?:(html:string,summary:RichTextSummary)=>void;
  label?:string;
  id?:string;
  name?:string;
  hint?:React.ReactNode;
  error?:React.ReactNode;
  required?:boolean;
  maxLength?:number;
  validate?:(html:string,data?:FormData)=>string | undefined;
  disabled?:boolean;
  readOnly?:boolean;
  loading?:boolean;
  toolbar?:'basic' | 'standard' | 'full' | 'none';
  placeholder?:string;
  minHeight?:string;
  maxHeight?:string;
  /** Uses the existing Cloudgate React GPL configuration by default. Supply your commercial key when applicable. */
  licenseKey?:string;
  uploadImage?:(file:File,options:{signal:AbortSignal;onProgress:(progress:{loaded:number;total:number})=>void})=>Promise<{url:string}>;
  onPendingChange?:(pending:boolean)=>void;
  onError?:(error:Error)=>void;
  onBlur?:(html:string)=>void;
  className?:string;
}
export const RichTextEditor:React.ForwardRefExoticComponent<RichTextEditorProps & React.RefAttributes<RichTextEditorHandle>>;
export const WysiwygEditor:typeof RichTextEditor;
export function RichTextContent(props:{value?:string;label?:string;className?:string}):React.JSX.Element;
export function CodeEditor(props: CodeEditorProps): React.JSX.Element;
export const Input: React.ForwardRefExoticComponent<
  React.InputHTMLAttributes<HTMLInputElement> &
    FieldProps & { icon?: Icon; endAdornment?: React.ReactNode } & React.RefAttributes<HTMLInputElement>
>;
export interface SearchOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
}
export interface SearchSelectProps extends FieldProps {
  options?: SearchOption[];
  loadOptions?: (query: {search: string; limit: number; signal: AbortSignal}) => Promise<SearchOption[]>;
  value?: string | number | null;
  defaultValue?: string | number;
  /** Supplies the label for an existing remote ID before a search returns it. */
  selectedOption?: SearchOption;
  onChange?: (value: string | number, option: SearchOption | null) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  debounceMs?: number;
  minSearchLength?: number;
  limit?: number;
  reloadKey?: string | number;
  'aria-label'?: string;
}
export const SearchSelect: React.ForwardRefExoticComponent<SearchSelectProps & React.RefAttributes<HTMLInputElement>>;
export interface RadioOption {
  value: string | number;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}
export interface RadioGroupProps extends FieldProps {
  /** Unique non-empty string or finite number values. Zero is supported. */
  options: RadioOption[];
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: (value: string | number, option: RadioOption) => void;
  /** Native form field name. Defaults to a unique generated group name. */
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'cards';
  orientation?: 'vertical' | 'horizontal';
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  'aria-label'?: string;
  'aria-describedby'?: string;
}
/** The forwarded ref focuses the first enabled radio. */
export const RadioGroup: React.ForwardRefExoticComponent<RadioGroupProps & React.RefAttributes<HTMLInputElement>>;
export const Textarea: React.ForwardRefExoticComponent<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> &
    FieldProps &
    React.RefAttributes<HTMLTextAreaElement>
>;
export const Select: React.ForwardRefExoticComponent<
  React.SelectHTMLAttributes<HTMLSelectElement> &
    FieldProps & {
      options: { value: string | number; label: string; disabled?: boolean }[];
      placeholder?: string;
    } & React.RefAttributes<HTMLSelectElement>
>;
export const Checkbox: React.ForwardRefExoticComponent<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label?: React.ReactNode;
    hint?: React.ReactNode;
    indeterminate?: boolean;
  } & React.RefAttributes<HTMLInputElement>
>;
export function Switch(
  props: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
    label: React.ReactNode;
    hint?: React.ReactNode;
    /** Track and thumb size. Defaults to md. */
    size?: "sm" | "md" | "lg";
    checked: boolean;
    onChange: (checked: boolean) => void;
  },
): React.JSX.Element;
export function Slider(
  props: Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value" | "min" | "max" | "step"
  > & {
    label: string;
    hint?: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    formatValue?: (value: number) => string;
  },
): React.JSX.Element;
export interface TabItem {
  value: string;
  label: React.ReactNode;
  content?: React.ReactNode;
  icon?: Icon;
  count?: number;
  disabled?: boolean;
}
export function Tabs(props: {
  label?: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  /** Segmented preserves the original appearance. */
  variant?: 'segmented' | 'underline' | 'pills' | 'outline' | 'enclosed';
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Manual moves focus with arrows; Enter/Space activates. Defaults automatic. */
  activationMode?: 'automatic' | 'manual';
  /** Hidden panels retain their state by default; false unmounts inactive contents. */
  keepMounted?: boolean;
  disabled?: boolean;
  dir?: 'ltr' | 'rtl';
  className?: string;
}): React.JSX.Element;
export function Alert(props: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  tone?: Tone;
  action?: React.ReactNode;
  onDismiss?: () => void;
}): React.JSX.Element;
export function EmptyState(props: {
  title?: string;
  description?: string;
  icon?: Icon;
  action?: React.ReactNode;
}): React.JSX.Element;
export class ErrorBoundary extends React.Component<{
  children?: React.ReactNode;
  /** Replaces the default alert. A function receives the error and a reset callback. */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  title?: string;
  description?: string;
  /** Changing this value (a route path, a record id) clears a caught error. */
  resetKey?: unknown;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}> {}
export function Disclosure(props: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  /** Controlled state; omit to let the widget manage it from defaultOpen. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controls at the right of the header, outside the toggle button. */
  actions?: React.ReactNode;
  /** Defaults to true: children mount on first open and stay mounted afterwards. */
  lazy?: boolean;
  icon?: Icon;
  className?: string;
  id?: string;
}): React.JSX.Element;
export function Skeleton(props: {
  width?: React.CSSProperties["width"];
  height?: React.CSSProperties["height"];
  className?: string;
  style?: React.CSSProperties;
}): React.JSX.Element;
export function Progress(props: {
  label: string;
  value?: number;
  max?: number;
  showValue?: boolean;
  tone?: Tone;
  animate?: boolean;
}): React.JSX.Element;
export function WidgetSkeleton(props: {
  variant?: 'card' | 'metric' | 'chart' | 'donut';
  label?: string;
  height?: React.CSSProperties['height'];
  className?: string;
}): React.JSX.Element;
export function Dialog(props: {
  open: boolean;
  /** Override focus restoration after dismissal; call preventDefault when handling it. */
  onCloseAutoFocus?: (event: Event) => void;
  onClose?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}): React.JSX.Element;
export type RowId = string | number;
export interface TableSort {
  key: string;
  direction: "asc" | "desc";
}
export interface TableQuery {
  page: number;
  pageSize: number;
  search: string;
  sort: TableSort | null;
  filters: Record<string, unknown>;
  advancedFilters: AdvancedTableFilters;
  signal: AbortSignal;
}
export type TableFilterType = 'text' | 'number' | 'date' | 'select';
export interface TableFilterField {
  key: string;
  label: string;
  type?: TableFilterType;
  options?: {value: string | number; label: string}[];
}
export interface TableFilterRule {
  field: string;
  type: TableFilterType;
  operator: 'contains' | 'equals' | 'startsWith' | 'empty' | 'notEmpty' | 'gte' | 'lte' | 'between' | 'on' | 'before' | 'after' | 'in' | 'notIn';
  value?: string | number | (string | number)[];
  valueTo?: string | number;
}
export interface AdvancedTableFilters {
  match: 'all' | 'any';
  rules: TableFilterRule[];
}
export interface TableColumn<T> {
  key: string;
  label: string;
  accessor?: (row: T) => unknown;
  render?: (value: any, row: T) => React.ReactNode;
  compare?: (left: any, right: any, a: T, b: T) => number;
  sortable?: boolean;
  searchable?: boolean;
  align?: "left" | "center" | "right";
  width?: React.CSSProperties["width"];
  exportable?: boolean;
  exportLabel?: string;
  exportValue?: (row: T) => string | number | boolean | Date | null | undefined;
  exportFormat?: string;
  /** Excel column width in characters. */
  exportWidth?: number;
}
export interface TableExportQuery extends TableQuery {
  scope: "all" | "page" | "selected";
  selectedIds: RowId[];
}
export interface TableBulkAction {
  id: string;
  label: string;
  icon?: ButtonProps["icon"];
  variant?: ButtonProps["variant"];
  disabled?: boolean;
  /** All selected IDs, including other pages/filters. Resolve only after the operation succeeds. */
  onAction: (ids: RowId[]) => void | Promise<void>;
  /** Defaults to true. Failed actions keep the selection. */
  clearSelectionOnSuccess?: boolean;
  /** Defaults to true. Reloads remote data after a successful action. */
  refreshOnSuccess?: boolean;
}
export interface AgentWatchFeed { route: string; method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; label?: string }
/** Attributes that make an element a drop target for AI agents. Spread onto a data component or an action button. */
export function agentWatchProps(feed?: string | AgentWatchFeed | null): Record<string, string>;
export interface DataTableProps<T> {
  /** The gateway route that loads these rows. Lets a user drop an AI agent on the table to watch that workflow. */
  feed?: string | AgentWatchFeed;
  columns: TableColumn<T>[];
  rows?: T[];
  loadRows?: (query: TableQuery) => Promise<{ rows: T[]; total: number }>;
  getRowId?: (row: T) => RowId;
  label?: string;
  pageSize?: number;
  pageSizes?: number[];
  initialSort?: TableSort | null;
  searchPlaceholder?: string;
  searchable?: boolean;
  debounceMs?: number;
  filters?: Record<string, unknown>;
  /** Enable the condition builder. Keys match column keys/accessors. */
  filterFields?: TableFilterField[];
  advancedFilters?: AdvancedTableFilters;
  defaultAdvancedFilters?: AdvancedTableFilters;
  onAdvancedFiltersChange?: (filters: AdvancedTableFilters) => void;
  reloadKey?: string | number;
  pagination?: "pages" | "load-more" | "infinite";
  selectable?: boolean;
  selectedIds?: RowId[];
  onSelectionChange?: (ids: RowId[]) => void;
  /** Enable one active row for connected detail widgets. Independent of bulk checkboxes. */
  rowSelectable?: boolean;
  /** Controlled active ID; null clears it. IDs persist across paging/filtering. */
  activeRowId?: RowId | null;
  defaultActiveRowId?: RowId | null;
  /** Called when the user activates a different row, with its ID and current row data. */
  onActiveRowChange?: (id: RowId, row: T) => void;
  getRowCanActivate?: (row: T) => boolean;
  bulkActions?: TableBulkAction[];
  /** Excel export is enabled by default. Exports visible data columns only. */
  exportable?: boolean;
  exportFileName?: string;
  /** Optional specialized export loader. Authorize every row on the server. */
  loadExportRows?: (query: TableExportQuery) => Promise<T[]>;
  /** Mounted only while expanded and visible. Return a nested DataTable for lazy subtables. */
  renderExpandedRow?: (row: T) => React.ReactNode;
  /** compact gives about 30px rows with a smaller toolbar and footer; sub tables in expanded rows are always compact. */
  density?: 'comfortable' | 'compact';
  getRowCanExpand?: (row: T) => boolean;
  /** Accessible row name for selection and expansion controls; defaults to the row ID. */
  getRowLabel?: (row: T) => string | number;
  expandedIds?: RowId[];
  onExpandedChange?: (ids: RowId[]) => void;
  toolbar?: React.ReactNode;
  rowActions?: (row: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  error?: Error | string | null;
  onRetry?: () => void;
  onQueryChange?: (query: TableQuery) => void;
  className?: string;
}
export function DataTable<T>(props: DataTableProps<T>): React.JSX.Element;
export interface ChartSeries {
  key: string;
  label: string;
  /** Optional per-series type for ComboChart. */
  type?: 'line' | 'bar';
}
export interface ChartProps {
  data?: Record<string, unknown>[];
  series: ChartSeries[];
  xKey?: string;
  label?: string;
  formatValue?: (value: number) => string;
  height?: number;
  loading?: boolean;
  showDataTable?: boolean;
  animate?: boolean;
  duration?: number;
}
export function LineChart(props: ChartProps): React.JSX.Element;
export interface AdvancedChartBase {
  label?: string;
  height?: number;
  loading?: boolean;
  error?: Error | string | null;
  showDataTable?: boolean;
  animate?: boolean;
  duration?: number;
  formatValue?: (value:number) => string;
}
export interface SeriesChartProps extends AdvancedChartBase {data?:Record<string,unknown>[];series:ChartSeries[];xKey?:string;}
export interface ValueChartProps extends AdvancedChartBase {data?:Record<string,unknown>[];labelKey?:string;valueKey?:string;}
export interface ScatterChartProps extends ValueChartProps {xKey?:string;yKey?:string;sizeKey?:string;xLabel?:string;yLabel?:string;}
export interface HierarchyNode {name:string;value?:number;children?:HierarchyNode[];}
export interface HierarchyChartProps extends AdvancedChartBase {data?:HierarchyNode[];}
export interface GraphNode {id:string;name?:string;value?:number;}
export interface GraphLink {source:string;target:string;value?:number;}
export interface NetworkChartProps extends AdvancedChartBase {nodes?:GraphNode[];links?:GraphLink[];}
export function AreaChart(props: SeriesChartProps): React.JSX.Element;
export function StackedAreaChart(props: SeriesChartProps): React.JSX.Element;
export function StepLineChart(props: SeriesChartProps): React.JSX.Element;
export function HorizontalBarChart(props: SeriesChartProps): React.JSX.Element;
export function StackedBarChart(props: SeriesChartProps): React.JSX.Element;
export function PercentBarChart(props: SeriesChartProps): React.JSX.Element;
export function PieChart(props: ValueChartProps): React.JSX.Element;
export function RoseChart(props: ValueChartProps): React.JSX.Element;
export function RadarChart(props: SeriesChartProps): React.JSX.Element;
export function ScatterChart(props: ScatterChartProps): React.JSX.Element;
export function BubbleChart(props: ScatterChartProps): React.JSX.Element;
export function HeatmapChart(props: AdvancedChartBase & {data?:{x:string;y:string;value:number}[];valueKey?:string}): React.JSX.Element;
export function CalendarHeatmap(props: AdvancedChartBase & {data?:{date:string;value:number}[];valueKey?:string}): React.JSX.Element;
export function Histogram(props: AdvancedChartBase & {data?:(number | Record<string,unknown>)[];bins?:number;valueKey?:string}): React.JSX.Element;
export function BoxPlotChart(props: AdvancedChartBase & {data?:{label:string;values:number[]}[];labelKey?:string}): React.JSX.Element;
export function WaterfallChart(props: AdvancedChartBase & {data?:{label:string;value:number;total?:boolean}[];labelKey?:string;valueKey?:string}): React.JSX.Element;
export function RangeBarChart(props: AdvancedChartBase & {data?:{label:string;start:number;end:number}[];labelKey?:string}): React.JSX.Element;
export function ComboChart(props: SeriesChartProps): React.JSX.Element;
export function CandlestickChart(props: AdvancedChartBase & {data?:{label:string;open:number;close:number;low:number;high:number}[];labelKey?:string}): React.JSX.Element;
export function FunnelChart(props: ValueChartProps): React.JSX.Element;
export function GaugeChart(props: AdvancedChartBase & {value?:number | null;min?:number;max?:number}): React.JSX.Element;
export function TreemapChart(props: HierarchyChartProps): React.JSX.Element;
export function SunburstChart(props: HierarchyChartProps): React.JSX.Element;
export function SankeyChart(props: NetworkChartProps): React.JSX.Element;
export function GraphChart(props: NetworkChartProps): React.JSX.Element;
export interface NetworkGraphNodeDetail {label:string;value?:string|number|null;}
export interface NetworkGraphNode {id:string;label?:string;sublabel?:string;details?:NetworkGraphNodeDetail[];category?:string;size?:number;[key:string]:unknown;}
export interface NetworkGraphEdge {source:string;target:string;weight?:number;direction?:'forward'|'both'|'none';dashed?:boolean;label?:string;kind?:string;[key:string]:unknown;}
export interface NetworkGraphCategory {id:string;label?:string;}
export interface NetworkGraphProps extends AdvancedChartBase {
  nodes?:NetworkGraphNode[];edges?:NetworkGraphEdge[];categories?:NetworkGraphCategory[];
  focusId?:string|null;selectedId?:string|null;onSelect?:(id:string|null,node:NetworkGraphNode|null)=>void;
  onEdgeSelect?:(source:string,target:string,edge:NetworkGraphEdge)=>void;layout?:'force'|'circular';maxLabelLength?:number;
  emptyTitle?:string;emptyDescription?:string;fitLabel?:string;hint?:string|false;
}
export function NetworkGraph(props: NetworkGraphProps): React.JSX.Element;
export function BarChart(props: ChartProps): React.JSX.Element;
export function DonutChart(
  props: Omit<ChartProps, "series" | "xKey" | "height"> & {
    labelKey?: string;
    valueKey?: string;
  },
): React.JSX.Element;
