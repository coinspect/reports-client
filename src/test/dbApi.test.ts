import { dbApi, createApp, getDb } from '../dbApi'
import { COLLECTIONS } from '../constants'
import { connectFirestoreEmulator } from 'firebase/firestore'
import * as firebaseConfig from '../../firebase.json'

const projectId = firebaseConfig.projects.dev
const dbPort = firebaseConfig.emulators.firestore.port

const db = getDb(createApp({ projectId }))
connectFirestoreEmulator(db, 'localhost', dbPort)
const api = dbApi(db)
const defaultCollection = api[COLLECTIONS.projects]

describe('api', () => {
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
    it(' should create a new doc', async () => {
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
    it('should subscribe and unsubscribe to doc changes', async () => {
      const data: { name?: string }[] = []
      const elements = await defaultCollection.list()
      const { id } = elements[0]
      const unsub = await defaultCollection.subscribe(id, (doc) => {
        data.push({ ...doc })
      })
      expect(typeof unsub).toBe('function')
      expect(data.length).toBe(0)
      let name = Date.now()
      await defaultCollection.update(id, { name })
      expect(data.length).toBe(1)
      expect(data[0]?.name).toBe(name)
      name = Date.now()
      await defaultCollection.update(id, { name })
      expect(data.length).toBe(2)
      expect(data[1]?.name).toBe(name)
      unsub()
      await defaultCollection.update(id, { name: 'xxx' })
      expect(data.length).toBe(2)
      expect(data[1]?.name).toBe(name)
    })
  })
})
