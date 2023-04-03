export interface CredentialsStorer {
  set: <T>(key: string, value: T) => Promise<void>
  get: <T>(key: string) => Promise<T | null>
  remove: (key: string) => Promise<void>
}

export const createPersistence = (store: CredentialsStorer) => {
  return class {
    static type: 'NONE' = 'NONE'
    readonly type = 'NONE' as any

    async _isAvailable(): Promise<boolean> {
      return true
    }

    async _set<T>(key: string, value: T): Promise<void> {
      await store.set(key, value)
    }

    async _get<T>(key: string): Promise<T | null | undefined> {
      return await store.get(key)
    }

    async _remove(key: string): Promise<void> {
      await store.remove(key)
    }

    _addListener(_key: string, _listener: any): void {
      // Listeners are not supported
      return
    }

    _removeListener(_key: string, _listener: any): void {
      // Listeners are not supported
      return
    }
  }
}
