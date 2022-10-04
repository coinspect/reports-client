import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { host, app, authPort, idToken } from './test-config'
import * as a from '../auth'

export function testUserData(idToken: any, result: any) {
  const idTokenData = JSON.parse(idToken)
  expect(result.name).toBe(idTokenData.name)
  expect(result.email).toBe(idTokenData.email)
  expect(result.idToken).toBeDefined()
  expect(result.refreshToken).toBeDefined()
}

const auth = getAuth(app)
connectAuthEmulator(auth, `http://${host}:${authPort}`)

afterEach(() => {
  jest.resetAllMocks()
})

describe('singInWithIdToken', () => {
  it('should signin using an idToken', async () => {
    const result = await a.singInWithIdToken(app, idToken)
    expect(result).not.toBeUndefined()
    expect(typeof result).toBe('object')
  })
})

describe('getUserDataFromCredential', () => {
  it('should get user data from credential', async () => {
    const credential = await a.singInWithIdToken(app, idToken)
    const result = await a.getUserDataFromCredential(credential)
    testUserData(idToken, result)
  })
})
