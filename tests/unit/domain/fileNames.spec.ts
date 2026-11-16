import {
  isValidPacklistId,
  matchAppFile,
  packlistFileId,
  sanitizeFileName
} from '../../../src/domain/fileNames'

describe('sanitizeFileName', () => {
  it('lässt normale Namen samt Umlauten und Leerzeichen stehen', () => {
    expect(sanitizeFileName('Sommerlager 2027 – Küche')).toBe('Sommerlager 2027 – Küche')
  })
  it('ersetzt problematische Zeichen und räumt Leerraum auf', () => {
    expect(sanitizeFileName('  Pfingsten/Mai: 100%?  ')).toBe('Pfingsten Mai 100')
    expect(sanitizeFileName('..versteckt')).toBe('versteckt')
  })
  it('fällt bei leerem Ergebnis auf „Packliste“ zurück und kürzt lange Namen', () => {
    expect(sanitizeFileName(' /// ')).toBe('Packliste')
    expect(sanitizeFileName('x'.repeat(200))).toHaveLength(80)
  })
})

describe('packlistFileId', () => {
  it('nimmt den Namen, wenn er frei ist', () => {
    expect(packlistFileId('Sommerlager', ['Herbst'])).toBe('Sommerlager')
  })
  it('hängt eine Nummer an, ohne Groß-/Kleinschreibung zu unterscheiden', () => {
    expect(packlistFileId('Sommerlager', ['sommerlager', 'Sommerlager (2)'])).toBe(
      'Sommerlager (3)'
    )
  })
})

describe('isValidPacklistId', () => {
  it('erlaubt Dateinamen, aber keine Pfade', () => {
    expect(isValidPacklistId('Sommerlager 2027')).toBe(true)
    expect(isValidPacklistId('a/b')).toBe(false)
    expect(isValidPacklistId('..')).toBe(false)
    expect(isValidPacklistId('')).toBe(false)
  })
})

describe('matchAppFile', () => {
  const folder = 'Zeltkonfigurator'
  it('erkennt eine Packliste im Ablageort, egal wie der Space im Pfad heißt', () => {
    expect(
      matchAppFile(
        'project/material-team/Zeltkonfigurator/packlisten/Sommerlager 2027.packliste',
        folder
      )
    ).toEqual({ kind: 'packliste', id: 'Sommerlager 2027' })
  })
  it('erkennt den Bestand', () => {
    expect(matchAppFile('project/x/Zeltkonfigurator/bestand.zeltbestand', folder)).toEqual({
      kind: 'bestand'
    })
  })
  it('kommt mit verschachtelten Ordnern zurecht', () => {
    expect(matchAppFile('p/s/Material/Zelte/packlisten/A.packliste', 'Material/Zelte')).toEqual({
      kind: 'packliste',
      id: 'A'
    })
  })
  it('lehnt Dateien an anderer Stelle ab', () => {
    expect(matchAppFile('project/x/Anderswo/A.packliste', folder)).toBeNull()
    expect(matchAppFile('project/x/Zeltkonfigurator/packlisten/A.yaml', folder)).toBeNull()
    expect(matchAppFile('project/x/Kopie/bestand.zeltbestand', folder)).toBeNull()
    expect(matchAppFile('', folder)).toBeNull()
  })
})
