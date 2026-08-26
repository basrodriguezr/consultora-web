/**
 * Portafolio: repos públicos de GitHub que se muestran como prueba de trabajo real.
 */

export interface Repo {
  nombre: string;
  descripcion: string;
  /** Stack resumido que se muestra al pie de la tarjeta. */
  stack: string;
  url: string;
}

export const repos: Repo[] = [
  {
    nombre: "Risk Analytics Pipeline",
    descripcion: "Métricas de riesgo (TE, VaR, Beta) — 4h manuales a 15 min",
    stack: "AWS Glue · PySpark · Redshift",
    url: "https://github.com/Danichavez/portfolio-risk-analytics-pipeline",
  },
  {
    nombre: "Data Governance Framework",
    descripcion: "Contracts YAML, calidad, clasificación",
    stack: "Great Expectations · CI/CD",
    url: "https://github.com/Danichavez/data-governance-framework",
  },
  {
    nombre: "Modern ELT Platform",
    descripcion: "Stack moderno: dbt + Airflow + Redshift",
    stack: "dbt · Airflow · Terraform",
    url: "https://github.com/Danichavez/modern-data-platform-elt",
  },
  {
    nombre: "FinOps Platform",
    descripcion: "Costos cloud por equipo y pipeline",
    stack: "AWS Cost Explorer · Lambda",
    url: "https://github.com/Danichavez/finops-data-platform",
  },
  {
    nombre: "ML Feature Platform",
    descripcion: "Feature Store con Feast + AWS Glue",
    stack: "Feast · Glue · Python",
    url: "https://github.com/Danichavez/ml-feature-platform",
  },
  {
    nombre: "Sales Analytics",
    descripcion: "Segmentación RFM, cohortes y forecast",
    stack: "dbt · Redshift · SQL",
    url: "https://github.com/Danichavez/sales-analytics-platform",
  },
];
