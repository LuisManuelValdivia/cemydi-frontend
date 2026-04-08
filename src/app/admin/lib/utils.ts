export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ')
}

/** Ruta actual coincide con `url` del sidebar (exacta o prefijo de subrutas). */
export function matchSidebarPath(pathname: string, url: string): boolean {
  if (!url || url === "#") return false
  if (pathname === url) return true
  if (url === "/admin") return false
  return pathname.startsWith(`${url}/`)
}
