export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  
  const NOTION_CLIENT_ID = config.notionClientId
  const NOTION_CLIENT_SECRET = config.notionClientSecret
  const N8N_WEBHOOK_URL = config.n8nWebhookUrl
  const baseUrl = config.public.baseUrl
  const NOTION_REDIRECT_URI = `${baseUrl}/api/notion/callback`
  
  if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
    const session = await useSession(event, getSessionConfig())
    await session.update({
      error: 'Variáveis de ambiente não configuradas corretamente'
    })
    return sendRedirect(event, '/')
  }

  try {
    const query = getQuery(event)
    const code = query.code as string

    if (!code) {
      throw new Error('Código de autorização não encontrado')
    }

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: NOTION_REDIRECT_URI
      })
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      const session = await useSession(event, getSessionConfig())
      await session.update({
        error: `Erro do Notion: ${errorData.error}`
      })
      return sendRedirect(event, '/')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { value: 'database', property: 'object' }
      })
    })

    const searchData = await searchResponse.json()
    const targetDatabase = searchData.results?.[0]

    if (!targetDatabase) {
      throw new Error('Nenhuma database encontrada no Notion')
    }

    const connectionCode = generateRandomCode()

    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection_code: connectionCode,
        notion_access_token: accessToken,
        notion_database_id: targetDatabase.id
      })
    })

    const session = await useSession(event, getSessionConfig())
    
    await session.update({
      connectionCode: connectionCode,
      success: true
    })

    return sendRedirect(event, '/')

  } catch (error: any) {
    const session = await useSession(event, getSessionConfig())
    
    await session.update({
      error: error.message
    })
    
    return sendRedirect(event, '/')
  }
})

function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}