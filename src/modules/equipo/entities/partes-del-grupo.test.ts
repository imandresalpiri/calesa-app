import { describe, expect, it } from 'vitest'
import { agruparPorModulo, catalogoDesde, partesDelGrupo } from './matriz'

const filaCotizaciones = (clave: string, nombre: string) => ({
  clave,
  nombre,
  descripcion: nombre,
  por_origen: true,
  con_alcance: true,
})

const filaDeNivel = (
  clave: string,
  accion: 'ver' | 'editar',
  nombre: string,
  retirado_en: string | null = null,
) => ({
  clave: `cotizaciones.nivel.${clave}.${accion}`,
  nombre: `${accion === 'ver' ? 'Ver' : 'Editar'} el nivel «${nombre}»`,
  descripcion: 'Qué ve o edita quien lo tiene',
  por_origen: true,
  con_alcance: false,
  nivel_clave: clave,
  cotizaciones_niveles: { nombre, retirado_en },
})

describe('partesDelGrupo', () => {
  const grupoDe = (filasDelGrupo: unknown[]) => {
    const grupo = agruparPorModulo(catalogoDesde(filasDelGrupo)).find(
      (g) => g.modulo === 'cotizaciones',
    )
    if (!grupo) throw new Error('sin grupo de cotizaciones')
    return grupo
  }
  const ver = filaCotizaciones('cotizaciones.ver', 'Ver cotizaciones')
  const crear = filaCotizaciones('cotizaciones.crear', 'Crear cotizaciones')

  it('junta los niveles donde está el primero, con sus dos filas, y deja los demás permisos antes y después', () => {
    const grupo = grupoDe([
      ver,
      filaDeNivel('zeta', 'editar', 'Zeta'),
      filaDeNivel('zeta', 'ver', 'Zeta'),
      filaDeNivel('alamo', 'ver', 'Álamo', '2026-10-24T10:00:00Z'),
      filaDeNivel('alamo', 'editar', 'Álamo', '2026-10-24T10:00:00Z'),
    ])
    const partes = partesDelGrupo(grupo, { conNiveles: true })
    expect(partes.map((p) => p.tipo)).toEqual(['permisos', 'niveles'])
    const niveles = partes[1]?.tipo === 'niveles' ? partes[1].niveles : []
    expect(niveles.map((n) => n.clave)).toEqual(['alamo', 'zeta'])
    expect(niveles[0]?.permisos.map((p) => p.clave)).toEqual([
      'cotizaciones.nivel.alamo.ver',
      'cotizaciones.nivel.alamo.editar',
    ])
    expect(niveles[0]?.retirado).toBe(true)
    expect(niveles[0]?.nombre).toBe('Álamo')
    expect(niveles[1]?.retirado).toBe(false)
  })

  it('con permisos después de los niveles, los pone en una parte aparte y no los mueve', () => {
    const grupo = grupoDe([
      ver,
      filaDeNivel('zeta', 'ver', 'Zeta'),
      filaDeNivel('zeta', 'editar', 'Zeta'),
      crear,
    ])
    const [primero, nivelVer, nivelEditar, ultimo] = grupo.permisos
    if (!primero || !nivelVer || !nivelEditar || !ultimo) throw new Error('faltan permisos')
    // El orden de entrada es el que manda: la fila de «Crear» queda después de las del nivel.
    const partes = partesDelGrupo(
      { ...grupo, permisos: [primero, nivelVer, nivelEditar, ultimo] },
      { conNiveles: false },
    )
    expect(partes.map((p) => p.tipo)).toEqual(['permisos', 'niveles', 'permisos'])
    expect(partes[2]?.tipo === 'permisos' ? partes[2].permisos.map((p) => p.clave) : []).toEqual([
      ultimo.clave,
    ])
  })

  it('sin ningún nivel, con huecos de niveles, el bloque de cotizaciones lleva igual su parte al final', () => {
    const grupo = grupoDe([ver])
    expect(partesDelGrupo(grupo, { conNiveles: true }).map((p) => p.tipo)).toEqual([
      'permisos',
      'niveles',
    ])
    expect(partesDelGrupo(grupo, { conNiveles: false }).map((p) => p.tipo)).toEqual(['permisos'])
  })

  it('un bloque que no es el de los niveles nunca lleva la parte de niveles', () => {
    const grupo = agruparPorModulo(
      catalogoDesde([
        { ...filaCotizaciones('equipo.roles.gestionar', 'Gestionar roles'), por_origen: false },
      ]),
    )[0]
    if (!grupo) throw new Error('sin grupo')
    expect(partesDelGrupo(grupo, { conNiveles: true }).map((p) => p.tipo)).toEqual(['permisos'])
  })
})
