// Lo que prepara `e2e/cotizar-pisar-calculo.spec.ts` (`docs/COTIZADOR.md` › «Pisar un cálculo»): la hoja de la subasta de la semilla (su tarjeta trae «Comisión
// giro » con el porcentaje de la transferencia) y un origen propio con una copia de su fórmula cuya transferencia sólo edita el nivel «costos» (nunca se publica
// sobre la de la semilla, que leen otros specs). Sólo para las pruebas.
import { expect, type Locator, type Page } from '@playwright/test'
import { celdaDeLaHoja, tipearEnLaHoja } from './cotizar-guardar'
import { alDia } from './cotizar-vista-previa'
import { crearOrigenDePrueba, PREFIJO_CLAVE_E2E } from './origenes'
import { literal, sql } from './sql'
import { copiarLaFormulaDeLaSubasta } from './tarjeta-cuadricula'

const RAIZ = 'pisar_'

// Con el remate de 10.000, los fees son 1.300 y la transferencia (4 % de los dos) da 452: escribir 474,60 la deja en el 4,2 %.
export const REMATE = '10000'
export const CALCULADA = '452,00'
export const PISADA = '474,6'
export const PISADA_A_LA_VISTA = '474,60'
export const PORCENTAJE_PISADO = /4,2\s?%/

export const aviso = (page: Page): Locator => page.locator('[data-aviso-de-pisado]')
export const marca = (celda: Locator): Locator => celda.getByRole('img', { name: 'Editado a mano' })
export const calculado = (celda: Locator): Locator => celda.getByText(/^Calculado:/)
export const monto = (celda: Locator): Locator => celda.locator('[data-parada="0"]')
export const porcentaje = (celda: Locator): Locator => celda.locator('[data-parada="1"]')

// Con la hoja abierta: el remate de 10.000 y la transferencia pisada en 474,60, con la respuesta al día.
export async function pisarLaTransferencia(page: Page): Promise<Locator> {
  await tipearEnLaHoja(page, 'remate', REMATE)
  await alDia(page)
  const transferencia = celdaDeLaHoja(page, 'transferencia')
  await expect(monto(transferencia)).toContainText(CALCULADA)
  await tipearEnLaHoja(page, 'transferencia', PISADA)
  await alDia(page)
  return transferencia
}

// Un origen con la fórmula v1 de la subasta y la N+1 en la que el ítem de la transferencia lleva `nivel_editar` «costos»: quien no tiene el nivel la ve y no la pisa.
export async function crearOrigenConLaTransferenciaDeCostos(proyecto: string): Promise<string> {
  const origen = await crearOrigenDePrueba(`E2E pisar ${proyecto}`, `${RAIZ}${proyecto}`, {
    tipo: 'subasta',
  })
  copiarLaFormulaDeLaSubasta(origen.id)
  sql(`
    do $f$
    declare v1 public.formulas; v_diseno jsonb;
    begin
      select * into v1 from public.formulas where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada';
      v_diseno := jsonb_set(v1.diseno, '{secciones}', (
        select jsonb_agg(case when s ->> 'id' = 'compra'
                              then jsonb_set(s, '{items}', (select jsonb_agg(case when i ->> 'nodo' = 'transferencia'
                                                                                  then i || '{"nivel_editar": "costos"}'::jsonb else i end order by n)
                                                            from jsonb_array_elements(s -> 'items') with ordinality x (i, n)))
                              else s end order by o)
          from jsonb_array_elements(v1.diseno -> 'secciones') with ordinality y (s, o)));
      update public.formulas set estado = 'archivada' where id = v1.id;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (v1.origen_id, v1.version + 1, 'publicada', v1.definicion, v1.params, v_diseno,
              public._preparar_publicacion(v1.definicion, v1.params, v_diseno, false), 'E2E T521 N+1', now());
    end $f$`)
  return origen.id
}

// Las cotizaciones del vehículo de la subasta, el vehículo y los orígenes de este spec.
export function borrarLoDeEsteSpec(vehiculo: string): void {
  if (vehiculo !== '') {
    sql(`
      delete from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid;
      delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  sql(`delete from public.origenes where clave like '${PREFIJO_CLAVE_E2E}${RAIZ}%'`)
}
