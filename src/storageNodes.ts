import {
  ListResult as StorageListResult,
  StorageReference
} from 'firebase/storage'

export interface ResultList {
  files: StorageNode[]
  folders: StorageNode[]
}

export interface StorageNode {
  type: 'file' | 'folder'
  name: string
  path: string
}

export const toStorageItems = (nodes: StorageListResult): ResultList => {
  const files = nodes.items.map((item) => toStorageItem(item, 'file'))
  const folders = nodes.prefixes.map((item) => toStorageItem(item, 'folder'))
  return { files, folders }
}

export const toStorageItem = (
  ref: StorageReference,
  type: 'file' | 'folder'
): StorageNode => {
  return {
    type,
    name: ref.name,
    path: ref.fullPath
  }
}
