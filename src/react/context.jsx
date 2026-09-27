import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PLATFORM_NAV } from './components/navConfig.jsx';
import { scopedBackofficePath } from './routing.js';
const Context = createContext(null);
export function CloudgateProvider({ client, metadata = {}, navigation = PLATFORM_NAV, children, basePath = '', publicWebsite = false }) {
  const [identity, setIdentity] = useState(null);
  useEffect(() => {
    let active = true;
    setIdentity(null);
    client.resolveAppIdentity().then(value => { if (active) setIdentity(value); }).catch(() => {});
    return () => { active = false; };
  }, [client]);
  const value = useMemo(() => ({ client, metadata, navigation, identity, basePath, publicWebsite,
    backofficePath: path => scopedBackofficePath(basePath, path) }), [client, metadata, navigation, identity, basePath, publicWebsite]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCloudgate() {
  const value = useContext(Context);
  if (!value) throw new Error('Wrap Cloudgate components in CloudgateProvider or CloudgateBackoffice.');
  return value;
}
