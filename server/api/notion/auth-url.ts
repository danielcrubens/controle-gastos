export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const clientId = config.notionClientId
  const baseUrl = config.public.baseUrl
  // Remove barra final do baseUrl se existir
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const redirectUri = `${cleanBaseUrl}/api/notion/callback`
  const notionAuthUrl = "https://api.notion.com/v1/oauth/authorize"
  const authUrl = `${notionAuthUrl}?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`

  // DEBUG - Verificar valores em produção
  console.log('=== AUTH-URL DEBUG ===')
  console.log('clientId:', clientId)
  console.log('baseUrl original:', baseUrl)
  console.log('baseUrl limpo:', cleanBaseUrl)
  console.log('redirectUri:', redirectUri)
  console.log('authUrl completa:', authUrl)
  console.log('======================')

  return { authUrl }
})
