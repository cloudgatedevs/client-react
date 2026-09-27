import type { ComponentType, Context, DependencyList, ReactNode, RefObject } from 'react';
import type { AppearanceValues, CloudgatePlatform, IdpProfile, IdpRolePermission, AppIdentity } from './platform.js';
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
export function CloudgateBackoffice(props: { client: CloudgatePlatform; metadata?: AppMetadata; navigation?: NavigationItem[]; children?: ReactNode; fallback?: string; developerMode?: boolean; basePath?: string; publicHome?: ReactNode; publicRoutes?: ReactNode }): ReactNode;
export function useCloudgate(): CloudgateContextValue;
export const PLATFORM_NAV: NavigationItem[];
export interface AuthContextValue {
  loading: boolean; auth?: CloudgateSession; error?: Error | null;
  currentUser?: { user: { id: string | number; name: string; surname: string; emailAddress: string; userName: string; photoUrl?: string; role?: string | null; rolePermissions?: IdpRolePermission[]; isEmailConfirmed?: boolean | null; promptForEmailVerification?: boolean }; tenant: { tenancyName: string } };
  headerUser?: AuthContextValue['currentUser']; logout(redirect?: boolean): void;
  updateUser(values: Pick<IdpProfile, 'name' | 'surname' | 'email'>): Promise<void>; refreshLoginDetails(options?: { silent?: boolean }): Promise<IdpProfile | undefined>;
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
export function useNotifications(): { api: CloudgatePlatform['notifications']; unread: number; revision: number; connection: string; refresh(): Promise<void> };
export function NotificationBell(): ReactNode;
export function EmailVerificationPrompt(): ReactNode;
export function Layout(props?: { developerMode?: boolean }): ReactNode;
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
