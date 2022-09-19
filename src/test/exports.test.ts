import * as x from '../index'

describe('Exports', () => {
  test('api should be exported', () => {
    expect(typeof x.api).toBe('function')
    expect(typeof x.createApi).toBe('function')
  })
})
