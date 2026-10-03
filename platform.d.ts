import type { CloudgateAuth, CloudgateAuthOptions, CloudgateSession } from '@cloudgatedevs/cloudgate-client';
export interface PlatformRequestOptions { method?: string; body?: unknown; signal?: AbortSignal; timeoutMs?: number }
export interface PlatformRequest { <T = Record<string, any>>(path: string, options?: PlatformRequestOptions): Promise<T> }
export class CloudgatePlatformError extends Error {
  status: number; code: string; body?: unknown; url?: string;
  constructor(message: string, info?: { status?: number; code?: string; body?: unknown; url?: string });
}
export function createIdpClient(options: { auth: CloudgateAuth; apiUrl: string; fetchImpl?: typeof fetch; timeoutMs?: number; anonymous?: boolean }): PlatformRequest;
export const createIdpAdminClient: typeof createIdpClient;
export interface AppIdentity { webAppId: string; environment: string }
export interface PublishedApp { webAppId: string; isProduction: boolean }
export type IdentityResolver = () => Promise<AppIdentity>;
export function isWebAppId(value: unknown): boolean;
export function createAppIdentityResolver(options?: { webAppId?: string; environment?: string; resolvePublishedApp?: () => Promise<PublishedApp | null> }): IdentityResolver;
export function createPublishedAnalyticsResolver(options?: { readWindow?: () => unknown; fetchImpl?: typeof fetch }): () => Promise<PublishedApp | null>;
export interface IdpProfile { isEmailConfirmed?: boolean | null; promptForEmailVerification?: boolean; id: number | string; name?: string; surname?: string; email?: string; role?: string | null; rolePermissions?: IdpRolePermission[]; photoUrl?: string | null }
export function normalizeProfile(raw: unknown): IdpProfile;
export function getProfileDisplayName(profile: Partial<IdpProfile>): string;
export function getProfilePictureSrc(profile: Partial<IdpProfile>): string | undefined;
export const PROFILE_PICTURE_MAX_BYTES: number;
export const PROFILE_PICTURE_TYPES: string[];
export interface ProfilePictureResult { profilePictureId: string | null; photoUrl: string | null }
export function createProfileClient(options: { request: PlatformRequest }): {
  get(options?: PlatformRequestOptions): Promise<IdpProfile>;
  resendVerification(options?: PlatformRequestOptions): Promise<{ sent: boolean; isEmailConfirmed: boolean; retryAfterSeconds: number }>;
  update(values: Pick<IdpProfile, 'name' | 'surname' | 'email'>, options?: PlatformRequestOptions): Promise<IdpProfile>;
  uploadPicture(file: Blob, options?: PlatformRequestOptions): Promise<ProfilePictureResult>;
  removePicture(options?: PlatformRequestOptions): Promise<ProfilePictureResult>;
};
export interface AccountLink { linked: boolean; available: boolean; userId?: number | null; displayName?: string | null; email?: string | null; linkedAtUtc?: string | null; photoUrl?: string | null; profilePictureId?: string | null }
export interface AccountLinkTicket { code: string; expiresAt: string; authorizationUrl: string }
export interface DeveloperWorkspaceLaunch { frameUrl: string; frameOrigin: string; projectName: string; appName: string; environment: 'sbx' | 'prod'; controllerId?: string | null; controllerName?: string | null; controllerPath?: string | null }
export function createDeveloperWorkspaceClient(options: { request: PlatformRequest; resolveAppIdentity: IdentityResolver; projectPath?: string }): {
  open(input: { returnUrl: string; sdkVersion?: string; sdkSource?: 'npm' | 'local' }, options?: PlatformRequestOptions): Promise<DeveloperWorkspaceLaunch>;
  sdkStatus(input?: { runningVersion?: string; sdkSource?: 'npm' | 'local' }, options?: PlatformRequestOptions): Promise<{ latestVersion: string | null; checkedAt: string | null; checkError: string | null; updateAvailable: boolean }>;
};
export function isDeveloperWorkspaceMessage(event: MessageEvent, frameWindow: Window | null, frameOrigin: string): boolean;
export interface RegistrationSettings { allowSelfRegistration: boolean; promptForEmailVerification?: boolean; scope: 'tenant' }
export interface EmailTemplateSettings { templateEnabled: boolean; templateHtml: string; scope: 'tenant' }
export const EMAIL_TEMPLATE_MAX_LENGTH: number;
export const EMAIL_TEMPLATE_FIELDS: readonly string[];
export function validateEmailTemplate(values: { templateEnabled: boolean; templateHtml: string }): string | null;
export function createEmailTemplateClient(options: { request: PlatformRequest }): {
  get(options?: PlatformRequestOptions): Promise<EmailTemplateSettings>;
  update(values: { templateEnabled: boolean; templateHtml: string }, options?: PlatformRequestOptions): Promise<EmailTemplateSettings>;
};
export function createRegistrationClient(options: { request: PlatformRequest }): {
  get(options?: PlatformRequestOptions): Promise<RegistrationSettings>;
  update(values: { allowSelfRegistration: boolean; promptForEmailVerification?: boolean }, options?: PlatformRequestOptions): Promise<RegistrationSettings>;
};
export function createAccountLinkClient(options: { request: PlatformRequest }): {
  get(options?: PlatformRequestOptions): Promise<AccountLink>;
  start(input: { returnUrl: string }, options?: PlatformRequestOptions): Promise<AccountLinkTicket>;
  complete(input: { code: string }, options?: PlatformRequestOptions): Promise<AccountLink | { pending: true }>;
  detach(options?: PlatformRequestOptions): Promise<AccountLink>;
};
export type AppearanceValues = Record<string, string>;
export interface AppearanceSnapshot { values: AppearanceValues; revision: string }
export function createAppearanceClient(options: { request: PlatformRequest; publicRequest?: PlatformRequest; webAppId?: string; environment?: string; resolveAppIdentity?: IdentityResolver }): {
  getPublic(): Promise<AppearanceSnapshot & { allowSelfRegistration: boolean }>;
  get(): Promise<AppearanceSnapshot>; save(values: AppearanceValues, revision: string): Promise<AppearanceSnapshot>; reset(revision: string): Promise<AppearanceSnapshot>;
};
export const DEFAULT_SETTINGS: Readonly<AppearanceValues>;
export const THEME_PRESETS: Array<[string, string, string]>;
export type PaletteColorKey = 'theme_primary' | 'theme_secondary' | 'theme_neutral' | 'theme_success' | 'theme_warning' | 'theme_danger' | 'theme_info';
export type PaletteColors = Record<PaletteColorKey, string>;
export interface ThemePalette { id: string; name: string; description: string; colors: PaletteColors }
export interface CustomPalette { name: string; colors: PaletteColors }
export const PALETTE_PRESETS: ThemePalette[];
export const PALETTE_ROLES: Array<{ key: PaletteColorKey; label: string; hint: string }>;
export const PALETTE_COLOR_KEYS: PaletteColorKey[];
export const PALETTE_DEFAULTS: Readonly<PaletteColors & { theme_custom_palette: string }>;
export function paletteColors(values?: Partial<AppearanceValues>): PaletteColors;
export function paletteMatches(left: Partial<AppearanceValues>, right: Partial<AppearanceValues>): boolean;
export function parseCustomPalette(value: unknown): CustomPalette | null;
export function paletteVariables(values?: Partial<AppearanceValues>, dark?: boolean): Record<string, string>;
export function contrastRatio(first: string | number[], second: string | number[]): number;
export type FontId = 'system' | 'inter' | 'roboto' | 'open-sans' | 'source-sans-3' | 'nunito-sans' | 'dm-sans' | 'manrope' | 'plus-jakarta-sans' | 'montserrat' | 'work-sans' | 'lora' | 'source-serif-4' | 'ibm-plex-sans' | 'rubik';
export const FONT_DEFAULTS: Readonly<{ theme_font_body: 'inter'; theme_font_heading: 'inherit' }>;
export const FONT_KEYS: readonly ('theme_font_body' | 'theme_font_heading')[];
export const FONT_OPTIONS: ReadonlyArray<Readonly<{ id: FontId; label: string; category: 'sans-serif' | 'serif'; family: string }>>;
export function isFont(value: unknown, heading?: boolean): boolean;
export function normalizeFonts(values?: Partial<AppearanceValues>): { theme_font_body: FontId; theme_font_heading: FontId | 'inherit' };
export function fontFamily(id: unknown): string;
export function fontVariables(values?: Partial<AppearanceValues>): Record<'--font-body' | '--font-heading', string>;
export const LAYOUT_PRESETS: ReadonlyArray<{ value: 'wide' | 'content' | 'compact' | 'flex'; label: string; description: string; detail: string }>;
export function normalizeDensity(value: unknown): 'wide' | 'content' | 'compact' | 'flex';
export function normalizeSettings(values?: Partial<AppearanceValues>): AppearanceValues;
export function validateSettings(values: AppearanceValues): string | null;
export function isHex(value: unknown): boolean;
export function safeUrl(value: string): boolean;
export function rgb(hex: string): string;
export function foreground(hex: string): string;
export function accentText(hex: string, dark: boolean): string;
export const ADMIN_ROLES: readonly string[];
export function isAdminRole(role: unknown): boolean;
export interface IdpRolePermission { key: string; value: string }
export const BACKOFFICE_PERMISSIONS: Readonly<{
  WidgetsView: 'backoffice.widgets.view';
  Access: 'backoffice.access';
  DashboardView: 'backoffice.dashboard.view';
  OrdersView: 'backoffice.orders.view';
  AnalyticsView: 'backoffice.analytics.view';
  LogsView: 'backoffice.logs.view';
  PaymentsView: 'backoffice.payments.view';
  PaymentsHistory: 'backoffice.payments.history';
  PaymentsTestView: 'backoffice.payments.testView';
  PaymentsTestCreate: 'backoffice.payments.testCreate';
  UsersView: 'backoffice.users.view';
  UsersCreate: 'backoffice.users.create';
  UsersEdit: 'backoffice.users.edit';
  UsersDelete: 'backoffice.users.delete';
  UsersInvite: 'backoffice.users.invite';
  UsersResetPassword: 'backoffice.users.resetPassword';
  UsersAssignRoles: 'backoffice.users.assignRoles';
  RolesView: 'backoffice.roles.view';
  RolesCreate: 'backoffice.roles.create';
  RolesEdit: 'backoffice.roles.edit';
  RolesDelete: 'backoffice.roles.delete';
  RegistrationView: 'backoffice.registration.view';
  RegistrationEdit: 'backoffice.registration.edit';
  NotificationsView: 'backoffice.notifications.view';
  NotificationsSend: 'backoffice.notifications.send';
  SmtpView: 'backoffice.smtp.view';
  SmtpEdit: 'backoffice.smtp.edit';
  SmtpSendTest: 'backoffice.smtp.sendTest';
  SmtpDelete: 'backoffice.smtp.delete';
  EmailTemplateView: 'backoffice.emailTemplate.view';
  EmailTemplateEdit: 'backoffice.emailTemplate.edit';
  MediaView: 'backoffice.media.view';
  MediaUpload: 'backoffice.media.upload';
  MediaDelete: 'backoffice.media.delete';
  BrandingView: 'backoffice.branding.view';
  BrandingEdit: 'backoffice.branding.edit';
  ThemeView: 'backoffice.theme.view';
  ThemeEdit: 'backoffice.theme.edit';
  SettingsView: 'backoffice.settings.view';
  SettingsEdit: 'backoffice.settings.edit';
  DeveloperAccess: 'backoffice.developer.access';
}>;
export const BACKOFFICE_PERMISSION_KEYS: readonly string[];
export const BACKOFFICE_PERMISSION_TREE: Array<{ key?: string; label: string; children?: Array<{ key: string; label: string }> }>;
export function hasBackofficePermission(profile: Pick<IdpProfile, 'rolePermissions'> | null | undefined, permission?: string): boolean;
export function canAccessBackoffice(profile: Pick<IdpProfile, 'rolePermissions'> | null | undefined): boolean;
export function normalizeRolePermissions(entries?: IdpRolePermission[]): IdpRolePermission[];
export interface IdpManagedRole { id: number | null; name: string; isDefault: boolean; userCount: number; permissions: IdpRolePermission[] }
export interface IdpRoleSave { id?: number | null; name: string; permissions: IdpRolePermission[] }
export function createRolesClient(options: { request: PlatformRequest }): {
  list(options?: PlatformRequestOptions): Promise<{ items: IdpManagedRole[] }>;
  options(options?: PlatformRequestOptions): Promise<{ items: Array<{ name: string }> }>;
  create(values: IdpRoleSave, options?: PlatformRequestOptions): Promise<IdpManagedRole>;
  update(values: IdpRoleSave, options?: PlatformRequestOptions): Promise<IdpManagedRole>;
  delete(id: number, options?: PlatformRequestOptions): Promise<{ deleted: boolean }>;
};
export function validateRole(values: IdpRoleSave): string | null;
export const MEDIA_FOLDERS: readonly string[];
export function createFilesClient(options: { request: PlatformRequest; resolveAppIdentity: IdentityResolver; mediaFolder?: string }): {
  list(query?: { path?: string; skip?: number; take?: number; signal?: AbortSignal }): Promise<Record<string, any>>;
  upload(file: File, path?: string, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  delete(id: string, options?: PlatformRequestOptions): Promise<Record<string, any>>;
};
export interface AppInvitationResult { user: Record<string, any>; created: boolean; invitation: { sent: boolean; appName: string; appUrl: string } }
export function createUsersClient(options: { request: PlatformRequest; resolveAppIdentity?: IdentityResolver; readLocation?: () => Pick<Location, 'hostname' | 'protocol' | 'origin'> | undefined }): {
  list(query?: { filter?: string; skip?: number; take?: number }, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  get(id: number, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  create(user: Record<string, unknown>, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  invitationApp(options?: PlatformRequestOptions): Promise<{ webAppId: string; name: string; url: string; isDevelopment?: boolean }>;
  invite(user: { email: string; name?: string; surname?: string; phoneNumber?: string }, options?: PlatformRequestOptions): Promise<AppInvitationResult>;
  resendInvite(id: number, options?: PlatformRequestOptions): Promise<AppInvitationResult>;
  update(user: Record<string, unknown>, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  setRole(id: number, role: string, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  setActive(id: number, isActive: boolean, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  requestPasswordReset(id: number, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  delete(id: number, options?: PlatformRequestOptions): Promise<Record<string, any>>;
};
export function createSmtpClient(options: { request: PlatformRequest }): {
  get(options?: PlatformRequestOptions): Promise<Record<string, any>>;
  update(values: Record<string, unknown>, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  delete(options?: PlatformRequestOptions): Promise<Record<string, any>>;
  sendTest(to: string, options?: PlatformRequestOptions): Promise<Record<string, any>>;
};
export interface CloudgatePayment { id: number; isProduction: boolean; grossAmount: number; applicationFeeAmount: number; currency: string; status: number; reference?: string | null; description?: string | null; paymentUrl?: string | null; refundedAmount: number; creationTime: string; paidAt?: string | null }
export function safePaymentUrl(value: unknown): string | null;
export function createPaymentsClient(options: { request: PlatformRequest; environment?: string; resolveAppIdentity?: IdentityResolver }): {
  status(query?: { environment?: string }): Promise<Record<string, any>>;
  list(query?: { environment?: string; skip?: number; take?: number; status?: number | null }, options?: PlatformRequestOptions): Promise<{ items: CloudgatePayment[]; totalCount: number }>;
  createTest(input: { amount: number; currency: string; description: string; reference?: string; idempotencyKey: string; returnUrl: string }, options?: PlatformRequestOptions): Promise<CloudgatePayment>;
};
export function safeNotificationLink(value: unknown): string | null;
export type NotificationStyle = 'info' | 'success' | 'warning' | 'danger';
export const NOTIFICATION_STYLES: readonly NotificationStyle[];
export interface NotificationDraft {
  allUsers: boolean; userId?: number; title: string; body: string; style?: NotificationStyle;
  actionUrl?: string | null; actionLabel?: string | null;
}
export interface NotificationHistoryItem {
  id: string; title: string; body: string; style: NotificationStyle; creationTime: string;
  actionUrl?: string | null; actionLabel?: string | null; isBroadcast: boolean;
  recipientCount: number; readCount: number; senderIdpUserId?: number | null; workflowNodeId?: string | null;
}
export interface NotificationRecipient { userId: number; email?: string | null; isRead: boolean; readAtUtc?: string | null }
export type NotificationEnvironment = 'sbx' | 'sandbox' | 'prod' | 'production';
export interface NotificationHistoryQuery { environment?: NotificationEnvironment; skip?: number; take?: number }
export function validateNotification(values: NotificationDraft): string | null;
export function createNotificationAdminClient(options: { request: PlatformRequest; resolveAppIdentity: IdentityResolver }): {
  history(query?: NotificationHistoryQuery, options?: PlatformRequestOptions): Promise<{ items: NotificationHistoryItem[]; totalCount: number }>;
  recipients(query: NotificationHistoryQuery & { id: string; isRead?: boolean }, options?: PlatformRequestOptions): Promise<{ items: NotificationRecipient[]; totalCount: number }>;
  send(values: NotificationDraft & { environment: NotificationEnvironment }, options?: PlatformRequestOptions): Promise<{ id: string; recipientCount: number }>;
};
export function notificationAppearance(style: string): Record<string, string>;
export function createNotificationsClient(options: { request: PlatformRequest; resolveAppIdentity: IdentityResolver }): {
  list(query?: { skip?: number; take?: number; unreadOnly?: boolean }): Promise<Record<string, any>>;
  unreadCount(): Promise<{ unreadCount: number }>; read(id: string): Promise<Record<string, any>>; readAll(): Promise<Record<string, any>>;
};
export interface NotificationSocketOptions {
  /** Receives `ready` and `agentsChanged` frames for the AI agents provider. */
  onAgents?: (message: AgentsChangedMessage) => void;
  apiUrl: string; environment: string; getAccessToken: () => Promise<string | null> | string | null;
  onChange: () => void; onStatus?: (status: string) => void; WebSocketImpl?: typeof WebSocket;
  retryDelayMs?: number; heartbeatMs?: number; handshakeMs?: number;
}
export function connectNotificationSocket(options: NotificationSocketOptions): () => void;
export class AppAnalyticsError extends CloudgatePlatformError { constructor(message: string, status?: number, code?: string) }
export class WorkflowLogsError extends CloudgatePlatformError { constructor(message: string, status?: number, code?: string) }
export interface AnalyticsQuery { timePeriod?: number; skip?: number; take?: number; pagePath?: string; signal?: AbortSignal }
export interface FeatureScope { projectPath: string; environment: string; readonly isProduction: boolean; readonly configured: boolean }
export function createAppAnalyticsClient(options: { request?: PlatformRequest; auth?: CloudgateAuth; apiUrl?: string; projectPath?: string; environment?: string; preview?: boolean; fetchImpl?: typeof fetch; resolvePublishedApp?: () => Promise<PublishedApp | null> }): {
  scope: FeatureScope; overview(timePeriod?: number, options?: { signal?: AbortSignal }): Promise<Record<string, any>>;
  pages(query?: AnalyticsQuery): Promise<Record<string, any>>; sessions(query?: AnalyticsQuery): Promise<Record<string, any>>;
};
export function createWorkflowLogsClient(options: { request: PlatformRequest; projectPath?: string; resolveAppIdentity: IdentityResolver }): {
  scope: FeatureScope; list(query?: Record<string, unknown> & { search?: string; signal?: AbortSignal }): Promise<Record<string, any>>;
  summary(periodHours?: number, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  get(id: string, options?: PlatformRequestOptions): Promise<Record<string, any>>;
  nodes(sessionId: string, options?: PlatformRequestOptions): Promise<Array<Record<string, any>>>;
};
export const ANALYTICS_PERIODS: Array<[number, string]>;
export function count(value?: number | null): string;
export function duration(value?: number | null): string;
export function percent(value?: number | null): string;
export function comparison(current?: number | null, previous?: number | null): { text: string; direction: string };
export function countryName(code?: string): string;
export function visitorName(row: Record<string, unknown>): string;
export function analyticsDateRange(period: number, now?: Date): { startDate?: string; endDate?: string };
export interface AccountSecurityStatus { email: string; isEmailConfirmed: boolean; twoFactorEnabled: boolean; recoveryCodesRemaining: number }
export interface TwoFactorChallenge { requiresTwoFactor: true; challengeToken: string }
export interface IdpTokens { accessToken: string; refreshToken: string; expiresIn: number; returnUrl?: string }
export type TwoFactorHandler = (challenge: TwoFactorChallenge) => Promise<IdpTokens>;
export interface SecurityChange { security: AccountSecurityStatus; recoveryCodes: string[] | null; tokens: IdpTokens | null }
export function createAccountSecurityClient(options: { request: PlatformRequest; auth: CloudgateAuth }): {
  get(options?: PlatformRequestOptions): Promise<AccountSecurityStatus>;
  beginSetup(options?: PlatformRequestOptions): Promise<{ manualEntryKey: string; authenticatorUri: string; expiresAtUtc: string; qrCodeDataUrl: string }>;
  confirmSetup(code: string, options?: PlatformRequestOptions): Promise<SecurityChange>;
  disable(code: string, options?: PlatformRequestOptions): Promise<SecurityChange>;
  regenerateRecoveryCodes(code: string, options?: PlatformRequestOptions): Promise<SecurityChange>;
};
export function completeTwoFactorLogin(options: { apiUrl: string; tenancyName: string; challengeToken: string; code: string; fetchImpl?: typeof fetch; signal?: AbortSignal }): Promise<IdpTokens>;
export function consumeLauncherLogin(options: { apiUrl: string; tenancyName: string; webAppId?: string; auth: CloudgateAuth; onTwoFactorRequired?: TwoFactorHandler; fetcher?: typeof fetch; location?: Location; history?: History }): Promise<unknown>;
export interface GatewayRequestOptions { method?: string; params?: Record<string, string | number | boolean | null | undefined>; body?: unknown; headers?: Record<string, string>; timeoutMs?: number; raw?: boolean }
export interface GatewayClient {
  request<T = any>(path: string, options?: GatewayRequestOptions): Promise<T>;
  get<T = any>(path: string, options?: GatewayRequestOptions): Promise<T>;
  post<T = any>(path: string, body?: unknown, options?: GatewayRequestOptions): Promise<T>;
  put<T = any>(path: string, body?: unknown, options?: GatewayRequestOptions): Promise<T>;
  patch<T = any>(path: string, body?: unknown, options?: GatewayRequestOptions): Promise<T>;
  delete<T = any>(path: string, options?: GatewayRequestOptions): Promise<T>;
}
export function createGatewayClient(options: { auth: CloudgateAuth; gatewayUrl: string; environment?: string; resolveAppIdentity?: IdentityResolver; fetchImpl?: typeof fetch; timeoutMs?: number; verifySession?: () => Promise<boolean>;
  /** Gateway API key; with `apiSecret`, requests are signed (X-Api-Key, X-Timestamp, X-Authentication-Signature) in addition to the IdP bearer. */
  apiKey?: string; apiSecret?: string }): GatewayClient;
export interface CloudgatePlatformOptions extends Omit<CloudgateAuthOptions, 'idpBaseUrl'> {
  idpBaseUrl?: string; apiUrl?: string; returnUrl?: string; webAppId?: string; environment?: string;
  projectPath?: string; gatewayUrl?: string; mediaFolder?: string; timeoutMs?: number; auth?: CloudgateAuth;
  /** Workflow-gateway signing credentials for projects that enforce API-key validation (e.g. VITE_API_KEY / VITE_API_SECRET). */
  apiKey?: string; apiSecret?: string;
  resolvePublishedApp?: () => Promise<PublishedApp | null>;
}
export interface CloudgatePlatform {
  config: Readonly<{ idpBaseUrl: string; apiUrl: string; tenancyName: string; returnUrl: string; webAppId: string; environment: string; projectPath: string; gatewayUrl: string; apiKey: string }>;
  auth: CloudgateAuth; request: PlatformRequest; resolveAppIdentity: IdentityResolver;
  /** Workflow gateway calls as the signed-in user: refreshes the bearer, retries one 401, ends a dead session. */
  gateway: GatewayClient;
  profile: ReturnType<typeof createProfileClient>; accountSecurity: ReturnType<typeof createAccountSecurityClient>; accountLink: ReturnType<typeof createAccountLinkClient>;
  developerWorkspace: ReturnType<typeof createDeveloperWorkspaceClient>;
  registration: ReturnType<typeof createRegistrationClient>;
  emailTemplate: ReturnType<typeof createEmailTemplateClient>;
  notificationAdmin: ReturnType<typeof createNotificationAdminClient>;
  appearance: ReturnType<typeof createAppearanceClient>; files: ReturnType<typeof createFilesClient>;
  roles: ReturnType<typeof createRolesClient>;
  users: ReturnType<typeof createUsersClient>; smtp: ReturnType<typeof createSmtpClient>;
  analytics: ReturnType<typeof createAppAnalyticsClient>; logs: ReturnType<typeof createWorkflowLogsClient>;
  payments: ReturnType<typeof createPaymentsClient>;
  notifications: ReturnType<typeof createNotificationsClient> & { connect(options: Omit<NotificationSocketOptions, 'apiUrl' | 'environment' | 'getAccessToken'>): () => void };
  /** AI agents, run on the server as the Cloudgate account linked in the user's profile. */
  agents: AgentsClient;
  initialize(options?: { onTwoFactorRequired?: TwoFactorHandler }): Promise<CloudgateSession | null>; loginUrl(returnUrl?: string): string; login(returnUrl?: string): string; signupUrl(returnUrl?: string): string;
}
export function createCloudgatePlatform(options?: CloudgatePlatformOptions): CloudgatePlatform;
export const AGENT_SEVERITY: { readonly info: 0; readonly warning: 1; readonly critical: 2 };
export const AGENT_INSIGHT_STATUS: { readonly open: 0; readonly handled: 1; readonly dismissed: 2 };
export const AGENT_SEVERITY_LABELS: readonly ['Info', 'Warning', 'Critical'];
export interface AgentsChangedMessage { type: 'ready' | 'agentsChanged'; environment: 'sbx' | 'prod'; agentId?: string; conversationId?: string | null; isShared?: boolean; kind?: string }
export interface BackofficeAgent {
  id: string; name: string; typeKey: string; typeDisplayName: string; description?: string | null; avatarKey?: string | null; avatarColor?: string | null; avatarUrl: string;
  status: 0 | 1; openInsightCount: number; scheduledTaskCount: number; lastActivityAtUtc?: string | null;
  /** The agent's chat group for the linked account; null when that account is not a member. */
  chatConversationId?: string | null; unreadCount: number; lastMessagePreview?: string | null; people: Array<{ personId: number; name: string }>;
  /** True when the agent has the Testing tools it needs to run a workflow on a schedule. */
  canRunWorkflows: boolean;
}
export interface BackofficeAgentsOverview { agents: BackofficeAgent[]; openCritical: number; openWarning: number; openInfo: number; latestInsightAtUtc?: string | null; canApprove: boolean; canChat: boolean; myPersonId: number }
export interface BackofficeInsight { id: string; agentId: string; agentName: string; avatarUrl: string; avatarColor?: string | null; severity: 0 | 1 | 2; title: string; bodyMarkdown?: string | null; status: 0 | 1 | 2; createdAtUtc: string; conversationId?: string | null; proposedAction?: string | null; approvedBy?: string | null; resolvedBy?: string | null }
/** A message of the agent chat group. Sender person 0 is the agent; finding messages carry the insight fields. */
export interface AgentChatMessage {
  id: string; conversationId: string; senderPersonId: number; content: string; creationTimeUtc: string; parentMessageId?: string | null;
  isEdited: boolean; isDeleted: boolean; isSystem: boolean; replyCount: number; unreadReplyCount: number; lastReplyAtUtc?: string | null;
  insightId?: string | null; insightSeverity?: 0 | 1 | 2 | null; insightStatus?: 0 | 1 | 2 | null; insightProposedAction?: string | null; insightResolvedBy?: string | null; insightApprovedBy?: string | null;
}
export interface AgentChatStream { conversationId: string; rootMessageId?: string | null; text?: string | null }
export interface AgentsClient {
  overview(options?: PlatformRequestOptions): Promise<BackofficeAgentsOverview>;
  attention(query?: { skip?: number; take?: number; includeHandled?: boolean; agentId?: string }, options?: PlatformRequestOptions): Promise<{ items: BackofficeInsight[]; totalCount: number }>;
  acknowledge(id: string, options?: PlatformRequestOptions): Promise<{ updated: boolean }>; dismiss(id: string, options?: PlatformRequestOptions): Promise<{ updated: boolean }>;
  reopen(id: string, options?: PlatformRequestOptions): Promise<{ updated: boolean }>; approve(id: string, options?: PlatformRequestOptions): Promise<{ updated: boolean }>;
  chatMessages(query: { conversationId: string; beforeUtc?: string; take?: number }, options?: PlatformRequestOptions): Promise<{ items: AgentChatMessage[]; streams: AgentChatStream[] }>;
  chatThread(query: { conversationId: string; rootMessageId: string }, options?: PlatformRequestOptions): Promise<{ items: AgentChatMessage[] }>;
  chatSend(input: { conversationId: string; content: string; replyToMessageId?: string }, options?: PlatformRequestOptions): Promise<AgentChatMessage>;
  chatRead(conversationId: string, options?: PlatformRequestOptions): Promise<{ read: boolean }>;
  watchResolve(routes: AgentWatchRoute[], options?: PlatformRequestOptions): Promise<{ items: Array<{ key: string; workflows: AgentWatchWorkflow[] }>; canWatch: boolean }>;
  watchWorkflows(options?: PlatformRequestOptions): Promise<{ items: AgentWatchWorkflow[]; canWatch: boolean }>;
  watchList(query?: { agentId?: string }, options?: PlatformRequestOptions): Promise<{ items: AgentWatchWorkflow[]; canWatch: boolean }>;
  watchSet(input: { agentId: string; endpointId: string; attached?: boolean; watchPrompt?: string; watchSandbox?: boolean; watchProduction?: boolean }, options?: PlatformRequestOptions): Promise<AgentWatchWorkflow>;
  watchScheduleSet(input: AgentWatchCadence & { id?: string; agentId: string; endpointId: string; prompt: string; isEnabled?: boolean; sampleUrl?: string; enableWorkflowRuns?: boolean }, options?: PlatformRequestOptions): Promise<AgentWatchWorkflow>;
  watchScheduleDelete(id: string, options?: PlatformRequestOptions): Promise<{ updated: boolean }>;
  watchScheduleRun(id: string, options?: PlatformRequestOptions): Promise<{ updated: boolean }>;
  watchScheduleTest(id: string, options?: PlatformRequestOptions): Promise<{ statusCode: number; ok: boolean; signedIn: boolean; responseTimeMs: number; preview: string }>;
}
export interface AgentWatchFeed { route: string; method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; label?: string }
export interface AgentWatchRoute { key?: string; path: string; method?: string; label?: string; /** The call the page made (path and query). */ url?: string }
export interface AgentWatch { agentId: string; agentName: string; avatarUrl: string; avatarColor?: string | null; watchPrompt?: string | null; watchSandbox: boolean; watchProduction: boolean }
export interface AgentWatchSchedule { id: string; agentId: string; agentName: string; avatarUrl: string; avatarColor?: string | null; prompt: string; intervalMinutes: number; timeOfDayUtcMinutes?: number | null; dayOfWeek?: number | null; isEnabled: boolean; isProduction: boolean; sampleRequestId?: string | null; lastRunAtUtc?: string | null; nextRunAtUtc: string }
/** `watches` fire on every run (actions); `schedules` are checks the agent makes itself on a cadence (reads). */
export interface AgentWatchWorkflow { endpointId: string; name?: string | null; route: string; method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'ANY'; /** The workflow starts with a sign-in check; a scheduled check of it runs as the app user who created the schedule. */ requiresSignIn: boolean; watches: AgentWatch[]; schedules: AgentWatchSchedule[] }
export interface AgentWatchCadence { intervalMinutes?: number; timeOfDayUtcMinutes?: number | null; dayOfWeek?: number | null }
export const WATCH_INTERVALS: ReadonlyArray<{ minutes: number; label: string }>;
/** What an undeclared element is (an action or data) and its label, for matching it to a workflow. */
export function describeWatchElement(element: Element | null): { kind: 'action' | 'data'; label: string };
export function watchWords(text: string): string[];
/** Orders workflows by how likely each is behind an element: shared words, workflows the page called, and read or write fit. */
export function rankWorkflows<T extends AgentWatchWorkflow>(workflows: T[], options?: { label?: string; kind?: 'action' | 'data'; calledIds?: Iterable<string>; /** The page's own path without the app's base path: it names the resource in the backend's words. */ context?: string; /** Routes the page called: a weak extra hint for actions. */ routes?: string }): Array<T & { score: number; matched: boolean }>;
export function routeMatches(route: string, path: string): boolean;
export function lastCallFor(entries: Array<{ name: string; startTime?: number }>, gatewayUrl: string, route: string): string;
export function localScheduleToUtc(local?: { time?: string; day?: number }, offsetMinutes?: number): { timeOfDayUtcMinutes?: number; dayOfWeek?: number };
export function utcScheduleToLocal(utc?: AgentWatchCadence, offsetMinutes?: number): { time?: string; day?: number };
export function describeCadence(cadence?: AgentWatchCadence, offsetMinutes?: number): string;
/** Attributes that make an element a drop target for AI agents: the route a data component loads from, or the route an action calls. */
export function agentWatchProps(feed?: string | AgentWatchFeed | null): Record<string, string>;
export function readWatchTarget(element: Element | null): (AgentWatchRoute & { key: string; label: string }) | null;
export function watchRouteKey(route: { path: string; method?: string }): string;
export function gatewayRoutesFromEntries(entries: Array<{ name: string; startTime?: number }>, gatewayUrl: string, since?: number, limit?: number): Array<AgentWatchRoute & { key: string; label: string }>;
export function createAgentsClient(options: { request: PlatformRequest; resolveAppIdentity?: IdentityResolver; projectPath?: string }): AgentsClient;
export function agentsAccessState(error: unknown): 'unlinked' | 'forbidden' | 'unavailable' | 'error';
