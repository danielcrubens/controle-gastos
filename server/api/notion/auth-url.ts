export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  
  const clientId = config.notionClientId
  const baseUrl = config.public.baseUrl
  const redirectUri = `${baseUrl}/api/notion/callback`
  
  // LOG para debug
  console.log('🔍 DEBUG auth-url:')
  console.log('- baseUrl:', baseUrl)
  console.log('- redirectUri:', redirectUri)
  console.log('- clientId:', clientId)
  
  const notionAuthUrl = "https://api.notion.com/v1/oauth/authorize"
  const authUrl = `${notionAuthUrl}?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`
  
  return { authUrl }
})