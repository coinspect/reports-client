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
  QueryConstraint,
  runTransaction,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocsFromServer,
  getDocFromServer,
  FirestoreError
} from 'firebase/firestore'

import {
  deleteObject,
  FirebaseStorage,
  getDownloadURL,
  getStorage,
  listAll,
  ListResult,
  ref,
  StorageReference,
  uploadBytes,
  UploadMetadata,
  UploadResult
} from 'firebase/storage'

import { singInWithIdToken, getUserData, signInWithEmail } from './auth'
import {
  getAuth,
  initializeAuth,
  User,
  onAuthStateChanged,
  UserCredential
} from 'firebase/auth'
import { toStorageItems, ResultList } from './storageNodes'
import { createPersistence, CredentialsStorer } from './persistence'

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
export type DbDoc = {
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

type LockedUpdateCallBack = (data: DbDoc) => Promise<DbDoc>

export type CollectionMethods = {
  list: (whereArgs?: WhereArgs | undefined, forceServer? : boolean) => Promise<any[]>
  get: (id: string, forceServer? : boolean) => Promise<DbDoc | undefined>
  create: (data: DbDoc) => Promise<string>
  update: (id: string, data: {}, path?: string[] | string) => Promise<void>
  addToArray: (id: string, value: any, path: string[] | string) => Promise<void>
  removeFromArray: (id: string, value: any, path: string[] | string) => Promise<void>
  subscribe: (cb: (doc: {}) => void, whereArgs?: WhereArgs, errorCb?: (error: FirestoreError) => void) => Unsubscribe
  subscribeDoc: (id: string, cb: (doc: {}) => void, errorCb?: (error: FirestoreError) => void) => Promise<Unsubscribe>
  remove: (id: string) => Promise<void>
  lockedUpdate: (id: string, cb: LockedUpdateCallBack, timeout?: number, createIfMissing?: boolean) => Promise<void>
}

const listDocuments = async (q: Query, forceServer = false): Promise<any[]> => {
  const snp = await (forceServer? getDocsFromServer(q) : getDocs(q))
  return snp.docs.map((doc) => getSnapData(doc))
}

export const collectionApi = (db: Firestore, col: CollectionReference): CollectionMethods => {
  const getDocRef = (id: string) => doc(col, id)
  const getSnapshot = (id: string, forceServer = false) => forceServer? getDocFromServer(getDocRef(id)) : getDoc(getDocRef(id))

  const list = async (whereArgs?: undefined | WhereArgs, forceServer = false): Promise<any[]> =>
    listDocuments(createQuery(col, whereArgs), forceServer)

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

  const addToArray = async(id: string, value: any, path: string[] | string) => {
    if (!id) {
      throw new Error('Missing id')
    }
    const ref = doc(col, id)
    const fp = Array.isArray(path) ? new FieldPath(...path) : path
    return updateDoc(ref, fp, arrayUnion(value))
  }

  const removeFromArray = async(id: string, value: any, path: string[] | string) => {
    if (!id) {
      throw new Error('Missing id')
    }
    const ref = doc(col, id)
    const fp = Array.isArray(path) ? new FieldPath(...path) : path
    return updateDoc(ref, fp, arrayRemove(value))
  }

  const get = async (id: string, forceServer = false): Promise<any> => {
    const snap = await getSnapshot(id, forceServer)
    return getSnapData(snap)
  }

  const subscribe = (cb: Function, whereArgs?: WhereArgs, errorCb = (error: FirestoreError) => {return}) => {
    const q = createQuery(col, whereArgs)
    const unsub = onSnapshot(q, () => {
      cb()
    }, errorCb)
    return unsub
  }

  const subscribeDoc = async (id: string, cb: Function, errorCb = (error: FirestoreError) => {return}) => {
    const docr = await getDocRef(id)
    const unsub = onSnapshot(docr, (doc) => {
      cb(getSnapData(doc))
    }, errorCb)
    return unsub
  }

  const remove = async (id: string) => {
    const docr = await getDocRef(id)
    await deleteDoc(docr)
  }


  const lockedUpdate = async (id: string, cb: LockedUpdateCallBack, timeout = 15000, createIfMissing = false) => {
    const docr = await getDocRef(id)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Transaction timed out'))
      }, timeout)
    })
    const sfDocPromise = runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(docr)
      if (!sfDoc.exists() && !createIfMissing) {
        throw new Error('Document does not exist!')
      }
      const data = sfDoc.exists()? sfDoc.data() : {}
      const newData = await cb(data)
      newData.updatedAt = serverTimestamp()
      createIfMissing? transaction.set(docr, newData) : transaction.update(docr, newData)
      return sfDoc
    })
    await Promise.race([sfDocPromise, timeoutPromise])
  }

  return Object.freeze({
    list,
    get,
    create,
    update,
    addToArray,
    removeFromArray,
    remove,
    subscribe,
    subscribeDoc,
    lockedUpdate
  })
}

interface StorageApi {
  download: (path: string) => Promise<string>
  upload: (path: string, bytes: Uint8Array, metadata?: UploadMetadata) => Promise<UploadResult>
  list: (path: string) => Promise<ResultList>
  remove: (path: string) => Promise<void>
  removeFolder: (path: string) => Promise<void[]>
}

export const storageApi = (storage: FirebaseStorage): StorageApi => {
  const download = async (path: string, timeout = 10000): Promise<string> => {
    const fileRef = ref(storage, path)

    const timeoutPromise: Promise<string> = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timed out while getting download url')), timeout)
    )

    return Promise.race([
      getDownloadURL(fileRef),
      timeoutPromise
    ])
  }
  const upload = async (path: string, bytes: Uint8Array, metadata?: UploadMetadata) => {
    const fileRef = ref(storage, path)
    return uploadBytes(fileRef, bytes, metadata)
  }
  const list = async (path: string) => {
    const fileRef = ref(storage, path)
    const result = await listAll(fileRef)
    return toStorageItems(result)
  }
  const remove = async (path: string) => {
    const fileRef = ref(storage, path)
    return deleteObject(fileRef)
  }

  const removeFolder = async (path: string): Promise<void[]> => {
    let folders: StorageReference[] = [ref(storage, path)]
    let promises: Promise<void>[] = []
    while (folders.length > 0) {
      const folder = folders.pop()
      const { items, prefixes } = await listAll(folder!)
      folders = folders.concat(prefixes)
      promises = promises.concat(items.map((item) => deleteObject(item)))
    }
    return Promise.all(promises)
  }

  return Object.freeze({
    download,
    upload,
    list,
    remove,
    removeFolder
  })
}

export const dbApi = (db: Firestore, cols: CollectionList) => {
  const collections = Object.entries(cols).reduce(
    (v: { [k: string]: CollectionMethods }, a) => {
      const [key, name] = a
      v[key] = collectionApi(db, collection(db, name))
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

export type UserData = { [K in keyof typeof userDataSchema]: string | undefined }

export const groupApi = (db: Firestore) => {
  const group = (collectionId: string) => {
    const q = collectionGroup(db, collectionId)

    const list = (whereArgs?: WhereArgs) =>
      listDocuments(createQuery(q, whereArgs))
    return Object.freeze({ list })
  }
  return group
}

export const createSelect = (db: Firestore, path: string[] | string): CollectionMethods => {
  path = Array.isArray(path) ? path.join('/') : path
  return collectionApi(db, collection(db, path))
}

export const createApi = (
  firebaseConfig?: {},
  app?: FirebaseApp | undefined,
  collections?: CollectionList
): Readonly<{
  cols: Readonly<{ [key: string]: CollectionMethods }>
  signIn: (idToken: string) => Promise<UserData>
  signInWithEmailAndPassword: (
    email: string,
    password: string
  ) => Promise<UserData>
  signOut: Function
  group: Function
  select: (path: string | string[]) => CollectionMethods
  getUser: Function
  storage: StorageApi
  initializeAuthentication: (storer: CredentialsStorer) => void
  setAuthListener: (listener: (user: any) => void) => void
}> => {
  app = app || createApp(firebaseConfig as {})
  collections = collections || COLLECTIONS

  const initializeAuthentication = (storer: CredentialsStorer) => {
    initializeAuth(app!, { persistence: [createPersistence(storer)] })
  }

  const setAuthListener = (listener: (user: any) => void) => {
    const auth = getAuth(app!)
    onAuthStateChanged(auth, listener)
  }

  const getData = async (credential: UserCredential): Promise<UserData> => {
    const data = await getUserData(credential.user)
    if (!data.email) {
      throw new Error('Invalid email')
    }

    if (!data.name) {
      throw new Error('Invalid name')
    }

    return data
  }

  const signIn = async (idToken: string): Promise<UserData> => {
    try {
      const credential = await singInWithIdToken(app as FirebaseApp, idToken)
      return getData(credential)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const signInWithEmailAndPassword = async (
    email: string,
    password: string
  ) => {
    try {
      const credential = await signInWithEmail(
        app as FirebaseApp,
        email,
        password
      )
      return getData(credential)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  const db = getDb(app)
  const cols = dbApi(db, collections)
  const storage = storageApi(getStorage(app))

  const signOut = async () => await getAuth(app).signOut()
  const getUser = (): Promise<UserData | {}> =>
    getUserData(getAuth(app).currentUser)
  const group = groupApi(db)
  const select = (path: string | string[]): CollectionMethods => createSelect(db, path)

  return Object.freeze({
    cols,
    storage,
    signIn,
    signInWithEmailAndPassword,
    signOut,
    group,
    select,
    getUser,
    initializeAuthentication,
    setAuthListener
  })
}

export default dbApi
