<!--
  Fixture de notas de discovery para calibrar el agente de propuestas.

  🛑 NO ES UN CLIENTE REAL. Sale del ejemplo completo de
  `negocio/templates/captura_requerimientos.md` ("Ejemplo real: cómo se ve una
  captura completa"), que es el formato que Daniela ya usa, más las respuestas a
  las preguntas técnicas de la Reunión 2 del mismo documento.

  Se calibra contra ESTE formato y no contra notas inventadas por nosotros a
  propósito: el contrato de entrada de la Fase 3 es el bloque de captura que ella
  llena, no un formulario que diseñamos. Si el agente sale bien acá, sale bien
  con lo que ella escribe de verdad.
-->

CLIENTE: RetailCo (e-commerce mediano, 80 empleados)
CONTACTO: Pablo Muñoz, CTO, pablo@retailco.cl
FECHA: 03/06/2026

PROBLEMA:
"Tenemos datos de ventas en Shopify, datos de marketing en Google Ads, y el
equipo comercial usa un Excel propio. Nadie sabe cuánto vendimos realmente ni qué
campaña funcionó."

SITUACIÓN ACTUAL:
- Shopify exporta CSV cada lunes (manual)
- Google Ads: cada analista saca su propio reporte
- Excel del gerente comercial: "la verdad" pero nadie confía
- 1 analista hace los reportes: se demora 2 días cada semana

FUENTES:
- Shopify (API REST)
- Google Ads (API)
- PostgreSQL interno (CRM)
- Google Sheets (presupuestos)

EQUIPO:
- 1 analista de datos (junior)
- Sin data engineer
- CTO es desarrollador backend

URGENCIA: Alta (quieren tener visibilidad para Black Friday en noviembre)
PRESUPUESTO: "Tenemos entre 10 y 20 millones para esto"
DECISOR: Pablo (CTO) + aprobación de CEO

SIGUIENTE PASO: Enviar propuesta en 48h

---

DETALLE DE LA REUNIÓN DE DESCUBRIMIENTO (1,5 h)

Sobre los datos:
- Fuentes principales: 4. La de Shopify es la que más importa.
- Volumen: no lo tienen medido. "Son varios miles de pedidos al mes", no supieron
  precisar cuántos ni cuánto pesa.
- Los datos de ventas cambian todo el día; los presupuestos de marketing se
  actualizan una vez al mes.
- Datos sensibles: sí, la tabla de clientes tiene RUT, correo y dirección de
  despacho. No hay nada de tarjetas: el pago lo procesa la pasarela.

Sobre el resultado esperado:
- Consumen: el CTO, el gerente comercial y el CEO. Ninguno es técnico.
- Quieren responder tres preguntas: cuánto vendimos ayer, qué campaña trajo esa
  venta, y qué producto se está quedando sin stock.
- Frecuencia: les basta con que esté actualizado cada mañana. Nadie pidió
  tiempo real cuando se les preguntó.
- Reportes regulatorios: no.

Sobre infraestructura:
- Tienen cuenta AWS, la administra el mismo CTO. La usan solo para el hosting de
  la tienda.
- Herramienta de BI: ninguna. Probaron Power BI el año pasado y lo abandonaron
  porque "nadie lo mantenía".
- Control de versiones: sí, GitHub. CI/CD no.

Sobre restricciones:
- Fecha límite: quieren estar funcionando antes de Black Friday (noviembre).
- Accesos: el CTO puede dar todo, pero pide que no se toque la base de producción
  del CRM en horario comercial.
- Lo intentaron antes: contrataron a un freelance que armó un dashboard en Power
  BI conectado directo a la base. Se cayó cuando cambió el esquema y nadie supo
  arreglarlo.
