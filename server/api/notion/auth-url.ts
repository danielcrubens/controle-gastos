export default defineEventHandler(() => {
  const clientId = process.env.NOTION_CLIENT_ID!
  const redirectUri = process.env.NOTION_REDIRECT_URI!
  
  const notionAuthUrl = "https://api.notion.com/v1/oauth/authorize"
  const authUrl = `${notionAuthUrl}?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`
  
  return { authUrl }
})