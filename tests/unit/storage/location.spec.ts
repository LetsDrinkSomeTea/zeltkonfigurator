import { describe, expect, it } from 'vitest'
import { NotConfiguredError } from '../../../src/storage/DataStore'
import {
  DEFAULT_CONFIG,
  findSpace,
  readStorageConfig,
  resolveLocation
} from '../../../src/storage/location'

const spaces = [
  { id: 'a1', name: 'Marie', driveType: 'personal' },
  { id: 'b2', name: 'Material Team', driveType: 'project' },
  { id: 'c3', name: 'Andere', driveType: 'project' }
]

describe('readStorageConfig', () => {
  it('uses defaults for missing or invalid config', () => {
    expect(readStorageConfig(undefined)).toEqual(DEFAULT_CONFIG)
    expect(readStorageConfig({ space: 5, path: '  ' })).toEqual(DEFAULT_CONFIG)
    expect(DEFAULT_CONFIG).toEqual({ space: 'Material-Team', path: 'Zeltmaterial.bestand' })
  })

  it('trims values and slashes', () => {
    expect(readStorageConfig({ space: ' Lager ', path: '/Zelte/Material.bestand' })).toEqual({
      space: 'Lager',
      path: 'Zelte/Material.bestand'
    })
  })

  it('rejects path traversal', () => {
    expect(() => readStorageConfig({ path: '../x.bestand' })).toThrow(NotConfiguredError)
    expect(() => readStorageConfig({ path: 'a//x.bestand' })).toThrow(NotConfiguredError)
  })
})

describe('findSpace / resolveLocation', () => {
  it('finds by name case-insensitively with trim', () => {
    expect(findSpace(spaces, '  material TEAM ')?.id).toBe('b2')
  })

  it('treats spaces, hyphens and underscores in names alike', () => {
    expect(findSpace(spaces, 'Material-Team')?.id).toBe('b2')
    expect(findSpace(spaces, 'material_team')?.id).toBe('b2')
  })

  it('prefers the exactly matching name', () => {
    const list = [
      { id: 'x', name: 'Material Team', driveType: 'project' },
      { id: 'y', name: 'Material-Team', driveType: 'project' }
    ]
    expect(findSpace(list, 'Material-Team')?.id).toBe('y')
    expect(findSpace(list, 'material team')?.id).toBe('x')
  })

  it('finds by id', () => {
    expect(findSpace(spaces, 'c3')?.name).toBe('Andere')
  })

  it('prefers project spaces for equal names', () => {
    const list = [
      { id: 'x', name: 'Lager', driveType: 'share' },
      { id: 'y', name: 'Lager', driveType: 'project' }
    ]
    expect(findSpace(list, 'lager')?.id).toBe('y')
  })

  it('resolves the configured location', () => {
    const loc = resolveLocation(DEFAULT_CONFIG, spaces)
    expect(loc.space.id).toBe('b2')
    expect(loc.path).toBe('Zeltmaterial.bestand')
  })

  it('throws NotConfiguredError with a German message when missing', () => {
    expect(() => resolveLocation({ space: 'Gibt es nicht', path: 'x' }, spaces)).toThrow(
      NotConfiguredError
    )
    expect(() => resolveLocation({ space: 'Gibt es nicht', path: 'x' }, spaces)).toThrow(
      /Space „Gibt es nicht“ wurde nicht gefunden/
    )
  })
})
