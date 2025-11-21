import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Custom violet color palette for modern SaaS aesthetic
const violet: MantineColorsTuple = [
  "#f5f3ff",
  "#ede9fe",
  "#ddd6fe",
  "#c4b5fd",
  "#a78bfa",
  "#8b5cf6",
  "#7c3aed",
  "#6d28d9",
  "#5b21b6",
  "#4c1d95",
];

export const theme = createTheme({
  /** Primary color - violet for modern SaaS feel */
  primaryColor: "violet",

  /** Default border radius */
  defaultRadius: "md",

  /** Font family - Outfit is loaded in layout.tsx */
  fontFamily: "var(--font-outfit-sans)",

  /** Custom colors */
  colors: {
    violet,
  },

  /** Component-specific default props */
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Paper: {
      defaultProps: {
        shadow: "md",
        radius: "md",
      },
    },
    Card: {
      defaultProps: {
        shadow: "sm",
        radius: "md",
        withBorder: false,
      },
    },
  },

  /** Enable auto contrast for better text readability on colored backgrounds */
  autoContrast: true,
});
