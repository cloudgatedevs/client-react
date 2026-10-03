/** Built-in app permissions. Enforcement also happens on every Cloudgate API request. */
export const BACKOFFICE_PERMISSIONS = Object.freeze({
  "Access": "backoffice.access",
  "WidgetsView": "backoffice.widgets.view",
  "DashboardView": "backoffice.dashboard.view",
  "OrdersView": "backoffice.orders.view",
  "AnalyticsView": "backoffice.analytics.view",
  "LogsView": "backoffice.logs.view",
  "PaymentsView": "backoffice.payments.view",
  "PaymentsHistory": "backoffice.payments.history",
  "PaymentsTestView": "backoffice.payments.testView",
  "PaymentsTestCreate": "backoffice.payments.testCreate",
  "UsersView": "backoffice.users.view",
  "UsersCreate": "backoffice.users.create",
  "UsersEdit": "backoffice.users.edit",
  "UsersDelete": "backoffice.users.delete",
  "UsersInvite": "backoffice.users.invite",
  "UsersResetPassword": "backoffice.users.resetPassword",
  "UsersAssignRoles": "backoffice.users.assignRoles",
  "RolesView": "backoffice.roles.view",
  "RolesCreate": "backoffice.roles.create",
  "RolesEdit": "backoffice.roles.edit",
  "RolesDelete": "backoffice.roles.delete",
  "RegistrationView": "backoffice.registration.view",
  "RegistrationEdit": "backoffice.registration.edit",
  "NotificationsView": "backoffice.notifications.view",
  "NotificationsSend": "backoffice.notifications.send",
  "SmtpView": "backoffice.smtp.view",
  "SmtpEdit": "backoffice.smtp.edit",
  "SmtpSendTest": "backoffice.smtp.sendTest",
  "SmtpDelete": "backoffice.smtp.delete",
  "EmailTemplateView": "backoffice.emailTemplate.view",
  "EmailTemplateEdit": "backoffice.emailTemplate.edit",
  "MediaView": "backoffice.media.view",
  "MediaUpload": "backoffice.media.upload",
  "MediaDelete": "backoffice.media.delete",
  "BrandingView": "backoffice.branding.view",
  "BrandingEdit": "backoffice.branding.edit",
  "ThemeView": "backoffice.theme.view",
  "ThemeEdit": "backoffice.theme.edit",
  "SettingsView": "backoffice.settings.view",
  "SettingsEdit": "backoffice.settings.edit",
  "DeveloperAccess": "backoffice.developer.access",
  "AgentsAccess": "backoffice.agents.access"
});
export const BACKOFFICE_PERMISSION_TREE = [
  {
    "key": "backoffice.access",
    "label": "Back office access"
  },
  { "label": "Widget library", "children": [{ "key": "backoffice.widgets.view", "label": "View widget library" }] },
  {
    "label": "Dashboard",
    "children": [
      {
        "key": "backoffice.dashboard.view",
        "label": "View dashboard"
      }
    ]
  },
  {
    "label": "Orders",
    "children": [
      {
        "key": "backoffice.orders.view",
        "label": "View orders"
      }
    ]
  },
  {
    "label": "Analytics",
    "children": [
      {
        "key": "backoffice.analytics.view",
        "label": "View analytics"
      }
    ]
  },
  {
    "label": "Logs",
    "children": [
      {
        "key": "backoffice.logs.view",
        "label": "View logs"
      }
    ]
  },
  {
    "label": "Payments",
    "children": [
      {
        "key": "backoffice.payments.view",
        "label": "View overview"
      },
      {
        "key": "backoffice.payments.history",
        "label": "View payment history"
      },
      {
        "key": "backoffice.payments.testView",
        "label": "View test payment page"
      },
      {
        "key": "backoffice.payments.testCreate",
        "label": "Create test payments"
      }
    ]
  },
  {
    "label": "Users",
    "children": [
      {
        "key": "backoffice.users.view",
        "label": "View users"
      },
      {
        "key": "backoffice.users.create",
        "label": "Create users"
      },
      {
        "key": "backoffice.users.edit",
        "label": "Edit users and status"
      },
      {
        "key": "backoffice.users.delete",
        "label": "Delete users"
      },
      {
        "key": "backoffice.users.invite",
        "label": "Invite users"
      },
      {
        "key": "backoffice.users.resetPassword",
        "label": "Send password resets"
      },
      {
        "key": "backoffice.users.assignRoles",
        "label": "Assign roles"
      }
    ]
  },
  {
    "label": "Roles",
    "children": [
      {
        "key": "backoffice.roles.view",
        "label": "View roles"
      },
      {
        "key": "backoffice.roles.create",
        "label": "Create roles"
      },
      {
        "key": "backoffice.roles.edit",
        "label": "Edit roles and permissions"
      },
      {
        "key": "backoffice.roles.delete",
        "label": "Delete roles"
      }
    ]
  },
  {
    "label": "User settings",
    "children": [
      {
        "key": "backoffice.registration.view",
        "label": "View registration settings"
      },
      {
        "key": "backoffice.registration.edit",
        "label": "Edit registration settings"
      }
    ]
  },
  {
    "label": "App notifications",
    "children": [
      {
        "key": "backoffice.notifications.view",
        "label": "View sent notifications and recipients"
      },
      {
        "key": "backoffice.notifications.send",
        "label": "Send notifications"
      }
    ]
  },
  {
    "label": "SMTP settings",
    "children": [
      {
        "key": "backoffice.smtp.view",
        "label": "View SMTP settings"
      },
      {
        "key": "backoffice.smtp.edit",
        "label": "Edit SMTP settings"
      },
      {
        "key": "backoffice.smtp.sendTest",
        "label": "Send test email"
      },
      {
        "key": "backoffice.smtp.delete",
        "label": "Delete SMTP settings"
      }
    ]
  },
  {
    "label": "Email template",
    "children": [
      {
        "key": "backoffice.emailTemplate.view",
        "label": "View email template"
      },
      {
        "key": "backoffice.emailTemplate.edit",
        "label": "Edit email template"
      }
    ]
  },
  {
    "label": "Media server",
    "children": [
      {
        "key": "backoffice.media.view",
        "label": "View media"
      },
      {
        "key": "backoffice.media.upload",
        "label": "Upload images"
      },
      {
        "key": "backoffice.media.delete",
        "label": "Delete images"
      }
    ]
  },
  {
    "label": "Branding",
    "children": [
      {
        "key": "backoffice.branding.view",
        "label": "View branding"
      },
      {
        "key": "backoffice.branding.edit",
        "label": "Edit branding"
      }
    ]
  },
  {
    "label": "Theme",
    "children": [
      {
        "key": "backoffice.theme.view",
        "label": "View theme"
      },
      {
        "key": "backoffice.theme.edit",
        "label": "Edit theme"
      }
    ]
  },
  {
    "label": "Website settings",
    "children": [
      {
        "key": "backoffice.settings.view",
        "label": "View website settings"
      },
      {
        "key": "backoffice.settings.edit",
        "label": "Edit website settings"
      }
    ]
  },
  {
    "label": "Developer workspace",
    "children": [
      {
        "key": "backoffice.developer.access",
        "label": "Open developer workspace (linked Cloudgate account required)"
      }
    ]
  },
  {
    "label": "AI agents",
    "children": [
      {
        "key": "backoffice.agents.access",
        "label": "See AI agent findings and chat with agents (linked Cloudgate account required)"
      }
    ]
  }
];
export const BACKOFFICE_PERMISSION_KEYS = Object.freeze(Object.values(BACKOFFICE_PERMISSIONS));
const truthy = value => value === true || value === 1 || ['true', '1'].includes(String(value ?? '').trim().toLowerCase());
export function hasBackofficePermission(profile, permission = BACKOFFICE_PERMISSIONS.Access) {
  const entries = profile?.rolePermissions ?? profile?.RolePermissions ?? [];
  if (!Array.isArray(entries)) return false;
  const granted = key => { const matches = entries.filter(p => String(p?.key ?? p?.Key ?? '').trim().toLowerCase() === key.toLowerCase()); return matches.length === 1 && truthy(matches[0].value ?? matches[0].Value); };
  return granted(BACKOFFICE_PERMISSIONS.Access) && granted(permission);
}
export const canAccessBackoffice = profile => hasBackofficePermission(profile);
export function normalizeRolePermissions(entries = []) {
  const result = entries.map(p => ({ key: BACKOFFICE_PERMISSION_KEYS.find(key => key.toLowerCase() === p.key.trim().toLowerCase()) || p.key, value: String(p.value ?? '') }));
  for (const key of BACKOFFICE_PERMISSION_KEYS) if (!result.some(p => p.key.toLowerCase() === key.toLowerCase())) result.push({key, value:'false'});
  return result;
}
