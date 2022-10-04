import { COLLECTIONS } from './constants'
import { FirebaseApp, initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  Firestore,
  doc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  DocumentSnapshot,
  Unsubscribe,
  query,
  where,
  CollectionReference,
  WhereFilterOp,
  FieldPath,
  Query
} from 'firebase/firestore'

import { singInWithIdToken, getUserDataFromCredential } from './auth'
import { getAuth } from 'firebase/auth'

// See: https://firebase.google.com/docs/web/learn-more#config-object

export const createApp = (firebaseConfig: {}): FirebaseApp =>
  initializeApp(firebaseConfig)

export const getDb = (app: FirebaseApp) => getFirestore(app)

const getSnapData = (snap: DocumentSnapshot): {} | undefined => {
  if (!snap || !snap.exists()) {
    return undefined
  }
  return { id: snap.id, ...snap.data() }
}
type DbDoc = {
  [key: string]: any
}

type WhereArgs = [FieldPath | string, WhereFilterOp, any]

const createQuery = (
  collectionRef: CollectionReference,
  whereArgs: WhereArgs
): Query => {
  const w = where(...whereArgs)
  const q = query(collectionRef, w)
  return q
}

type CollectionList = {
  [key: string]: string
}

export const dbApi = (db: Firestore, cols: CollectionList) => {
  type CollectionMethods = {
    list: (whereArgs?: WhereArgs | undefined) => Promise<any[]>
    get: (id: string) => Promise<DbDoc | undefined>
    create: (data: DbDoc) => Promise<string>
    update: (id: string, data: {}) => Promise<void>
    subscribe: (cb: (doc: {}) => void) => Unsubscribe
    subscribeDoc: (id: string, cb: (doc: {}) => void) => Promise<Unsubscribe>
    remove: (id: string) => Promise<void>
  }

  const collections = Object.entries(cols).reduce(
    (v: { [k: string]: CollectionMethods }, a) => {
      const [key, name] = a
      const col = collection(db, name)

      const getDocRef = (id: string) => doc(db, name, id)
      const getSnapshot = (id: string) => getDoc(getDocRef(id))

      const list = async (whereArgs?: undefined | WhereArgs) => {
        const q = whereArgs ? createQuery(col, whereArgs) : col
        const snp = await getDocs(q)
        return snp.docs.map((doc) => getSnapData(doc))
      }

      const create = async (data: {}) => {
        const ref = await addDoc(col, data)
        return ref.id
      }

      const update = async (id: string, data: {}) => {
        if (!id) {
          throw new Error('Missing id')
        }
        const ref = doc(db, name, id)
        const res = await updateDoc(ref, data)
      }

      const get = async (id: string) => {
        const snap = await getSnapshot(id)
        return getSnapData(snap)
      }

      const subscribe = (cb: Function) => {
        const unsub = onSnapshot(col, () => {
          cb()
        })
        return unsub
      }

      const subscribeDoc = async (id: string, cb: Function) => {
        const docr = await getDocRef(id)
        const unsub = onSnapshot(docr, (doc) => {
          cb(getSnapData(doc))
        })
        return unsub
      }

      const remove = async (id: string) => {
        const docr = await getDocRef(id)
        await deleteDoc(docr)
      }

      v[key] = { list, get, create, update, remove, subscribe, subscribeDoc }
      return v
    },
    {}
  )

  return Object.freeze(collections)
}

export const userDataSchema = {
  email: '',
  name: '',
  idToken: '',
  refreshToken: ''
}

export type UserData = { [K in keyof typeof userDataSchema]: string }

export const createApi = (
  firebaseConfig?: {},
  app?: FirebaseApp | undefined,
  collections?: CollectionList
) => {
  app = app || createApp(firebaseConfig as {})
  collections = collections || COLLECTIONS

  const signIn = async (idToken: string): Promise<UserData> => {
    try {
      const credential = await singInWithIdToken(app as FirebaseApp, idToken)
      const data = await getUserDataFromCredential(credential)

      if (!data.email) {
        throw new Error('Invalid email')
      }

      if (!data.name) {
        throw new Error('Invalid name')
      }

      return data
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const api = dbApi(getDb(app), collections)

  const { signOut } = getAuth(app)

  return Object.freeze({ api, signIn, signOut })
}

export default dbApi
