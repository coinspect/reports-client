import * as zlib from 'zlib'
import { promisify } from 'util'
const gunzip = promisify(zlib.gunzip)
const gzip = promisify(zlib.gzip)

export const decompressArrayBuffer = async (
  arrayBuffer: ArrayBuffer
): Promise<ArrayBuffer> => {
  // Convert ArrayBuffer to Buffer
  const buffer = Buffer.from(arrayBuffer)

  // Decompress the Buffer using 'zlib'
  const decompressedBuffer = await gunzip(buffer)

  // Convert the decompressed Buffer back to ArrayBuffer and return it
  return Uint8Array.from(decompressedBuffer).buffer
}

export const compressArrayBuffer = async (
  arrayBuffer: ArrayBuffer
): Promise<Uint8Array> => {
  // Convert ArrayBuffer to Buffer
  const buffer = Buffer.from(arrayBuffer)

  // Compress the Buffer using 'zlib'
  const compressedBuffer = await gzip(buffer)

  // Convert the compressed Buffer back to ArrayBuffer and return it
  return Uint8Array.from(compressedBuffer)
}
