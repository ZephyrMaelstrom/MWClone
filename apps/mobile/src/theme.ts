/** Apothecary / illuminated-manuscript palette. */
export const theme = {
  colors: {
    bg: "#1c1410",
    panel: "#2a1f17",
    panelEdge: "#4a3526",
    parchment: "#e8d9b5",
    ink: "#2a1f17",
    text: "#e8d9b5",
    textDim: "#a8946f",
    brass: "#c79a4b",
    ember: "#e8743b",
    success: "#7bc86c",
    danger: "#8fae6b", // sickly green = failure/slag
    crucibleGlow: "#ff8a4c",
  },
  essence: {
    brimstone: "#c0392b",
    vapor: "#b39ddb",
    ember: "#e8743b",
    brine: "#3aa6a0",
    loam: "#7a5c3a",
    gleam: "#e3c45a",
  } as Record<string, string>,
  radius: 12,
  space: (n: number) => n * 8,
} as const;
