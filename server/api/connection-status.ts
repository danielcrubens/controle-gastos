export default defineEventHandler(async (event) => {
  const session = await useSession(event, getSessionConfig())
  
  return {
    connectionCode: session.data.connectionCode || null,
    success: session.data.success || false,
    error: session.data.error || null,
    debugLogs: session.data.debugLogs || null
  }
})