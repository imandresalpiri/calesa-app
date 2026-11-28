// Capas y páginas de prueba para los tests del editor de artes (el sufijo `.soporte.` lo deja fuera del mapa).
import type { CapaDeArte, PaginaDeArte } from '../documento'

export function rect(
  id: string,
  grupoId: string | null = null,
  caja: Partial<Pick<CapaDeArte, 'x' | 'y' | 'ancho' | 'alto'>> = {},
): CapaDeArte {
  return {
    id,
    tipo: 'forma',
    forma: 'rectangulo',
    lados: null,
    nombre: null,
    grupoId,
    x: 0,
    y: 0,
    ancho: 10,
    alto: 10,
    rotacion: 0,
    opacidad: 1,
    bloqueada: false,
    oculta: false,
    sombra: null,
    relleno: '#000000',
    borde: null,
    grosor: 0,
    radio: 0,
    ...caja,
  }
}

export function pagina(capas: CapaDeArte[], grupos: string[] = []): PaginaDeArte {
  return {
    id: 'p',
    fondo: { tipo: 'color', color: '#ffffff' },
    capas,
    grupos: grupos.map((id) => ({ id, nombre: `Grupo ${id}`, oculto: false, bloqueado: false })),
  }
}
