import { describe, expect, it } from 'vitest'
import {
  PANELES_DE_LOS_CATALOGOS,
  esPanelDeCatalogo,
  rutaDeTiposDeRepuestos,
  rutaDeUnCatalogo,
  PANEL_NUEVO_DE_VEHICULOS,
  PARAMETRO_DEL_BLOQUE,
  RUTAS,
  conVuelta,
  consultaDelDrawerDeLasTablas,
  rutaDeLaFormula,
  rutaDelOrigen,
  rutaDeParteDelOrigen,
  rutaDeLaPuestaEnMarcha,
  PARTES_DE_LA_FORMULA,
  PASOS_DE_LA_PUESTA_EN_MARCHA,
  PARTES_DEL_ORIGEN,
  decidirAcceso,
  destinoTrasIngresar,
  esRutaPublica,
  returnToSeguro,
  rutaDeIngreso,
  unParametro,
  unidadDeLogistica,
} from './rutas'

describe('returnToSeguro', () => {
  it('acepta una ruta interna con su query', () => {
    expect(returnToSeguro('/leads?vista=embudo')).toBe('/leads?vista=embudo')
  })

  it.each([
    ['otro sitio con esquema', 'https://malo.com'],
    ['otro sitio sin esquema', '//malo.com/x'],
    ['barra invertida', '/\\malo.com'],
    ['salto de línea', '/leads\nSet-Cookie: x=1'],
    ['ruta relativa', 'leads'],
    ['vacío', ''],
  ])('rechaza %s', (_caso, valor) => {
    expect(returnToSeguro(valor)).toBeNull()
  })

  it('rechaza las pantallas de acceso: devolverían al punto de partida', () => {
    expect(returnToSeguro('/ingreso')).toBeNull()
    expect(returnToSeguro('/registro?x=1')).toBeNull()
    expect(returnToSeguro('/auth/nueva-contrasena')).toBeNull()
  })

  it('devuelve null sin valor', () => {
    expect(returnToSeguro(null)).toBeNull()
    expect(returnToSeguro(undefined)).toBeNull()
  })
})

describe('destinoTrasIngresar y rutaDeIngreso', () => {
  it('cae al inicio cuando el returnTo no sirve', () => {
    expect(destinoTrasIngresar('//malo.com')).toBe('/')
    expect(destinoTrasIngresar('/vehiculos')).toBe('/vehiculos')
  })

  it('no agrega returnTo cuando el destino es el inicio', () => {
    expect(rutaDeIngreso('/')).toBe('/ingreso')
    expect(rutaDeIngreso(null)).toBe('/ingreso')
  })

  it('codifica el returnTo completo', () => {
    expect(rutaDeIngreso('/leads?vista=embudo&id=3')).toBe(
      '/ingreso?returnTo=%2Fleads%3Fvista%3Dembudo%26id%3D3',
    )
  })
})

describe('esRutaPublica', () => {
  it('conoce las pantallas de acceso y todo /auth', () => {
    expect(esRutaPublica('/ingreso')).toBe(true)
    expect(esRutaPublica('/recuperar')).toBe(true)
    expect(esRutaPublica('/auth/callback')).toBe(true)
    expect(esRutaPublica('/')).toBe(false)
    expect(esRutaPublica('/ingresos')).toBe(false)
  })

  it('deja pasar lo de /api/portal/, que valida su propia cookie, y nada más', () => {
    expect(esRutaPublica('/api/portal/estado')).toBe(true)
    expect(esRutaPublica('/api/portal/documentos/0b6f8f8e-6f6a-4c1e-9d3e-0a6e2c5b7f10')).toBe(true)
    expect(esRutaPublica('/api/portal')).toBe(false)
    expect(esRutaPublica('/api/portalx')).toBe(false)
    expect(esRutaPublica('/api/portal-x/a')).toBe(false)
  })

  it('sin sesión, una ruta del portal sigue sin ir al ingreso', () => {
    expect(
      decidirAcceso({
        ruta: '/api/portal/estado',
        busqueda: '',
        haySesion: false,
        esAccion: false,
      }),
    ).toEqual({ tipo: 'seguir' })
  })
})

describe('decidirAcceso', () => {
  const base = { busqueda: '', esAccion: false }

  it('sin sesión, una ruta protegida va al ingreso con returnTo', () => {
    expect(
      decidirAcceso({ ...base, ruta: '/leads', busqueda: '?vista=embudo', haySesion: false }),
    ).toEqual({ tipo: 'redirigir', destino: '/ingreso?returnTo=%2Fleads%3Fvista%3Dembudo' })
  })

  it('sin sesión, el inicio va al ingreso sin returnTo', () => {
    expect(decidirAcceso({ ...base, ruta: '/', haySesion: false })).toEqual({
      tipo: 'redirigir',
      destino: '/ingreso',
    })
  })

  it('sin sesión, las públicas siguen', () => {
    for (const ruta of ['/ingreso', '/registro', '/recuperar', '/auth/callback']) {
      expect(decidirAcceso({ ...base, ruta, haySesion: false })).toEqual({ tipo: 'seguir' })
    }
  })

  it('con sesión, ingreso y registro mandan al inicio o al returnTo', () => {
    expect(decidirAcceso({ ...base, ruta: '/ingreso', haySesion: true })).toEqual({
      tipo: 'redirigir',
      destino: '/',
    })
    expect(
      decidirAcceso({
        ...base,
        ruta: '/registro',
        busqueda: '?returnTo=%2Fvehiculos',
        haySesion: true,
      }),
    ).toEqual({ tipo: 'redirigir', destino: '/vehiculos' })
  })

  it('con sesión, un returnTo hacia afuera se ignora', () => {
    expect(
      decidirAcceso({
        ...base,
        ruta: '/ingreso',
        busqueda: '?returnTo=%2F%2Fmalo.com',
        haySesion: true,
      }),
    ).toEqual({ tipo: 'redirigir', destino: '/' })
  })

  it('con sesión, recuperar y /auth siguen: ahí se cambia la contraseña', () => {
    expect(decidirAcceso({ ...base, ruta: '/recuperar', haySesion: true })).toEqual({
      tipo: 'seguir',
    })
    expect(decidirAcceso({ ...base, ruta: '/auth/nueva-contrasena', haySesion: true })).toEqual({
      tipo: 'seguir',
    })
  })

  it('una Server Action nunca se redirige, ni sin sesión', () => {
    expect(
      decidirAcceso({ ruta: '/perfil', busqueda: '', haySesion: false, esAccion: true }),
    ).toEqual({ tipo: 'seguir' })
  })
})

describe('unParametro', () => {
  it('toma el valor o el primero si vino repetido', () => {
    expect(unParametro('a')).toBe('a')
    expect(unParametro(['a', 'b'])).toBe('a')
    expect(unParametro(undefined)).toBeUndefined()
    expect(unParametro([])).toBeUndefined()
  })
})

describe('unidadDeLogistica', () => {
  it('es la ruta del panel de una unidad, la que abre la notificación de demora', () => {
    expect(unidadDeLogistica('6f1b7c1e-2f0a-4e0f-9c52-1d7c1a2b3c4d')).toBe(
      '/logistica/vehiculo/6f1b7c1e-2f0a-4e0f-9c52-1d7c1a2b3c4d',
    )
  })

  it('un id con caracteres de ruta no sale de ella', () => {
    expect(unidadDeLogistica('../x?y#z')).toBe('/logistica/vehiculo/..%2Fx%3Fy%23z')
  })
})

describe('rutas de crear', () => {
  it('«Nuevo vehículo» abre el panel con el valor compartido', () => {
    expect(RUTAS.nuevoVehiculo).toBe(`/vehiculos?panel=${PANEL_NUEVO_DE_VEHICULOS}`)
  })

  it('la hoja de cotizar y el listado cuelgan de /cotizaciones', () => {
    expect(RUTAS.nuevaCotizacion).toBe(`${RUTAS.cotizaciones}/nuevo`)
  })
})

describe('conVuelta', () => {
  it('suma returnTo codificado a una ruta con consulta y vuelve con returnToSeguro', () => {
    const ruta = conVuelta('/cotizaciones/nuevo?origen=o1&lead=l1', '/leads?vista=tarjetas&por=25')
    expect(ruta).toBe(
      '/cotizaciones/nuevo?origen=o1&lead=l1&returnTo=%2Fleads%3Fvista%3Dtarjetas%26por%3D25',
    )
    const leido = new URLSearchParams(ruta.split('?')[1]).get('returnTo')
    expect(returnToSeguro(leido)).toBe('/leads?vista=tarjetas&por=25')
  })

  it('sin consulta la crea, reemplaza un returnTo anterior y sin volverA no toca nada', () => {
    expect(conVuelta('/x', '/leads')).toBe('/x?returnTo=%2Fleads')
    expect(conVuelta('/x?returnTo=%2Fviejo', '/nuevo')).toBe('/x?returnTo=%2Fnuevo')
    expect(conVuelta('/x?a=1', null)).toBe('/x?a=1')
  })
})

describe('consultaDelDrawerDeLasTablas', () => {
  const O = '11111111-1111-4111-8111-111111111111'

  it('abre el drawer de las tablas en la planilla del origen', () => {
    expect(rutaDeParteDelOrigen(O, 'planilla', consultaDelDrawerDeLasTablas())).toBe(
      `/configuracion/origenes/${O}/planilla?panel=tablas`,
    )
  })

  it('el panel de una tabla pasa a `accion` y la consulta se codifica', () => {
    expect(
      rutaDeParteDelOrigen(
        O,
        'planilla',
        consultaDelDrawerDeLasTablas({ tabla: 't 1', panel: 'publicar-tabla' }),
      ),
    ).toBe(`/configuracion/origenes/${O}/planilla?panel=tablas&tabla=t+1&accion=publicar-tabla`)
  })
})

describe('rutaDeLaFormula', () => {
  const O = '11111111-1111-4111-8111-111111111111'
  const F = '22222222-2222-4222-8222-222222222222'
  it('cada pestaña de la fórmula con la elegida primero y el resto de su consulta; sin fórmula, la de trabajo', () => {
    expect(PARTES_DE_LA_FORMULA.map((parte) => rutaDeLaFormula(O, F, parte))).toEqual([
      `/configuracion/origenes/${O}/planilla?formula=${F}`,
      `/configuracion/origenes/${O}/hoja?formula=${F}`,
      `/configuracion/origenes/${O}/tarjeta?formula=${F}`,
    ])
    expect(rutaDeLaFormula('a/b', F, 'planilla', { fila: 'n1' })).toBe(
      `/configuracion/origenes/a%2Fb/planilla?formula=${F}&fila=n1`,
    )
    expect(rutaDeLaFormula(O, null, 'hoja', { vista: '412' })).toBe(
      `/configuracion/origenes/${O}/hoja?vista=412`,
    )
  })
})

describe('rutaDeParteDelOrigen y rutaDelOrigen', () => {
  const O = '11111111-1111-4111-8111-111111111111'

  it('lleva a cada pestaña del origen, en su orden, con su consulta', () => {
    expect(PARTES_DEL_ORIGEN.map((parte) => rutaDeParteDelOrigen(O, parte))).toEqual([
      `/configuracion/origenes/${O}/fases`,
      `/configuracion/origenes/${O}/planilla`,
      `/configuracion/origenes/${O}/hoja`,
      `/configuracion/origenes/${O}/tarjeta`,
      `/configuracion/origenes/${O}/campos`,
      `/configuracion/origenes/${O}/categorias`,
    ])
    expect(rutaDeParteDelOrigen(O, 'fases', { fase: 'f', vista: 'lista' })).toBe(
      `/configuracion/origenes/${O}/fases?fase=f&vista=lista`,
    )
  })

  it('la página sin pestaña, con su consulta', () => {
    expect(rutaDelOrigen(O)).toBe(`/configuracion/origenes/${O}`)
    expect(rutaDelOrigen(O, { panel: 'datos' })).toBe(`/configuracion/origenes/${O}?panel=datos`)
  })
})

describe('rutaDeLaPuestaEnMarcha', () => {
  const O = '11111111-1111-4111-8111-111111111111'

  it('la raíz lleva al paso que falta; cada paso y «listo», a su sub-ruta', () => {
    const base = `/configuracion/origenes/${O}/puesta-en-marcha`
    expect(rutaDeLaPuestaEnMarcha(O)).toBe(base)
    expect(PASOS_DE_LA_PUESTA_EN_MARCHA.map((paso) => rutaDeLaPuestaEnMarcha(O, paso))).toEqual([
      `${base}/datos`,
      `${base}/campos`,
      `${base}/flujo`,
      `${base}/formula`,
      `${base}/tarjeta`,
      `${base}/publicar`,
    ])
    expect(rutaDeLaPuestaEnMarcha(O, 'listo')).toBe(`${base}/listo`)
    expect(rutaDeLaPuestaEnMarcha('a/b', 'campos')).toBe(
      '/configuracion/origenes/a%2Fb/puesta-en-marcha/campos',
    )
  })

  it('el alta es una página, no un panel de la lista', () => {
    expect(RUTAS.nuevoOrigen).toBe('/configuracion/origenes/nuevo')
  })
})

describe('Colores y vigencia de las cotizaciones', () => {
  it('se configuran en Orígenes, cada uno en el modal de su tarjeta', () => {
    expect(RUTAS.coloresDeCotizacion).toBe('/configuracion/origenes?panel=colores')
    expect(RUTAS.vigenciaDeCotizacion).toBe('/configuracion/origenes?panel=vigencia')
  })
})

describe('Cotizaciones en Roles', () => {
  it('los niveles y quién crea y quién ve se enlazan al bloque «Cotizaciones» de la matriz', () => {
    expect(RUTAS.cotizacionesEnRoles).toBe(`${RUTAS.roles}?${PARAMETRO_DEL_BLOQUE}=cotizaciones`)
  })
})

describe('Catálogos', () => {
  it('los de logística se configuran en la pestaña Fases de cada origen, cada uno en su drawer', () => {
    const origen = '00000000-0000-4000-8000-00000000000a'
    expect(PANELES_DE_LOS_CATALOGOS.map((panel) => rutaDeUnCatalogo(origen, panel))).toEqual([
      `/configuracion/origenes/${origen}/fases?panel=puertos`,
      `/configuracion/origenes/${origen}/fases?panel=navieras`,
      `/configuracion/origenes/${origen}/fases?panel=categorias-de-gasto`,
      `/configuracion/origenes/${origen}/fases?panel=tipos-de-documento`,
    ])
  })

  it('el flujo de repuestos sólo tiene los tipos de documento', () => {
    expect(rutaDeTiposDeRepuestos()).toBe('/repuestos/configuracion/flujo?panel=tipos-de-documento')
  })

  it('sólo los cuatro catálogos abren un drawer de catálogo', () => {
    expect(esPanelDeCatalogo('puertos')).toBe(true)
    expect(esPanelDeCatalogo('nueva-fase')).toBe(false)
    expect(esPanelDeCatalogo(null)).toBe(false)
  })
})
