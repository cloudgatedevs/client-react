import cloudgateIcon from '../assets/cloudgate-icon.svg';
import { useSettings } from '../settings/SettingsProvider.jsx';

export function Brand() {
  const { settings } = useSettings();
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* A custom logo is shown as-is: no tile, border or shadow behind it. The Cloudgate fallback keeps its tile. */}
      <span className={`brand-mark grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl ${settings.app_logo_url ? 'brand-mark--logo' : 'border border-ink-700 bg-ink-850'}`}>
        <img src={settings.app_logo_url || cloudgateIcon} alt="" className={settings.app_logo_url ? 'h-full w-full object-contain' : 'h-7 w-7 object-contain'} />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold">{settings.app_name}</p>
        <p className="mt-1 truncate text-[11px] text-mist-dim">{settings.app_tagline || 'Back office'}</p>
      </div>
    </div>
  );
}
