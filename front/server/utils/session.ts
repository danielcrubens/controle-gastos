export function getSessionConfig() {
  const password = process.env.SESSION_SECRET
  
  if (!password || password.length < 32) {
    throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres no .env')
  }
  
  return {
    password,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 3600 // 1 hora
    }
  }
}