import { describe, expect, it } from 'vitest'
import { accionDeLaTecla, type Tecla } from './atajos'

const t = (key: string, m: Partial<Omit<Tecla, 'key'>> = {}): Tecla => ({
  key,
  ctrl: false,
  meta: false,
  shift: false,
  alt: false,
  ...m,
})

describe('accionDeLaTecla', () => {
  it('las flechas mueven; con Shift extienden', () => {
    expect(accionDeLaTecla(t('ArrowDown'))).toEqual({
      tipo: 'mover',
      direccion: 'abajo',
      extender: false,
    })
    expect(accionDeLaTecla(t('ArrowLeft', { shift: true }))).toEqual({
      tipo: 'mover',
      direccion: 'izquierda',
      extender: true,
    })
    expect(accionDeLaTecla(t('ArrowUp'))?.tipo).toBe('mover')
    expect(accionDeLaTecla(t('ArrowRight'))).toMatchObject({ direccion: 'derecha' })
  })
  it('Home y End van al borde de la fila; con Ctrl, a la primera y la última casilla', () => {
    expect(accionDeLaTecla(t('Home'))).toMatchObject({ direccion: 'inicio' })
    expect(accionDeLaTecla(t('End'))).toMatchObject({ direccion: 'fin' })
    expect(accionDeLaTecla(t('Home', { ctrl: true }))).toMatchObject({ direccion: 'primera' })
    expect(accionDeLaTecla(t('End', { meta: true, shift: true }))).toEqual({
      tipo: 'mover',
      direccion: 'ultima',
      extender: true,
    })
  })
  it('deshacer y rehacer con Ctrl o Cmd: Z, Y y Shift+Z', () => {
    expect(accionDeLaTecla(t('z', { ctrl: true }))).toEqual({ tipo: 'deshacer' })
    expect(accionDeLaTecla(t('z', { meta: true }))).toEqual({ tipo: 'deshacer' })
    expect(accionDeLaTecla(t('y', { ctrl: true }))).toEqual({ tipo: 'rehacer' })
    expect(accionDeLaTecla(t('Z', { ctrl: true, shift: true }))).toEqual({ tipo: 'rehacer' })
  })
  it('copiar, pegar, todo y la columna con Ctrl', () => {
    expect(accionDeLaTecla(t('c', { ctrl: true }))).toEqual({ tipo: 'copiar' })
    expect(accionDeLaTecla(t('v', { meta: true }))).toEqual({ tipo: 'pegar' })
    expect(accionDeLaTecla(t('a', { ctrl: true }))).toEqual({ tipo: 'todo' })
    expect(accionDeLaTecla(t(' ', { ctrl: true }))).toEqual({ tipo: 'columna' })
    expect(accionDeLaTecla(t('x', { ctrl: true }))).toBeNull()
  })
  it('Enter y F2 escriben; Supr y Retroceso vacían; Esc suelta; Shift+Espacio elige la fila', () => {
    expect(accionDeLaTecla(t('Enter'))).toEqual({ tipo: 'editar' })
    expect(accionDeLaTecla(t('F2'))).toEqual({ tipo: 'editar' })
    expect(accionDeLaTecla(t('Delete'))).toEqual({ tipo: 'vaciar' })
    expect(accionDeLaTecla(t('Backspace'))).toEqual({ tipo: 'vaciar' })
    expect(accionDeLaTecla(t('Escape'))).toEqual({ tipo: 'soltar' })
    expect(accionDeLaTecla(t(' ', { shift: true }))).toEqual({ tipo: 'fila' })
  })
  it('el menú contextual con Shift+F10 o la tecla Menú', () => {
    expect(accionDeLaTecla(t('F10', { shift: true }))).toEqual({ tipo: 'menu' })
    expect(accionDeLaTecla(t('ContextMenu'))).toEqual({ tipo: 'menu' })
    expect(accionDeLaTecla(t('F10'))).toBeNull()
  })
  it('una letra (o un signo, o «=») empieza a escribir; un espacio solo, Tab o Alt, no', () => {
    expect(accionDeLaTecla(t('a'))).toEqual({ tipo: 'escribir', texto: 'a' })
    expect(accionDeLaTecla(t('Á', { shift: true }))).toEqual({ tipo: 'escribir', texto: 'Á' })
    expect(accionDeLaTecla(t('='))).toEqual({ tipo: 'escribir', texto: '=' })
    expect(accionDeLaTecla(t(' '))).toBeNull()
    expect(accionDeLaTecla(t('Tab'))).toBeNull()
    expect(accionDeLaTecla(t('a', { alt: true }))).toBeNull()
    expect(accionDeLaTecla(t('ArrowDown', { alt: true }))).toBeNull()
  })
  it('`?` no escribe: la grilla lo deja pasar a la ayuda de atajos', () => {
    expect(accionDeLaTecla(t('?', { shift: true }))).toBeNull()
  })
})
