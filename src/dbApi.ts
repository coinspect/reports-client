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
  query
} from 'firebase/firestore'

// See: https://firebase.google.com/docs/web/learn-more#config-object

export const createApp = (firebaseConfig: {}): FirebaseApp =>
  initializeApp(firebaseConfig)

export const getDb = (app: FirebaseApp) => getFirestore(app)

const getSnapData = (snap: DocumentSnapshot): DbDoc | undefined => {
  if (!snap || !snap.exists()) {
    return undefined
  }
  return { id: snap.id, ...snap.data() }
}
type DbDoc = {
  id?: string
  name?: string
}

export const dbApi = (db: Firestore) => {
  type CollectionMethods = {
    list: () => Promise<any[]>
    get: (id: string) => Promise<DbDoc | undefined>
    create: (data: DbDoc) => Promise<string>
    update: (id: string, data: {}) => Promise<void>
    subscribe: (cb: (doc: {}) => void) => Unsubscribe
    subscribeDoc: (id: string, cb: (doc: {}) => void) => Promise<Unsubscribe>
    remove: (id: string) => Promise<void>
  }

  const collections = Object.entries(COLLECTIONS).reduce(
    (v: { [k: string]: CollectionMethods }, a) => {
      const [key, name] = a
      const col = collection(db, name)

      const getDocRef = (id: string) => doc(db, name, id)
      const getSnapshot = (id: string) => getDoc(getDocRef(id))

      const list = async () => {
        const snp = await getDocs(col)
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

export const createApi = (firebaseConfig: {}) =>
  dbApi(getDb(createApp(firebaseConfig)))

export default dbApi
