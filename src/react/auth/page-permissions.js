import { BACKOFFICE_PERMISSIONS as P } from "../../platform/backoffice-permissions.js";

export const BACKOFFICE_ROUTE_PERMISSIONS = {
  "/": P.DashboardView,
  "/orders": P.OrdersView,
  "/analytics": P.AnalyticsView,
  "/logs": P.LogsView,
  "/payments": P.PaymentsView,
  "/payments/list": P.PaymentsHistory,
  "/payments/test": P.PaymentsTestView,
  "/users": P.UsersView,
  "/roles": P.RolesView,
  "/registration": P.RegistrationView,
  "/app-notifications": P.NotificationsView,
  "/smtp": P.SmtpView,
  "/email-template": P.EmailTemplateView,
  "/media": P.MediaView,
  "/appearance": P.BrandingView,
  "/theme": P.ThemeView,
  "/settings": P.SettingsView,
  "/widgets": P.WidgetsView,
};

export function permissionForBackofficePath(path) {
  const normalized = (path || "/").replace(/\/+$/, "") || "/";
  return (
    BACKOFFICE_ROUTE_PERMISSIONS[normalized] ||
    (normalized.startsWith("/widgets/") ? P.WidgetsView : P.Access)
  );
}
