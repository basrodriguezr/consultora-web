import Script from "next/script";

/**
 * Google Analytics 4.
 *
 * Se inyecta solo si `NEXT_PUBLIC_GA_ID` está configurada, así el sitio corre
 * en local y en preview sin ensuciar las métricas ni romper si falta el dato
 * (la property de GA4 todavía está pendiente de confirmar con Daniela).
 */
/**
 * El id se interpola en un script inline. No es input de usuario —lo setea
 * quien despliega— pero validar el formato evita que un valor mal pegado
 * (con comillas, por ejemplo) inyecte JS en todas las páginas.
 */
const FORMATO_GA_ID = /^G-[A-Z0-9]+$/;

export default function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId || !FORMATO_GA_ID.test(gaId)) return null;

  return (
    <>
      {/*
        `lazyOnload` y no `afterInteractive`, que era lo que había.

        `afterInteractive` hace que Next emita
        `<link rel="preload" as="script">` para el gtag: el navegador le da
        prioridad alta y compite con la ruta crítica. En desktop no se nota;
        en móvil —donde Lighthouse simula 4G y CPU 4× más lenta— sí, y era
        parte del Rendimiento 89 medido contra producción el 2026-08-09.
        `lazyOnload` carga el tag en tiempo ocioso, después de todo lo demás,
        y **no emite el preload**.

        La contrapartida, que es real: se pierden pageviews de quien abre y
        cierra antes del idle. En una landing cuyo trabajo es que alguien
        baje hasta el formulario, medir esos rebotes de dos segundos vale
        menos que cargar rápido en el celular, que es donde llegan los
        clientes. Si algún día hace falta esa fidelidad, el cambio es esta
        línea — no un rediseño.
      */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="lazyOnload"
      />
      <Script id="ga4-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
