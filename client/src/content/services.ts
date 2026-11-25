/**
 * Service names and descriptions shown on the homepage cards.
 * Structured data reuses this list so the schema matches the visible copy.
 */
export const serviceCatalog = [
  {
    id: "product-design",
    title: "Product Design",
    description: "Taking customer napkin sketches and descriptions to manufacturable products",
  },
  {
    id: "prototype-dfm",
    title: "Prototype & DFM",
    description: "3D printing, testing and refining, to improving prototypes with Design For Manufacturing",
  },
  {
    id: "machine-tooling",
    title: "Machine & Tooling Design",
    description:
      "Custom machinery, tooling for existing machines, PDM server and vault creation, assembly and quality/buy-off testing",
  },
  {
    id: "cad-3d-modeling",
    title: "3D Modeling & CAD Services",
    description: "Using SolidWorks and GD&T, delivering parts, assemblies, and drawings",
  },
  {
    id: "pdm-plm",
    title: "PDM/PLM Creation",
    description:
      "Building SolidWorks PDM Servers, Databases, Vaults and Workflows connected to your desired properties",
  },
  {
    id: "manufacturing-consultation",
    title: "Manufacturing Solutions Consultation",
    description: "From resolving issues with machinery and manufacturing lines to packaging development",
  },
] as const;

export type ServiceContent = (typeof serviceCatalog)[number];
