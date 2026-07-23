// 1:1 port of src/app/constants/colors.ts
export const C = {
  green: "#006838",
  greenDark: "#004F2A",
  greenLight: "#EAF6EF",
  blue: "#1D4ED8",
  blueLight: "#EFF6FF",
  orange: "#EA580C",
  orangeLight: "#FFF7ED",
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#D9E2DC",
  text: "#1F2937",
  textMuted: "#6B7280",
  sidebar: "#0A1A10",
  gold: "#C9A227",
};

export const portalTheme = {
  green: { primary: C.green, light: C.greenLight, dark: C.greenDark, label: "SME Applicant" },
  blue: { primary: C.blue, light: C.blueLight, dark: "#1E3A8A", label: "Participating Bank" },
  orange: { primary: C.orange, light: C.orangeLight, dark: "#9A3412", label: "SBP Administrator" },
};
