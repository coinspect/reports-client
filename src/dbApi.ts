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
  Query,
  collectionGroup,
  QueryConstraint
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

type WhereArgs = [FieldPath | string | string[], WhereFilterOp, any]

export const parseWhereArgs = (
  whereArgs: WhereArgs
): [FieldPath, WhereFilterOp, any] => {
  let [p, op, value] = whereArgs
  p = Array.isArray(p) ? new FieldPath(...p) : new FieldPath(`${p}`)
  return [p, op, value]
}

export const createWhere = (
  whereArgs: WhereArgs | undefined
): QueryConstraint | undefined => {
  if (!whereArgs) {
    return
  }
  return where(...parseWhereArgs(whereArgs))
}

export const createQuery = (
  ref: CollectionReference | Query,
  whereArgs?: WhereArgs | undefined
): Query => {
  const w = createWhere(whereArgs)
  if (!w) {
    return ref
  }
  const q = query(ref, w)
  return q
}

type CollectionList = {
  [key: string]: string
}

export type CollectionMethods = {
  list: (whereArgs?: WhereArgs | undefined) => Promise<any[]>
  get: (id: string) => Promise<DbDoc | undefined>
  create: (data: DbDoc) => Promise<string>
  update: (id: string, data: {}, path?: string[] | string) => Promise<void>
  subscribe: (cb: (doc: {}) => void, whereArgs?: WhereArgs) => Unsubscribe
  subscribeDoc: (id: string, cb: (doc: {}) => void) => Promise<Unsubscribe>
  remove: (id: string) => Promise<void>
}

const listDocuments = async (q: Query): Promise<any[]> => {
  const snp = await getDocs(q)
  return snp.docs.map((doc) => getSnapData(doc))
}

export const collectionApi = (col: CollectionReference) => {
  const getDocRef = (id: string) => doc(col, id)
  const getSnapshot = (id: string) => getDoc(getDocRef(id))

  const list = async (whereArgs?: undefined | WhereArgs): Promise<any[]> =>
    listDocuments(createQuery(col, whereArgs))

  const create = async (data: {}) => {
    const ref = await addDoc(col, data)
    return ref.id
  }

  const update = async (id: string, data: {}, path?: string[] | string) => {
    if (!id) {
      throw new Error('Missing id')
    }
    const ref = doc(col, id)
    const fp = Array.isArray(path) ? new FieldPath(...path) : path
    return fp ? updateDoc(ref, fp, data) : updateDoc(ref, data)
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

export const groupApi = (db: Firestore) => {
  const group = (collectionId: string) => {
    const q = collectionGroup(db, collectionId)

    const list = (whereArgs?: WhereArgs) =>
      listDocuments(createQuery(q, whereArgs))
    return Object.freeze({ list })
  }
  return group
}

export const createSelect = (db: Firestore, path: string[] | string) => {
  path = Array.isArray(path) ? path.join('/') : path
  return collectionApi(collection(db, path))
}

export const createApi = (
  firebaseConfig?: {},
  app?: FirebaseApp | undefined,
  collections?: CollectionList
): Readonly<{
  cols: Readonly<{ [key: string]: CollectionMethods }>
  signIn: (idToken: string) => Promise<UserData>
  signOut: Function
  group: Function
  select: Function
  onIdTokenChanged: Function
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

  const db = getDb(app)
  const cols = dbApi(db, collections)

  const { signOut, onIdTokenChanged } = getAuth(app)
  const group = groupApi(db)
  const select = (path: string | string[]) => createSelect(db, path)

  return Object.freeze({
    cols,
    signIn,
    signOut,
    group,
    select,
    onIdTokenChanged
  })
}

export default dbApi
