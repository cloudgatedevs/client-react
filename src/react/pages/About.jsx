// About this app and Cloudgate: the shared page (same file in every App Store app) on a route.
import { CloudgateAbout } from '../integrations/CloudgateAbout.jsx';
import { useSettings } from '../settings/SettingsProvider.jsx';

const About = () => {
  const { settings } = useSettings();
  return (
    <div className="space-y-5">
      <CloudgateAbout appName={settings.app_name} description={settings.app_description || undefined} />
      {(settings.app_url || settings.support_email) && (
        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Get in touch</h2>
          {settings.app_url && (
            <p>
              <a
                className="text-sm text-accent hover:underline"
                href={settings.app_url}
                target="_blank"
                rel="noreferrer"
              >
                Visit {settings.app_name}
              </a>
            </p>
          )}
          {settings.support_email && (
            <p>
              <a className="text-sm text-accent hover:underline" href={`mailto:${settings.support_email}`}>
                {settings.support_email}
              </a>
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export { About };
