import * as fbConfig from '../../firebase.json'
import { createApp } from '../dbApi'

const { emulators, projects } = fbConfig
const { firestore, auth } = emulators

export const projectId = projects.dev
export const dbPort = firestore.port
export const authPort = auth.port
export const apiKey = 'test-auth-key'
export const host = 'localhost'
export const firebaseConfig = { projectId, apiKey }
export const app = createApp(firebaseConfig)
export const idToken =
  '{"sub": "abc123", "email": "foo@example.com", "email_verified": true, "name":"test"}'

export const wait = (timeMs: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeMs)
  })
}
