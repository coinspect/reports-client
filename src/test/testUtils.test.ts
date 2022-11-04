import { wait } from '../utils'

describe('utils', () => {
  describe('wait', () => {
    it('should wait', async () => {
      const time = 1235
      const start = Date.now()
      await wait(time)
      const end = Date.now()
      expect(end >= start + time).toBe(true)
    })
  })
})
