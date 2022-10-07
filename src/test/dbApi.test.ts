import {
  dbApi,
  getDb,
  createApi,
  createApp,
  groupApi,
  createSelect,
  createWhere,
  createQuery,
  parseWhereArgs
} from '../dbApi'
import { COLLECTIONS } from '../constants'
import {
  connectFirestoreEmulator,
  FieldPath,
  QueryConstraint
} from 'firebase/firestore'
import {
  dbPort,
  host,
  app,
  idToken,
  firebaseConfig,
  authPort,
  wait
} from './test-config'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { testUserData } from './auth.test'
import exp from 'constants'

afterEach(() => {
  jest.clearAllMocks()
})

describe('parseWhereArgs', () => {
  it('should parse whereArgs', () => {
    const t = ['field', 'user@user.com']
    const [fp] = parseWhereArgs([t, '==', 'test'])
    expect(fp).toBeInstanceOf(FieldPath)
    expect(fp.isEqual(new FieldPath(t.join('.')))).toBe(false)
    expect(fp.isEqual(new FieldPath(...t))).toBe(true)
  })
})

describe('createWhere', () => {
  it('should return a QueryConstraint', () => {
    expect(createWhere(['xxx', '!=', 'test@user.com'])).toBeInstanceOf(
      QueryConstraint
    )
    expect(createWhere(['foo.test@user.com', '==', true])).toBeInstanceOf(
      QueryConstraint
    )

    expect(createWhere([['foo', 'test@user.com'], '==', true])).toBeInstanceOf(
      QueryConstraint
    )
  })

  it('should return undefined', () => {
    expect(createWhere(undefined)).toBeUndefined()
  })
})

describe('createQuery', () => {})

describe('api', () => {
  const db = getDb(app)
  connectFirestoreEmulator(db, host, dbPort)
  const cols = dbApi(db, { ...COLLECTIONS, test: 'test' })
  const defaultCollection = cols[COLLECTIONS.projects]

  describe('group', () => {
    const gApi = groupApi(db)
    const group = gApi('files')

    it('should return a list of files', async () => {
      const result = await group.list()
      // Uncomplete
      expect(Array.isArray(result)).toBe(true)
      expect(result.length > 0).toBe(true)
    })

    it('should return a selection of a list of files', async () => {
      const result = await group.list(['name', '==', 'file1'])
      // Uncomplete
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
    })
  })

  describe('select', () => {
    it('should create a collection api from a path', async () => {
      const colName = 'projects'
      const data = await cols[colName].list()
      const path = [colName, data[0].id, 'files']
      const s = createSelect(db, path)
      const result = await s.list()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
    })
  })

  describe('cols', () => {
    describe('list', () => {
      it('should get all documents list', async () => {
        const result = await defaultCollection.list()
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(2)
        expect(result[0].name).toBe('testProject')
        expect(result[0].id).not.toBe(undefined)
      })

      it('should get a list of documents using a query', async () => {
        const name = `xxx-${Date.now()}`
        const c = 4
        await Promise.all(
          [...Array(c)].map((v, i) =>
            defaultCollection.create({ name, test: `${i % 2}` })
          )
        )
        let docs = await defaultCollection.list(['name', '==', name])
        expect(docs.length).toBe(c)
        docs = await defaultCollection.list(['test', '>', '0'])
        expect(docs.length).toBe(c / 2)
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

      it('should update a doc field', async () => {
        const list = await defaultCollection.list()
        const data = list[1]
        const user = 'user@user.com'
        const user2 = 'test@test.com'
        const perms = { [user]: true, [user2]: true }
        await defaultCollection.update(data.id, { ...data, perms })
        let newData = await defaultCollection.get(data.id)
        expect(newData?.perms).toStrictEqual(perms)
        await defaultCollection.update(data.id, false, ['perms', user])
        newData = await defaultCollection.get(data.id)
        expect(newData?.perms[user]).toBe(false)
        expect(newData?.perms[user2]).toBe(true)
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
      const changes: number[] = []
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
        expect(newData.length >= originalData.length + l).toBe(true)
      })

      it('should subscribe a query to collection changes', async () => {
        const changes: any[] = []
        let c = 0
        const name = 'xxxxxxxx'
        const unsub = await cols.test.subscribe(() => {
          changes.push(c++)
        }, ['name', '==', name])

        await cols.test.create({ name })
        await cols.test.create({ name: 'foo' })
        await cols.test.create({ name: 'bar' })
        await cols.test.create({ name })
        await cols.test.create({ name: 'baz' })
        const l = changes.length
        expect(l).toBe(2)
        unsub()
        await cols.test.create({ name })
        await cols.test.create({ name })
        expect(changes.length).toBe(l)
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
        await wait(100)
        expect(data.length > 0).toBe(true)
        expect(data[0]?.name).toBe(name)
        name = Date.now()
        await defaultCollection.update(id, { name })
        await wait(100)
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
})

describe('createApi', () => {
  const app = createApp(firebaseConfig)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${host}:${authPort}`)
  const { signIn, signOut, cols } = createApi(firebaseConfig, app)

  describe('signIn', () => {
    it('should signIn with an idToken and return user info', async () => {
      const result = await signIn(idToken)
      testUserData(idToken, result)
    })
  })
})
