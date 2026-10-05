const stableVersion = version => {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) return null;
  const parts = version.split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
};

// Use this app's bundled version, not the saved project or another release.
export function hasConfirmedSdkUpdate(status, runningVersion, sdkSource) {
  if (sdkSource === 'local' || status?.sdkSource === 'local' || status?.checkError || status?.updateAvailable !== true) return false;
  const running = stableVersion(runningVersion), latest = stableVersion(status.latestVersion);
  if (!running || !latest) return false;
  const different = latest.findIndex((part, index) => part !== running[index]);
  return different >= 0 && latest[different] > running[different];
}
