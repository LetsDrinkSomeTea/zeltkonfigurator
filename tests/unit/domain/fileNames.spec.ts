import { packlistName } from '../../../src/domain/fileNames'

describe('packlistName', () => {
  it('nimmt den Dateinamen ohne Pfad und Endung', () => {
    expect(packlistName('Lager/2027/Sommerlager 2027 – Küche.packliste')).toBe(
      'Sommerlager 2027 – Küche'
    )
    expect(packlistName('/Pfila.PACKLISTE')).toBe('Pfila')
  })
  it('lässt andere Endungen stehen', () => {
    expect(packlistName('notiz.txt')).toBe('notiz.txt')
  })
  it('fällt auf „Packliste“ zurück', () => {
    expect(packlistName('')).toBe('Packliste')
    expect(packlistName('ordner/.packliste')).toBe('Packliste')
  })
})
