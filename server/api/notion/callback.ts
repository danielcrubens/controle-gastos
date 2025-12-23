export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  
  const NOTION_CLIENT_ID = config.notionClientId
  const NOTION_CLIENT_SECRET = config.notionClientSecret
  const N8N_WEBHOOK_URL = config.n8nWebhookUrl
  const baseUrl = config.public.baseUrl
  const NOTION_REDIRECT_URI = `${baseUrl}/api/notion/callback`

  // Array para coletar logs
  const debugLogs: string[] = []
  
  const log = (msg: string) => {
    console.log(msg)
    debugLogs.push(msg)
  }

  // VALIDAÇÃO DAS VARIÁVEIS
  log('🔍 VALIDAÇÃO DE VARIÁVEIS:')
  log(`- baseUrl: ${baseUrl}`)
  log(`- CLIENT_ID existe? ${!!NOTION_CLIENT_ID}`)
  log(`- CLIENT_ID: ${NOTION_CLIENT_ID}`)
  log(`- CLIENT_SECRET existe? ${!!NOTION_CLIENT_SECRET}`)
  log(`- CLIENT_SECRET length: ${NOTION_CLIENT_SECRET?.length}`)
  log(`- CLIENT_SECRET primeiros 10 chars: ${NOTION_CLIENT_SECRET?.substring(0, 10)}...`)
  log(`- REDIRECT_URI: ${NOTION_REDIRECT_URI}`)
  
  if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
    const errorMsg = 'Variáveis de ambiente não configuradas corretamente'
    const session = await useSession(event, getSessionConfig())
    await session.update({
      error: errorMsg,
      debugLogs: debugLogs.join('\n')
    })
    return sendRedirect(event, '/')
  }

  try {
    const query = getQuery(event)
    const code = query.code as string

    if (!code) {
      throw new Error('Código de autorização não encontrado')
    }

    log(`✅ Code recebido: ${code}`)

    const requestBody = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: NOTION_REDIRECT_URI
    }

    log(`📤 Request body: ${JSON.stringify(requestBody, null, 2)}`)

    const authHeader = `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`
    log(`🔑 Auth header length: ${authHeader.length}`)

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    log(`📥 Status da resposta Notion: ${tokenResponse.status}`)

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      log(`❌ Erro do Notion: ${JSON.stringify(errorData, null, 2)}`)
      
      const session = await useSession(event, getSessionConfig())
      await session.update({
        error: `Erro do Notion: ${errorData.error}`,
        debugLogs: debugLogs.join('\n')
      })
      return sendRedirect(event, '/')
    }

    const tokenData = await tokenResponse.json()
    log('✅ Token obtido com sucesso')
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
    log(`📊 Databases encontradas: ${searchData.results?.length || 0}`)
    
    const targetDatabase = searchData.results?.[0]

    if (!targetDatabase) {
      throw new Error('Nenhuma database encontrada no Notion')
    }

    log(`✅ Database selecionada: ${targetDatabase.id}`)

    const connectionCode = generateRandomCode()

    log('📤 Enviando para N8N...')
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connection_code: connectionCode,
        notion_access_token: accessToken,
        notion_database_id: targetDatabase.id
      })
    })

    log(`📥 N8N response status: ${n8nResponse.status}`)

    const session = await useSession(event, getSessionConfig())
    
    await session.update({
      connectionCode: connectionCode,
      success: true
    })

    log(`✅ Conexão estabelecida com sucesso! Code: ${connectionCode}`)
    return sendRedirect(event, '/')

  } catch (error: any) {
    log(`❌ ERRO: ${error.message}`)
    
    const session = await useSession(event, getSessionConfig())
    
    await session.update({
      error: error.message,
      debugLogs: debugLogs.join('\n')
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