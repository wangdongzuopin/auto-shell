export type AppPlatform = 'windows' | 'macos' | 'linux';

export function detectPlatform(): AppPlatform {
  const value = typeof navigator === 'undefined' ? '' : navigator.userAgent.toLowerCase();

  if (value.includes('mac')) {
    return 'macos';
  }

  if (value.includes('win')) {
    return 'windows';
  }

  return 'linux';
}
