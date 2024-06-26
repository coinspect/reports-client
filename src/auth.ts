import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  UserCredential,
  User,
  signInWithEmailAndPassword
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
  const { email, displayName: name, refreshToken, uid } = user
  let idToken = undefined
  try {
    idToken = await user.getIdToken()
  } catch(error) {
    console.log('Failed getting id token', error)
  }
  return { email: `${email}`, name: `${name}`, idToken, refreshToken, uid}
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

export const signInWithEmail = async (
  app: FirebaseApp,
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const auth = getAuth(app)
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result
  } catch (err) {
    // TODO Handle errors
    return Promise.reject(err)
  }
}
