export const getApiUrl = () => {
  // Respect explicit env override if provided
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const protocol = window.location.protocol

    // If accessing via localhost or IP on port 3000, target the local server on port 4000
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.')
    ) {
      return `${protocol}//${host}:4000`
    }

    // For Vercel or any other production deployment, use relative paths
    // so it hits the same origin's /api/* endpoints
    return ''
  }

  // Fallback for SSR/Server context (though mostly client-side usage here)
  return 'http://localhost:4000'
}
