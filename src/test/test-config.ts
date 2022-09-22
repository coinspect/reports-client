import * as firebaseConfig from '../../firebase.json'

const { emulators, projects } = firebaseConfig
const { firestore, auth } = emulators

export const projectId = projects.dev
export const dbPort = firestore.port
export const authPort = auth.port
export const apiKey = 'test-auth-key'
export const host = 'localhost'
