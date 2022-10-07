import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  UserCredential,
  User
} from 'firebase/auth'
import { FirebaseApp } from 'firebase/app'

type TokenResponse = {
  idToken: string | undefined
  refreshToken: string
}

export const getUserData = async (user: User | undefined | null) => {
  if (!user) {
    return {}
  }
  const { email, displayName: name, refreshToken } = user
  const idToken = await user.getIdToken(true)
  return { email: `${email}`, name: `${name}`, idToken, refreshToken }
}

export const getUserDataFromCredential = async (credential: UserCredential) =>
  getUserData(credential.user)

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
