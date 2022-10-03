import { dbApi, getDb, createApi, createApp } from '../dbApi'
import { COLLECTIONS } from '../constants'
import { connectFirestoreEmulator } from 'firebase/firestore'
import {
  dbPort,
  host,
  app,
  idToken,
  firebaseConfig,
  authPort
} from './test-config'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { testUserData } from './auth.test'
import * as a from '../auth'

afterEach(() => {
  jest.clearAllMocks()
})

describe('api', () => {
  const db = getDb(app)
  connectFirestoreEmulator(db, host, dbPort)
  const api = dbApi(db)
  const defaultCollection = api[COLLECTIONS.projects]

  describe('list', () => {
    it('should get a documents list', async () => {
      const result = await defaultCollection.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
      expect(result[0].name).toBe('testProject')
      expect(result[0].id).not.toBe(undefined)
    })
  })

  describe('get', () => {
    it('should get a doc by ID', async () => {
      const docs = await defaultCollection.list()
      const doc = docs[0]
      const doc2 = await defaultCollection.get(doc.id)
      expect(doc2).toStrictEqual(doc)
    })
  })

  describe('create', () => {
    it('should create a new doc', async () => {
      const elements = await defaultCollection.list()
      const name = 'newElement'
      const id = await defaultCollection.create({ name })
      expect(typeof id).toBe('string')
      const data = await defaultCollection.get(id)
      expect(data).toStrictEqual({ id, name })
      const newElements = await defaultCollection.list()
      expect(newElements.length).toBe(elements.length + 1)
    })
  })

  describe('update', () => {
    it('should update a doc', async () => {
      const list = await defaultCollection.list()
      const { id, name } = list[0]
      const newName = `${name}-${Date.now()}`
      await defaultCollection.update(id, { name: newName })
      const data = await defaultCollection.get(id)
      expect(data).not.toBe(undefined)
      expect(data?.name).toBe(newName)
    })
  })

  describe('remove', () => {
    it('should remove a doc', async () => {
      const elements = await defaultCollection.list()
      const id = await defaultCollection.create({ name: 'test' })
      let newElements = await defaultCollection.list()
      expect(newElements.length).toBe(elements.length + 1)
      await defaultCollection.remove(id)
      newElements = await defaultCollection.list()
      expect(newElements.length).toBe(elements.length)
    })
  })

  describe('subscribe', () => {
    let changes: number[] = []
    it('should subscribe and unsubscribe to collection changes', async () => {
      const originalData = await defaultCollection.list()

      const unsub = await defaultCollection.subscribe((query) => {
        changes.push(Date.now())
      })
      expect(changes.length).toBe(0)
      expect(typeof unsub).toBe('function')

      await defaultCollection.create({ name: `${Date.now()}` })
      await defaultCollection.create({ name: `${Date.now()}` })
      const l = changes.length
      expect(l >= 2).toBe(true)
      unsub()
      await defaultCollection.create({ name: `${Date.now()}` })
      const newData = await defaultCollection.list()
      expect(changes.length).toBe(l)
      expect(newData.length).toBe(originalData.length + l)
    })
  })

  describe('subscribeDoc', () => {
    it('should subscribe and unsubscribe to doc changes', async () => {
      const data: { name?: string }[] = []
      const elements = await defaultCollection.list()
      const { id } = elements[0]
      const unsub = await defaultCollection.subscribeDoc(id, async (doc) => {
        data.push({ ...doc })
      })
      expect(typeof unsub).toBe('function')
      expect(data.length).toBe(0)
      let name = Date.now()
      await defaultCollection.update(id, { name })
      expect(data.length > 0).toBe(true)
      expect(data[0]?.name).toBe(name)
      name = Date.now()
      await defaultCollection.update(id, { name })
      const l = data.length
      expect(l >= 1).toBe(true)
      expect(data[1]?.name).toBe(name)
      unsub()
      await defaultCollection.update(id, { name: 'xxx' })
      expect(data.length).toBe(l)
      expect(data[1]?.name).toBe(name)
    })
  })
})

describe('createApi', () => {
  const app = createApp(firebaseConfig)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${host}:${authPort}`)
  const { signIn } = createApi(firebaseConfig, app)

  describe('signIn', () => {
    it('should signIn with an idToken and return user info', async () => {
      const result = await signIn(idToken)
      testUserData(idToken, result)
    })

    it('should signIn with a refreshToken and return user info', async () => {
      const { refreshToken } = await signIn(idToken)
      jest
        .spyOn(a, 'refreshIdToken')
        .mockReturnValue(Promise.resolve({ idToken, refreshToken }))
      const result = await signIn(undefined, refreshToken)
      testUserData(idToken, result)
    })
  })
})
