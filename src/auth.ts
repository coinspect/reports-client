import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  UserCredential
} from 'firebase/auth'
import { FirebaseApp } from 'firebase/app'
import fetch from 'node-fetch'

const REFRESH_URL = 'https://securetoken.googleapis.com/v1/token'

const getRefreshURL = (apiKey: string) => `${REFRESH_URL}?key=${apiKey}`

type TokenResponse = {
  idToken: string
  refreshToken: string
}

const createRequest = (data: {}) => {
  const method = 'POST'
  const body = JSON.stringify(data)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const headers = { 'Content-Type': 'application/json' }
  return { method, body, headers }
}

export const refreshIdToken = async (
  refreshToken: string,
  apiKey: string
): Promise<TokenResponse> => {
  try {
    const response = await fetch(
      getRefreshURL(apiKey),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      createRequest({ refreshToken, apiKey, grantType: 'refresh_token' })
    )
    const data = await response.json()
    return { idToken: data.id_token, refreshToken: data.refresh_token }
  } catch (err) {
    return Promise.reject(err)
  }
}

export const getUserDataFromCredential = async (credential: UserCredential) => {
  const { user } = credential
  const { email, displayName: name, refreshToken } = user
  const idToken = await user.getIdToken(true)
  return { email: `${email}`, name: `${name}`, idToken, refreshToken }
}

export const singInWithIdToken = async (
  app: FirebaseApp,
  idToken: string,
  refreshToken?: string | undefined,
  tries?: number | undefined
): Promise<UserCredential> => {
  try {
    if (tries === undefined) {
      tries = 1
    }
    const credential = GoogleAuthProvider.credential(idToken)
    const auth = getAuth(app)
    const result = await signInWithCredential(auth, credential)
    return result
  } catch (err) {
    const { apiKey } = app.options
    // TODO check if is an idToken error
    if (refreshToken && tries && apiKey) {
      const tokens = await refreshIdToken(refreshToken, apiKey)
      return singInWithIdToken(
        app,
        tokens.idToken,
        tokens.refreshToken,
        --tries
      )
    }
    // TODO Handle errors
    return Promise.reject(err)
  }
}
