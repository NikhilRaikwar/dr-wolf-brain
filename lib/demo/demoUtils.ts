/**
 * Shared Demo Mode Utilities
 * Strict Truth Boundary: Demo data is ONLY active when explicitly opted in (e.g. ?demo=1).
 */

export function isDemoMode(searchParams?: { get: (key: string) => string | null } | URLSearchParams | null): boolean {
  if (!searchParams) return false
  return searchParams.get('demo') === '1' || searchParams.get('demo') === 'true'
}

export function getNavHref(baseHref: string, isDemo: boolean): string {
  if (!isDemo) return baseHref
  return baseHref.includes('?') ? `${baseHref}&demo=1` : `${baseHref}?demo=1`
}

export function getExitDemoHref(pathname: string): string {
  return pathname.split('?')[0]
}
