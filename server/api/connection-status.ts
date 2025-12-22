export default defineEventHandler(async (event) => {
  const session = await useSession(event, getSessionConfig())

  const data = await session.data

  if (data.connectionCode || data.error) {
    await session.clear()
  }

  return {
    connectionCode: data.connectionCode || null,
    error: data.error || null,
    success: data.success || false
  }
})