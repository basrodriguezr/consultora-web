/**
 * Calibración del prompt del pre-diagnóstico contra el modelo real — paso 6b
 * del §17 del plan de Fase 2.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * 🛑 ESTO NO ES UN TEST Y NO VA A LA SUITE DE VITEST.
 *
 * Pega contra la Messages API de Anthropic: gasta dinero real y falla sin
 * internet. Un test que cuesta plata y se pone rojo cuando se cae la red no es
 * un test — es ruido que enseña al equipo a ignorar el rojo. Por eso vive en
 * `scripts/` (fuera del `include` de `vitest.config.ts`, que es
 * `{lib,app}/**\/*.test.ts`) y se corre a mano, cuando alguien toca `prompt.ts`.
 *
 * Lo que sí es automático de esto son los tests de `lib/assessment/`: el golden
 * del renderer, el esquema y la calificación. Acá se juzga el CONTENIDO que
 * produce el modelo, y eso lo lee una persona.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * ## Cómo se corre
 *
 * Desde `landingpage/`:
 *
 * ```
 * node --env-file=.env.local --import ./scripts/alias-hooks.mjs \
 *   scripts/calibrar-prompt.ts
 * ```
 *
 * `--env-file` levanta `ANTHROPIC_API_KEY` de `.env.local` (nunca se imprime).
 * `--import ./scripts/alias-hooks.mjs` resuelve el alias `@/` y neutraliza
 * `server-only`, que fuera del bundler de Next lanza al importarse.
 *
 * Variables opcionales:
 * - `ASSESSMENT_TIMEOUT_MS` — presupuesto por intento. El default de producción
 *   son 22 s (`TIMEOUT_POR_DEFECTO_MS`). El script **mide y reporta** el tiempo
 *   de pared de cada llamada justamente para poder decidir si ese número
 *   alcanza contra `claude-opus-5` con thinking prendido.
 * - `ASSESSMENT_BASE_URL` / `ASSESSMENT_MODELO` — para apuntar al modelo local.
 *
 * ## Presupuesto
 *
 * **Dos llamadas, no tres.** El lead #2 no califica por la conjunción del §8
 * (`sin-presupuesto` + `personasConDatos <= 1` + `urgencia: baja`) y este
 * script reproduce la puerta del §11 tal cual: si `califica()` da `false`, no
 * se construye ni se manda nada. Ojo: `generarPreDiagnostico()` puede gastar un
 * segundo intento por lead **si la salida no valida** (es su único reintento,
 * §15b), así que el techo real son 4 requests y el piso 2. El script reporta
 * cuántas hubo.
 *
 * No hacer barridos de parámetros acá: `temperature` no existe en
 * `claude-opus-5` (devuelve 400) y `effort`/`max_tokens` están fijados en
 * `cliente.ts` por razones escritas ahí.
 */
import { calificar, califica } from "@/lib/assessment/calificacion";
import { generarPreDiagnostico } from "@/lib/assessment/cliente";
import { renderPreDiagnostico } from "@/lib/assessment/render";
import {
  leadAssessmentSchema,
  normalizarLead,
  type LeadAssessmentInput,
  type LeadAssessmentNormalizado,
} from "@/lib/leads";

/**
 * Los tres leads sintéticos del §10 ("guardar 3 leads sintéticos como fixture y
 * correr el agente contra ellos al tocar el prompt").
 *
 * Se escriben como `LeadAssessmentInput` y se pasan por `leadAssessmentSchema` +
 * `normalizarLead()` **a propósito**: un fixture escrito directamente como
 * `LeadAssessmentNormalizado` puede violar el esquema sin que nadie se entere
 * (largos mínimos, `fuentesDatos` vacío) y entonces se estaría calibrando el
 * prompt contra un lead que el formulario nunca podría producir.
 */
const LEADS: { titulo: string; porQue: string; datos: LeadAssessmentInput }[] = [
  {
    titulo: "1 · califica con holgura",
    porQue:
      "presupuesto asignado + 6 personas con datos + urgencia alta: ninguna señal de la conjunción del §8.",
    datos: {
      tipo: "assessment",
      nombre: "Carolina Muñoz",
      email: "carolina.munoz@ejemplo.cl",
      empresa: "Distribuidora Andes SpA",
      problemaPrincipal:
        "Cada cierre de mes el equipo de finanzas arma el reporte de ventas y márgenes a mano, cruzando lo que sale del ERP con planillas que mantiene cada sucursal. Tardamos casi una semana y cuando la gerencia pregunta por qué dos áreas muestran cifras distintas no tenemos cómo responder. El mes pasado se despachó a un cliente moroso porque el dato de crédito estaba desactualizado.",
      solucionActual:
        "Una analista descarga los archivos del ERP los primeros días del mes, los pega en una planilla maestra y va corrigiendo a mano los nombres de clientes que aparecen repetidos. Después manda el consolidado por correo. Si ella está de vacaciones, el reporte no sale.",
      fuentesDatos: ["erp", "planillas-excel", "bases-sql"],
      equipoDatos: "no",
      personasConDatos: 6,
      cloud: "aws",
      presupuesto: "asignado",
      urgencia: "alta",
      horasSemanaProceso: "15-40",
      sponsor: "Gerente de Administración y Finanzas",
      evaluandoCambio: "no",
      sistemasActuales: "ERP Defontana, planillas en SharePoint, SQL Server on-premise",
    },
  },
  {
    titulo: "2 · NO califica (conjunción del §8)",
    porQue:
      "sin-presupuesto + personasConDatos = 1 + urgencia baja. Las tres juntas: no se llama al modelo.",
    datos: {
      tipo: "assessment",
      nombre: "Rodrigo Tapia",
      email: "rodrigo@tallertapia.cl",
      empresa: "Taller Tapia Ltda.",
      problemaPrincipal:
        "Llevamos el control de órdenes de trabajo en un cuaderno y en un Excel que voy actualizando cuando puedo. A veces se me pasa facturar algo, pero tampoco es que sea un desastre.",
      solucionActual: "Lo llevo yo mismo en un Excel, cuando tengo un rato libre.",
      fuentesDatos: ["planillas-excel"],
      equipoDatos: "no",
      personasConDatos: 1,
      cloud: "ninguno",
      presupuesto: "sin-presupuesto",
      urgencia: "baja",
      horasSemanaProceso: "<5",
      evaluandoCambio: "todavia-no",
    },
  },
  {
    titulo: '3 · horasSemanaProceso = "no-se"',
    porQue:
      'Falta de visibilidad, no problema chico (decisión 2026-08-09). Tratamiento normal: califica y genera documento.',
    datos: {
      tipo: "assessment",
      nombre: "Paula Riquelme",
      email: "priquelme@ejemplo.cl",
      empresa: "Clínica Vertiente SpA",
      problemaPrincipal:
        "No sabemos bien cuánto nos cuesta, pero todos los meses alguien está reconciliando a mano las horas médicas agendadas contra las facturadas, y siempre aparecen diferencias. Nadie tiene claro de dónde sale el número correcto y cada área defiende el suyo. Tampoco sabemos cuántos pacientes están duplicados en la ficha.",
      solucionActual:
        "Cada área saca su propio reporte del sistema clínico y lo cruza con una planilla propia. Cuando no cuadra, se reúnen y deciden cuál número usar para esa reunión.",
      fuentesDatos: ["sistemas-legacy", "planillas-excel", "archivos-planos"],
      equipoDatos: "parcial",
      personasConDatos: 3,
      cloud: "otro",
      presupuesto: "en-evaluacion",
      urgencia: "media",
      horasSemanaProceso: "no-se",
      sponsor: "Subdirectora Médica",
      sistemasActuales: "Sistema clínico propietario, planillas locales",
    },
  },
];

/**
 * Chequeos automáticos del §17c y del §9. **No reemplazan la lectura**: son un
 * primer filtro barato sobre la salida renderizada, y son textuales, así que
 * pueden dar falsos positivos y falsos negativos. El veredicto lo da una
 * persona leyendo el documento completo.
 */
const CHEQUEOS: { nombre: string; patron: RegExp; debeAparecer?: boolean }[] = [
  {
    nombre: "§17c — nombres de servicios de nube / herramientas",
    patron:
      /\b(lambda|s3|glue|athena|redshift|eventbridge|step functions|kinesis|dynamodb|rds|aurora|cloudwatch|sagemaker|quicksight|airflow|dbt|snowflake|databricks|power ?bi|tableau|looker|kafka|fivetran|azure|bigquery|synapse|data ?factory|terraform|docker|kubernetes)\b/gi,
  },
  {
    nombre: "§9.3 — porcentajes",
    patron: /\d+\s?%|\bpor ciento\b/gi,
  },
  {
    nombre: "§9.3 — cantidades de registros",
    patron: /\b\d[\d.,]*\s*(registros|filas|clientes duplicados|duplicados)\b/gi,
  },
  {
    nombre: 'rename — la palabra "assessment" en la salida',
    patron: /assessment/gi,
  },
  {
    nombre: "§19.5 — encabezado literal",
    patron: /^Pre-diagnóstico preliminar — pendiente de validación en discovery$/m,
    debeAparecer: true,
  },
  {
    nombre: "§17c — arquitectura To-Be / diseño de flujo",
    patron:
      /\b(pipeline|ETL|ELT|data ?(lake|warehouse|mart)|ingesta incremental|orquestador|API REST|webhook|microservicio)\b/gi,
  },
];

function separador(texto: string): string {
  return `\n${"═".repeat(78)}\n${texto}\n${"═".repeat(78)}\n`;
}

function correrChequeos(documento: string): void {
  console.log("\n── Chequeos automáticos (primer filtro, no veredicto) ──");
  for (const { nombre, patron, debeAparecer } of CHEQUEOS) {
    const hallazgos = documento.match(patron) ?? [];
    if (debeAparecer) {
      console.log(
        `${hallazgos.length > 0 ? "✅" : "🛑"} ${nombre}${hallazgos.length > 0 ? "" : " — AUSENTE"}`,
      );
      continue;
    }
    const unicos = [...new Set(hallazgos.map((h) => h.toLowerCase()))];
    console.log(
      unicos.length === 0
        ? `✅ ${nombre} — sin coincidencias`
        : `🛑 ${nombre} — ${unicos.join(", ")}`,
    );
  }

  const porConfirmar = documento.match(/\[por confirmar/g) ?? [];
  console.log(
    `ℹ️  "[por confirmar en discovery]" aparece ${porConfirmar.length} vez/veces ` +
      `(los huecos van agrupados en «Qué falta averiguar en discovery», no dispersos).`,
  );
}

async function procesar(
  titulo: string,
  porQue: string,
  lead: LeadAssessmentNormalizado,
): Promise<number> {
  console.log(separador(`LEAD ${titulo}\n${porQue}`));

  const calificacion = calificar(lead);
  console.log(`calificar() → "${calificacion}" · califica() → ${califica(calificacion)}`);

  /*
   * La puerta del §11, paso 6, reproducida acá tal cual. `generarPreDiagnostico()`
   * NO la lleva adentro y eso es correcto: vive en el route (paso 7), porque la
   * misma calificación decide dos cosas que no pueden discrepar —si el navegador
   * ve el Calendly y si se gasta un token— y por eso se calcula una sola vez,
   * antes de los dos usos.
   */
  if (!califica(calificacion)) {
    console.log(
      "\n⛔ Puerta del §8: NO se llama al modelo, NO se genera pre-diagnóstico,\n" +
        "   NO se muestra el Calendly. El EMAIL #1 con las respuestas crudas sale igual\n" +
        "   (eso lo hace `procesarLead()`, no este script).\n" +
        "   Llamadas a la API para este lead: 0.",
    );
    return 0;
  }

  const inicio = Date.now();
  const resultado = await generarPreDiagnostico(lead);
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

  console.log(`\n⏱  ${segundos} s de pared (default de producción: 22 s por intento).`);

  if (!resultado.ok) {
    console.log(`🛑 falló — motivo: ${resultado.motivo} · detalle: ${resultado.detalle}`);
    return 1;
  }

  console.log("\n── Salida estructurada del modelo (JSON validado) ──\n");
  console.log(JSON.stringify(resultado.salida, null, 2));

  const documento = renderPreDiagnostico(lead, resultado.salida, calificacion);
  console.log("\n── Documento renderizado ──\n");
  console.log(documento);

  correrChequeos(documento);
  return 1;
}

async function main(): Promise<void> {
  let leadsQueLlamaron = 0;

  for (const { titulo, porQue, datos } of LEADS) {
    const validado = leadAssessmentSchema.parse(datos);
    const lead = normalizarLead(validado, new Date("2026-08-27T12:00:00-04:00"));
    if (lead.tipo !== "assessment") throw new Error("normalizarLead cambió el tipo");
    leadsQueLlamaron += await procesar(titulo, porQue, lead);
  }

  console.log(
    separador(
      `Listo. Leads que llegaron al modelo: ${leadsQueLlamaron} de ${LEADS.length}.\n` +
        "Cada uno consume 1 request, o 2 si la primera salida no valida (§15b).",
    ),
  );
}

await main();
