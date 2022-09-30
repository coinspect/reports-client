import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth'
import { FirebaseApp } from 'firebase/app'

export const singInWithIdToken = async (
  app: FirebaseApp,
  idToken: any,
  accessToken: any
) => {
  try {
    const credential = GoogleAuthProvider.credential(idToken)
    const auth = getAuth(app)
    const result = await signInWithCredential(auth, credential)
    console.log({ credential, result })
    return result
  } catch (err) {
    // TODO Handle errors
    return Promise.reject(err)
  }
}
