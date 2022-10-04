import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  UserCredential
} from 'firebase/auth'
import { FirebaseApp } from 'firebase/app'

type TokenResponse = {
  idToken: string | undefined
  refreshToken: string
}

export const getUserDataFromCredential = async (credential: UserCredential) => {
  const { user } = credential
  const { email, displayName: name, refreshToken } = user
  const idToken = await user.getIdToken(true)
  return { email: `${email}`, name: `${name}`, idToken, refreshToken }
}

export const singInWithIdToken = async (
  app: FirebaseApp,
  idToken: string
): Promise<UserCredential> => {
  try {
    const credential = GoogleAuthProvider.credential(idToken)
    const auth = getAuth(app)
    const result = await signInWithCredential(auth, credential)
    return result
  } catch (err) {
    // TODO Handle errors
    return Promise.reject(err)
  }
}
