import { storageApi } from '../dbApi'
import { dbPort, host, app, storagePort } from './test-config'
import {
  connectStorageEmulator,
  getStorage,
  UploadResult
} from 'firebase/storage'
import fetch from 'node-fetch'

afterEach(() => {
  jest.clearAllMocks()
})

describe('api', () => {
  const storage = getStorage(app)
  connectStorageEmulator(storage, host, storagePort)
  const stApi = storageApi(storage)

  describe('uploading a file in a folder', () => {
    const file = new Uint8Array([1, 2, 3])
    let result: UploadResult
    beforeAll(async () => {
      result = await stApi.upload('test-folder/test.ext', file)
    })

    it('should return the same name', () => {
      expect(result.ref.name).toEqual('test.ext')
    })

    it('should return the same path', () => {
      expect(result.ref.fullPath).toEqual('test-folder/test.ext')
    })

    it('folder should be in root', async () => {
      const list = await stApi.list('')
      expect(list.folders.length).toEqual(1)
      expect(list.folders[0].name).toEqual('test-folder')
    })

    it('should be listed inside the folder', async () => {
      const list = await stApi.list('test-folder')
      expect(list.files.length).toEqual(1)
      expect(list.files[0].name).toEqual('test.ext')
    })

    it('should have the same content', async () => {
      const downloadLink = await stApi.download('test-folder/test.ext')
      const content = await downloadFile(downloadLink)
      expect(content).toEqual(file)
    })

    afterAll(async () => {
      await stApi.removeFolder('test-folder')
    })
  })

  describe('creating multiple files', () => {
    const file1 = new Uint8Array([1, 2, 3])
    const file2 = new Uint8Array([4, 5, 6])
    let result: UploadResult, result2: UploadResult
    beforeAll(async () => {
      result = await stApi.upload('test-folder/test.ext', file1)
      result2 = await stApi.upload('test-folder/test2.ext', file2)
    })

    it('all files should be listed', async () => {
      const list = await stApi.list('test-folder')
      expect(list.files.length).toEqual(2)
      expect(list.files.map((f) => f.name)).toContainEqual('test.ext')
      expect(list.files.map((f) => f.name)).toContainEqual('test2.ext')
    })

    it('all files should have the correct content', async () => {
      const download1 = await stApi.download('test-folder/test.ext')
      const content = await downloadFile(download1)
      const download2 = await stApi.download('test-folder/test2.ext')
      const content2 = await downloadFile(download2)
      expect(content).toEqual(file1)
      expect(content2).toEqual(file2)
    })

    afterAll(async () => {
      await stApi.removeFolder('test-folder')
    })
  })

  describe('removing a file', () => {
    const file = new Uint8Array([1, 2, 3])
    const file2 = new Uint8Array([4, 5, 6])
    let result: UploadResult, result2: UploadResult
    beforeAll(async () => {
      result = await stApi.upload('test-folder/test.ext', file)
      result2 = await stApi.upload('test-folder/test2.ext', file2)
      const list = await stApi.list('test-folder')

      expect(list.files.length).toEqual(2)

      await stApi.remove('test-folder/test.ext')
    })

    it('should not be listed inside the folder', async () => {
      const list = await stApi.list('test-folder')
      expect(list.files.length).toEqual(1)
      expect(list.files[0].name).not.toEqual('test.ext')
    })

    it('other file should still be in the folder', async () => {
      const list = await stApi.list('test-folder')
      expect(list.files.length).toEqual(1)
      expect(list.files[0].name).toEqual('test2.ext')
    })

    afterAll(async () => {
      await stApi.removeFolder('test-folder')
    })
  })

  describe('removing last file of folder', () => {
    const file = new Uint8Array([1, 2, 3])
    let result: UploadResult
    beforeAll(async () => {
      result = await stApi.upload('test-folder/test.ext', file)
      const list = await stApi.list('test-folder')
      expect(list.files[0].name).toEqual('test.ext')

      await stApi.remove('test-folder/test.ext')
    })

    it('should not be listed inside the folder', async () => {
      const list = await stApi.list('test-folder')
      expect(list.files.length).toEqual(0)
    })

    it("listing the folder doesn't fail", async () => {
      await stApi.list('test-folder')
    })

    it('prefix should be removed', async () => {
      const list = await stApi.list('')
      expect(list.folders.length).toEqual(0)
    })
  })

  describe('removing a folder as file', () => {
    const file = new Uint8Array([1, 2, 3])
    beforeAll(async () => {
      const result = await stApi.upload('test-folder/test.ext', file)
      const list = await stApi.list('test-folder')
      expect(list.files[0].name).toEqual('test.ext')
    })

    it("folders can't be removed", async () => {
      await expect(() => stApi.remove('test-folder')).rejects.toThrow()
    })
  })

  describe('removing folder', () => {
    const file = new Uint8Array([1, 2, 3])
    const file2 = new Uint8Array([4, 5, 6])
    beforeAll(async () => {
      const result = await stApi.upload('test-folder/test.ext', file)
      const result2 = await stApi.upload('test-folder/test2.ext', file2)
      const list = await stApi.list('test-folder')
      expect(list.files.map((f) => f.name)).toContainEqual('test.ext')
      expect(list.files.map((f) => f.name)).toContainEqual('test2.ext')

      await stApi.removeFolder('test-folder')
    })

    it("list doesn't fail", async () => {
      await stApi.list('test-folder')
    })

    it('prefix should be removed', async () => {
      const list = await stApi.list('')
      expect(list.folders.length).toEqual(0)
    })

    it('listing any file should fail', async () => {
      await expect(() =>
        stApi.download('test-folder/test.ext')
      ).rejects.toThrow()
    })
  })
})

const downloadFile = async (url: string) => {
  const response = await fetch(url)
  return new Uint8Array(await response.arrayBuffer())
}
