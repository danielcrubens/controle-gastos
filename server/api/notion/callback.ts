export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  
  const NOTION_CLIENT_ID = config.notionClientId
  const NOTION_CLIENT_SECRET = config.notionClientSecret
  const N8N_WEBHOOK_URL = config.n8nWebhookUrl
  const baseUrl = config.public.baseUrl
  const NOTION_REDIRECT_URI = `${baseUrl}/api/notion/callback`

  // LOG para debug
  console.log('🔍 DEBUG callback:')
  console.log('- baseUrl:', baseUrl)
  console.log('- NOTION_REDIRECT_URI:', NOTION_REDIRECT_URI)
  console.log('- NOTION_CLIENT_ID:', NOTION_CLIENT_ID)

  try {
    const query = getQuery(event)
    const code = query.code as string

    if (!code) {
      throw new Error('Código de autorização não encontrado')
    }

    console.log('✅ Code recebido:', code)

    const requestBody = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: NOTION_REDIRECT_URI
    }

    console.log('📤 Request body para Notion:', JSON.stringify(requestBody, null, 2))

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📥 Status da resposta Notion:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('❌ Erro completo do Notion:', JSON.stringify(errorData, null, 2))
      throw new Error(`Erro do Notion: ${JSON.stringify(errorData)}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('✅ Token obtido com sucesso')
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
    console.log('📊 Databases encontradas:', searchData.results?.length || 0)
    
    const targetDatabase = searchData.results?.[0]

    if (!targetDatabase) {
      throw new Error('Nenhuma database encontrada no Notion')
    }

    console.log('✅ Database selecionada:', targetDatabase.id)

    const connectionCode = generateRandomCode()

    console.log('📤 Enviando para N8N...')
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection_code: connectionCode,
        notion_access_token: accessToken,
        notion_database_id: targetDatabase.id
      })
    })

    console.log('📥 N8N response status:', n8nResponse.status)

    const session = await useSession(event, getSessionConfig())
    
    await session.update({
      connectionCode: connectionCode,
      success: true
    })

    console.log('✅ Conexão estabelecida com sucesso! Code:', connectionCode)
    return sendRedirect(event, '/')

  } catch (error: any) {
    console.error('❌ ERRO COMPLETO:', error)
    console.error('❌ ERRO MESSAGE:', error.message)
    console.error('❌ ERRO STACK:', error.stack)
    
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