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
  whereArgs?: WhereArgs | undefined
): Query => {
  if (!whereArgs) {
    return collectionRef
  }
  const w = where(...whereArgs)
  const q = query(collectionRef, w)
  return q
}

type CollectionList = {
  [key: string]: string
}

export type CollectionMethods = {
  list: (whereArgs?: WhereArgs | undefined) => Promise<any[]>
  get: (id: string) => Promise<DbDoc | undefined>
  create: (data: DbDoc) => Promise<string>
  update: (id: string, data: {}) => Promise<void>
  subscribe: (cb: (doc: {}) => void, whereArgs?: WhereArgs) => Unsubscribe
  subscribeDoc: (id: string, cb: (doc: {}) => void) => Promise<Unsubscribe>
  remove: (id: string) => Promise<void>
}

export const collectionApi = (col: CollectionReference) => {
  const getDocRef = (id: string) => doc(col, id)
  const getSnapshot = (id: string) => getDoc(getDocRef(id))

  const list = async (whereArgs?: undefined | WhereArgs): Promise<any[]> => {
    const q = createQuery(col, whereArgs)
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
    const ref = doc(col, id)
    const res = await updateDoc(ref, data)
  }

  const get = async (id: string): Promise<any> => {
    const snap = await getSnapshot(id)
    return getSnapData(snap)
  }

  const subscribe = (cb: Function, whereArgs?: WhereArgs) => {
    const q = createQuery(col, whereArgs)
    const unsub = onSnapshot(q, () => {
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
  return Object.freeze({
    list,
    get,
    create,
    update,
    remove,
    subscribe,
    subscribeDoc
  })
}

export const dbApi = (db: Firestore, cols: CollectionList) => {
  const collections = Object.entries(cols).reduce(
    (v: { [k: string]: CollectionMethods }, a) => {
      const [key, name] = a
      v[key] = collectionApi(collection(db, name))
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
): Readonly<{
  cols: Readonly<{ [key: string]: CollectionMethods }>
  signIn: (idToken: string) => Promise<UserData>
  signOut: Function
}> => {
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

  const cols = dbApi(getDb(app), collections)

  const { signOut } = getAuth(app)

  return Object.freeze({ cols, signIn, signOut })
}

export default dbApi
