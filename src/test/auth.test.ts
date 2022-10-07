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
    await auth.signOut()
    const result = await a.singInWithIdToken(app, idToken)
    expect(result).not.toBeUndefined()
    expect(typeof result).toBe('object')
  })
})

describe('getUserData', () => {
  it('should return an empty object', async () => {
    await auth.signOut()
    const data = await a.getUserData(auth.currentUser)
    expect(typeof data).toBe('object')
    expect(Object.keys(data).length).toBe(0)
  })

  it('should return the user data', async () => {
    await auth.signOut
    await a.singInWithIdToken(app, idToken)
    const data = await a.getUserData(auth.currentUser)
    expect(typeof data).toBe('object')
    testUserData(idToken, data)
  })
})

describe('getUserDataFromCredential', () => {
  it('should get user data from credential', async () => {
    const credential = await a.singInWithIdToken(app, idToken)
    const result = await a.getUserDataFromCredential(credential)
    testUserData(idToken, result)
  })
})
