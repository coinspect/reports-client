import * as fbConfig from '../../firebase.json'
import { createApp } from '../dbApi'

const { emulators, projects } = fbConfig
const { firestore, auth, storage } = emulators

export const projectId = projects.dev
export const dbPort = firestore.port
export const storagePort = storage.port
export const authPort = auth.port
export const apiKey = 'test-auth-key'
export const host = 'localhost'
export const bucket = 'default-bucket'
export const firebaseConfig = { projectId, apiKey, storageBucket: bucket }
export const app = createApp(firebaseConfig)
export const idToken =
  '{"sub": "abc123", "email": "foo@example.com", "email_verified": true, "name":"test"}'
