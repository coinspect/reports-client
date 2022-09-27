import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { projectId, authPort, apiKey, host } from './test-config'
import { createApp } from '../dbApi'
import { singInWithIdToken } from '../auth'

describe('auth', () => {
  const app = createApp({ projectId, apiKey })
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${host}:${authPort}`)
  it('should signin using an idToken', async () => {
    const idToken =
      '{"sub": "abc123", "email": "foo@example.com", "email_verified": true}'
    const result = await singInWithIdToken(app, idToken)
    expect(result).not.toBeUndefined()
    expect(typeof result).toBe('object')
  })
})
