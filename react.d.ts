import type { ComponentType, Context, DependencyList, ReactNode, RefObject } from 'react';
import type { AppearanceValues, CloudgatePlatform, IdpProfile, IdpRolePermission, AppIdentity, AgentsChangedMessage, AgentWatchRoute, BackofficeAgent, BackofficeAgentsOverview, BackofficeInsight } from './platform.js';
import type { CloudgateSession } from './index.js';
export { getProfileDisplayName, getProfilePictureSrc } from './platform.js';
export interface NavigationBase {
  label: string; icon?: ComponentType<any>; group?: string; keywords?: string[];
  permission?: string;
  /** Reserved for SDK controls; application items belong to the default app section. */
  section?: 'app' | 'platform';
}
export interface NavigationLink extends NavigationBase { to: string; end?: boolean; id?: string; children?: never }
export interface NavigationGroup extends NavigationBase {
  /** Stable ID, unique among siblings, used to remember expansion state. */
  id: string; children: NavigationItem[]; defaultExpanded?: boolean; to?: never;
}
export type NavigationItem = NavigationLink | NavigationGroup;
export interface AppMetadata { name?: string; description?: string; version?: string; [key: string]: unknown }
export interface CloudgateContextValue { client: CloudgatePlatform; metadata: AppMetadata; navigation: NavigationItem[]; identity: AppIdentity | null; basePath: string; publicWebsite: boolean; backofficePath(path?: string): string }
export function CloudgateProvider(props: { client: CloudgatePlatform; metadata?: AppMetadata; navigation?: NavigationItem[]; children?: ReactNode; basePath?: string; publicWebsite?: boolean }): ReactNode;
export function CloudgateBackoffice(props: { client: CloudgatePlatform; metadata?: AppMetadata; navigation?: NavigationItem[]; children?: ReactNode; fallback?: string; developerMode?: boolean; /** Show AI agent icons in the bottom bar to users with a linked Cloudgate account (default true). */ agents?: boolean; basePath?: string; publicHome?: ReactNode; publicRoutes?: ReactNode }): ReactNode;
export function useCloudgate(): CloudgateContextValue;
export const PLATFORM_NAV: NavigationItem[];
export interface AuthContextValue {
  loading: boolean; auth?: CloudgateSession; error?: Error | null;
  currentUser?: { user: { id: string | number; name: string; surname: string; emailAddress: string; userName: string; photoUrl?: string; role?: string | null; rolePermissions?: IdpRolePermission[]; isEmailConfirmed?: boolean | null; promptForEmailVerification?: boolean }; tenant: { tenancyName: string } };
  headerUser?: AuthContextValue['currentUser']; logout(redirect?: boolean): void;
  updateUser(values: Pick<IdpProfile, 'name' | 'surname' | 'email'>): Promise<void>; refreshLoginDetails(options?: { silent?: boolean }): Promise<IdpProfile | undefined>;
  /** True when a session was lost without signing out (the token could not be refreshed). */
  sessionEnded: boolean; acknowledgeSessionEnd(): void;
  updateProfilePicture(file: Blob | null): Promise<void>;
}
export const AuthContext: Context<AuthContextValue | null>;
export function AuthProvider(props: { children?: ReactNode; publicAccess?: boolean; onLogoutRedirect?: () => void }): ReactNode;
export function useAuthContext(): AuthContextValue;
export function usePermissions(): { can(permission: string): boolean; permissions: IdpRolePermission[] };
export function RequireAuth(props: { children?: ReactNode }): ReactNode;
export function RequireAdmin(): ReactNode;
export function Profile(): ReactNode;
export function CloudgateAccountLink(): ReactNode;
export function SettingsProvider(props: { children?: ReactNode; publicAccess?: boolean }): ReactNode;
export function useSettings(): { settings: AppearanceValues; allowSelfRegistration: boolean; loading: boolean; error: Error | null; save(values: AppearanceValues): Promise<AppearanceValues>; reload(): void };
export function NotificationsProvider(props: { children?: ReactNode }): ReactNode;
export function useNotifications(): { api: CloudgatePlatform['notifications']; unread: number; revision: number; connection: string; refresh(): Promise<void>; onAgentsChanged(listener: (message: AgentsChangedMessage) => void): () => void };
export function NotificationBell(): ReactNode;
export interface ToastOptions { id?: string; title?: ReactNode; description?: ReactNode; tone?: 'info' | 'success' | 'warning' | 'danger'; duration?: number; action?: { label: ReactNode; onClick?: () => void }; icon?: ComponentType<any> }
export function ToastProvider(props: { children?: ReactNode; max?: number }): ReactNode;
/** Null outside a ToastProvider. */
export function useToast(): { toast(options: ToastOptions): string; dismiss(id: string): void } | null;
export type AgentsAccessStatus = 'idle' | 'loading' | 'ready' | 'unlinked' | 'forbidden' | 'unavailable' | 'error';
export interface AgentsContextValue {
  /** True once the signed-in user's linked Cloudgate account can see at least one agent. */
  available: boolean; /** The viewer may use agents but the app has none yet. */ empty: boolean; status: AgentsAccessStatus; overview: BackofficeAgentsOverview | null; agents: BackofficeAgent[];
  counts: { critical: number; warning: number; info: number; total: number }; revision: number; canApprove: boolean; canChat: boolean; myPersonId: number | null;
  attention: { items: BackofficeInsight[]; totalCount: number; loading: boolean; error: Error | null };
  refresh(): Promise<void>;
  acknowledge(id: string): Promise<void>; dismiss(id: string): Promise<void>; reopen(id: string): Promise<void>; approve(id: string): Promise<void>;
  /** The agent whose chat bubble is open, if any. */
  chatAgentId: string | null; openChat(agentId: string): void; closeChat(): void; toggleChat(agentId: string): void;
  /** True when the linked account may attach agents (the approve permission). */
  canWatch: boolean; watchRevision: number;
  drag: { agent: BackofficeAgent; mode: 'drag' | 'pick'; point?: { x: number; y: number } } | null;
  beginDrag(agent: BackofficeAgent, point: { x: number; y: number }): void; beginPick(agent: BackofficeAgent): void; endDrag(): void;
  watch: AgentWatchRequest | null; openWatch(request: AgentWatchRequest): void; closeWatch(): void; watchChanged(): void;
  api: CloudgatePlatform['agents'];
}
export interface AgentWatchRequest { agent: BackofficeAgent; targets: AgentWatchRoute[]; label?: string; page?: boolean; endpointId?: string; /** Set for an element that declares no workflow: the dialog ranks the app's workflows for it. */ auto?: { kind: 'action' | 'data'; label: string; context?: string; routes?: string }; /** Open on the live watch or the scheduled check. */ mode?: 'runs' | 'schedule' }
/** Drag ghost, drop-target highlight and the marks on watched elements. Mounted by Layout. */
export function AgentWatchLayer(): ReactNode;
/** The "Watch settings" dialog: the instruction for one workflow, watched on every run or checked on a schedule. Mounted by Layout. */
export function AgentWatchDialog(): ReactNode;
export { agentWatchProps } from './platform.js';
/** Mounted by Layout; wrap your own tree only when rendering the agent icons outside the SDK layout. */
export function AgentsProvider(props: { children?: ReactNode; enabled?: boolean; toasts?: boolean }): ReactNode;
/** Null outside an AgentsProvider. */
export function useAgents(): AgentsContextValue | null;
/** One icon per agent with a hover name and a notification badge; a click opens that agent's chat bubble. */
/** The phone button beside the agents; opens the dialog with the store QR codes for the Cloudgate Metrics app. */
export function MetricsAppButton(props?: { disabled?: boolean; onDisabledClick?: () => void }): ReactNode;
/** Store tabs (Google Play, iOS App Store, AppGallery), each with a QR code to scan and a link to open. */
export function MetricsAppDialog(props: { open: boolean; onClose: () => void }): ReactNode;
export function AgentDockIcons(props?: { /** Grey the icons out, as the developer bar does while its workspace is open. */ disabled?: boolean; /** Called when a greyed-out icon is clicked. */ onDisabledClick?: () => void; /** Shows a dashed "Create agent" circle when the app has no agents yet. */ onCreate?: () => void }): ReactNode;
/** The agent icons in a dark bottom bar of their own, used when the developer bar is not shown. */
export function AgentsBar(): ReactNode;
/** The animated chat bubble for the agent picked in the bar. It is the agent's normal chat group. */
export function AgentChatBubble(): ReactNode;
export function AgentAvatar(props: { src?: string | null; color?: string | null; name?: string | null; size?: number; className?: string }): ReactNode;
export function EmailVerificationPrompt(): ReactNode;
export function Layout(props?: { developerMode?: boolean; agents?: boolean }): ReactNode;
export function PlaceholderPage(props: { title: string; subtitle?: string; icon: ComponentType<any>; heading: string; description: string }): ReactNode;
export function useAsync<T>(fn: () => Promise<T>, deps?: DependencyList): { data: T | null; loading: boolean; error: Error | null; reload(): void };
export function Spinner(): ReactNode;
export function ErrorNote(props: { error?: Error | string | null }): ReactNode;
export function StatCard(props: { label: string; value?: ReactNode; sub?: ReactNode; icon?: ComponentType<any> }): ReactNode;
export function Badge(props: { tone?: string; children?: ReactNode }): ReactNode;
export function Table<T extends Record<string, any>>(props: { columns: Array<{ key: string; label: string; render?: (row: T) => ReactNode; mobile?: string }>; rows: T[]; empty?: string; rowHref?: (row: T) => string }): ReactNode;
export function Pager(props: { page: number; pages: number; total: number; from: number; to: number; noun?: string; onPage(page: number): void; children?: ReactNode }): ReactNode;
export function SearchBar(props: { value: string; onChange: (value: string) => void; onSubmit?: () => void; onClear?: () => void; placeholder?: string; mono?: boolean; children?: ReactNode }): ReactNode;
export function PageHead(props: { title: string; subtitle?: string; children?: ReactNode }): ReactNode;
export function utcDate(value: string | number | Date): Date | null;
export function fmtDate(value: string | number | Date): string;
export function fmtCurrency(value: number, currency?: string): string;
export function Field(props: { label: string; id?: string; hint?: string; children?: ReactNode }): ReactNode;
export function Notice(props: { children?: ReactNode; error?: boolean }): ReactNode;
export function Modal(props: { open: boolean; title: string; description?: string; onClose?: () => void; onAfterClose?: () => void; returnFocusRef?: RefObject<HTMLElement | null>; onEscapeKeyDown?: (event: KeyboardEvent) => void; children?: ReactNode }): ReactNode;
export function AppVersion(props: { prefix?: string; title?: string; className?: string }): ReactNode;
export function PoweredByCloudgate(props: { onOpen?: () => void; href?: string; showVersion?: boolean; className?: string }): ReactNode;
export function CloudgateAbout(props: { appName?: string; appVersion?: string; description?: string; showTitle?: boolean }): ReactNode;
