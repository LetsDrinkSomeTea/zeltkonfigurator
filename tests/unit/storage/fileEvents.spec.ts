import { createWatchFile, parseFileEvent } from '../../../src/storage/fileEvents'

class FakeEventSource {
  listeners = new Map<string, Set<(e: MessageEvent) => void>>()
  addEventListener(type: string, l: (e: MessageEvent) => void) {
    const set = this.listeners.get(type) ?? new Set()
    set.add(l)
    this.listeners.set(type, set)
  }
  removeEventListener(type: string, l: (e: MessageEvent) => void) {
    this.listeners.get(type)?.delete(l)
  }
  emit(type: string, data: object) {
    for (const l of this.listeners.get(type) ?? []) {
      l({ data: JSON.stringify(data) } as MessageEvent)
    }
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('createWatchFile', () => {
  it('reports writes of the watched file by others, with a normalized etag', async () => {
    const source = new FakeEventSource()
    const watch = createWatchFile(
      () => source,
      () => 'me'
    )
    const listener = vi.fn()
    watch({ fileId: () => 'f1' }, listener)
    source.emit('file-touched', { itemid: 'f1', initiatorid: 'other', etag: '"abc"' })
    source.emit('postprocessing-finished', { itemid: 'f1', etag: 'W/"def"' })
    await flush()
    expect(listener.mock.calls).toEqual([[{ etag: 'abc' }], [{ etag: 'def' }]])
  })

  it('ignores own writes, other files and unrelated events', async () => {
    const source = new FakeEventSource()
    const watch = createWatchFile(
      () => source,
      () => 'me'
    )
    const listener = vi.fn()
    watch({ fileId: () => 'f1' }, listener)
    source.emit('file-touched', { itemid: 'f1', initiatorid: 'me', etag: 'x' })
    source.emit('file-touched', { itemid: 'f2', initiatorid: 'other', etag: 'x' })
    source.emit('item-renamed', { itemid: 'f1', initiatorid: 'other' })
    await flush()
    expect(listener).not.toHaveBeenCalled()
  })

  it('looks up an unknown file id lazily and stops after unsubscribing', async () => {
    const source = new FakeEventSource()
    const watch = createWatchFile(
      () => source,
      () => undefined
    )
    const resolveFileId = vi.fn().mockResolvedValue('f1')
    const listener = vi.fn()
    const stop = watch({ fileId: () => undefined, resolveFileId }, listener)
    source.emit('file-touched', { itemid: 'f1' })
    await flush()
    expect(listener).toHaveBeenCalledWith({ etag: null })
    stop()
    source.emit('file-touched', { itemid: 'f1' })
    await flush()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(resolveFileId).toHaveBeenCalledTimes(1)
  })

  it('does nothing without an event source', () => {
    const watch = createWatchFile(
      () => null,
      () => 'me'
    )
    expect(() => watch({ fileId: () => 'f1' }, vi.fn())()).not.toThrow()
  })
})

describe('parseFileEvent', () => {
  it('accepts JSON objects only', () => {
    expect(parseFileEvent('{"itemid":"a"}')).toEqual({ itemid: 'a' })
    expect(parseFileEvent('kaputt')).toBeNull()
    expect(parseFileEvent(42)).toBeNull()
  })
})
