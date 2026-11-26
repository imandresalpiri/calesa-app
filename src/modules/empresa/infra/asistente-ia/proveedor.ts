import 'server-only'
import { entornoPublico } from '@/shared/config/entorno'
import {
  MENSAJE_SESION_VENCIDA,
  errorDePostgrest,
  fallo,
  ok,
  type Resultado,
} from '@/shared/lib/errores'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { createClient } from '@/shared/lib/supabase/server'
import { leerConfigDelAsistente, type ConfigDelAsistente } from '../../entities/asistente-ia/config'
import {
  armarPedidoDeGenerar,
  armarPedidoDePrueba,
  armarPedidoDeReescribir,
  type EmpresaDelPedido,
} from '../../entities/asistente-ia/pedido'
import { errorDelAsistente } from '../../entities/asistente-ia/respuesta'
import { esDireccionDeRevalidacion, esDireccionLocal } from '../../entities/integraciones'
import {
  MOTIVO_INTEGRACION_NO_INSTALADA,
  MOTIVO_PROBAR_SIN_CLAVE_DEL_ASISTENTE,
  MOTIVO_SIN_PERMISO_AJUSTES,
} from '../../entities/motivos'
import type { ProbadorDelAsistente, RedactorDelAsistente } from '../../entities/repositorios'
import { pedirAlProveedor, type LlamadaAlProveedor } from './http'
import { leerElAsistente } from './lectura'

type ClienteDeQuienPide = Awaited<ReturnType<typeof createClient>>

const NO_CONFIGURADO = { ok: false, falla: 'no_configurado' } as const

const MENSAJE_DIRECCION_NO_LLAMABLE =
  'Esta dirección no se puede llamar desde aquí: tiene que empezar con https:// y no apuntar a una red interna.'

// El loopback sólo se llama si la base del despliegue también es de esta máquina (local, CI): en la nube apuntaría al propio servidor (D10
// en docs/DECISIONES.md). La base sólo mira el protocolo; aquí se vuelve a validar la dirección guardada.
function sePuedeLlamar(config: ConfigDelAsistente): boolean {
  const loopback = esDireccionLocal(entornoPublico().NEXT_PUBLIC_SUPABASE_URL)
  return esDireccionDeRevalidacion(config.urlBase, { loopback })
}

// La clave entera, de Vault: sólo la entrega `integracion_secreto()` a `service_role`. Una llamada y nada más con el admin.
async function claveGuardada(): Promise<string | null> {
  const secreto = await createAdminClient().rpc('integracion_secreto', { p_clave: 'asistente_ia' })
  return secreto.error || !secreto.data ? null : secreto.data
}

function llamada(
  config: ConfigDelAsistente,
  clave: string,
  pedido: LlamadaAlProveedor['pedido'],
): LlamadaAlProveedor {
  return { urlBase: config.urlBase, clave, modelo: config.modelo, pedido }
}

async function contarUso(supabase: ClienteDeQuienPide) {
  const contado = await supabase.rpc('asistente_ia_contar_uso')
  if (contado.error) {
    // El texto igual se entrega: el contador no es razón para perderlo.
    console.error('No se pudo contar el uso del asistente de IA', { codigo: contado.error.code })
  }
}

type Listo = { ok: true; config: ConfigDelAsistente; empresa: EmpresaDelPedido }

// Encendido, con clave, con una configuración legible y una dirección que se puede llamar desde aquí; si no, «no configurado».
async function asistenteListo(
  supabase: ClienteDeQuienPide,
  puedeConfigurar: boolean,
): Promise<Listo | { ok: false; error: Resultado<never> }> {
  const leido = await leerElAsistente(supabase)
  if (!leido.ok) return { ok: false, error: leido }
  const { integracion, empresa } = leido.data
  const config = integracion ? leerConfigDelAsistente(integracion.config) : null
  if (!integracion?.activa || !integracion.secretoGuardadoEn || !config || !sePuedeLlamar(config)) {
    return {
      ok: false,
      error: { ok: false, error: errorDelAsistente(NO_CONFIGURADO, { puedeConfigurar }) },
    }
  }
  return { ok: true, config, empresa }
}

// La tercera excepción del cliente admin en `empresa` (.claude/rules/datos.md). El orden no se saltea: la sesión, la fila con el cliente de
// quien pide (encendida, con clave, su configuración y su dirección), el pedido armado, y recién entonces el admin para **una** llamada a
// `integracion_secreto('asistente_ia')`; después el proveedor y, si respondió 2xx, el contador con el cliente de quien pide. El acceso a lo
// que se redacta (la cotización) lo comprueba quien llama, antes. La clave va a la cabecera y a ningún otro lado.
export const redactarConElAsistente: RedactorDelAsistente = async (pedido) => {
  const supabase = await createClient()
  const sesion = await supabase.auth.getClaims()
  if (sesion.error || !sesion.data?.claims) return fallo('no_autenticado', MENSAJE_SESION_VENCIDA)

  const listo = await asistenteListo(supabase, pedido.puedeConfigurar)
  if (!listo.ok) return listo.error
  const comun = {
    config: listo.config,
    empresa: listo.empresa,
    texto: pedido.texto,
    firma: pedido.firma,
  }
  const armado =
    pedido.tipo === 'generar'
      ? armarPedidoDeGenerar({ ...comun, atajoId: pedido.atajoId })
      : armarPedidoDeReescribir({ ...comun, instruccion: pedido.instruccion })
  if (!armado.ok) return armado

  const clave = await claveGuardada()
  if (!clave) {
    return { ok: false, error: errorDelAsistente(NO_CONFIGURADO, pedido) }
  }
  const { respuesta, respondio } = await pedirAlProveedor(llamada(listo.config, clave, armado.data))
  if (respondio) await contarUso(supabase)
  return respuesta.ok
    ? ok({ texto: respuesta.texto })
    : { ok: false, error: errorDelAsistente(respuesta, pedido) }
}

// «Probar conexión»: el permiso con el cliente de quien prueba, la fila (con clave; encendida o no) y su dirección, y recién entonces el
// admin. Cualquier 2xx es que la dirección, la clave y el modelo andan, aunque el texto venga vacío. No cuenta como uso.
export const probarElAsistente: ProbadorDelAsistente = async () => {
  const supabase = await createClient()
  const permiso = await supabase.rpc('tiene_permiso', { p_clave: 'empresa.ajustes.gestionar' })
  if (permiso.error) return { ok: false, error: errorDePostgrest(permiso.error) }
  if (!permiso.data) return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)

  const leido = await leerElAsistente(supabase)
  if (!leido.ok) return leido
  const { integracion } = leido.data
  if (!integracion) return fallo('regla', MOTIVO_INTEGRACION_NO_INSTALADA)
  if (!integracion.secretoGuardadoEn) return fallo('regla', MOTIVO_PROBAR_SIN_CLAVE_DEL_ASISTENTE)
  const config = leerConfigDelAsistente(integracion.config)
  if (!config) {
    return { ok: false, error: errorDelAsistente(NO_CONFIGURADO, { puedeConfigurar: true }) }
  }
  if (!sePuedeLlamar(config)) return fallo('regla', MENSAJE_DIRECCION_NO_LLAMABLE, 'configurar')

  const clave = await claveGuardada()
  if (!clave) return fallo('regla', MOTIVO_PROBAR_SIN_CLAVE_DEL_ASISTENTE)
  const { respuesta, respondio } = await pedirAlProveedor(
    llamada(config, clave, armarPedidoDePrueba()),
  )
  if (respondio) return ok({ modelo: config.modelo })
  return respuesta.ok
    ? ok({ modelo: config.modelo })
    : { ok: false, error: errorDelAsistente(respuesta, { puedeConfigurar: true }) }
}
