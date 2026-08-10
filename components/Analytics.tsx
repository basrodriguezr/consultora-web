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
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
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
