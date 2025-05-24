// src/theme.ts

import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { StyleFunctionProps } from '@chakra-ui/theme-tools';

// Define the color mode config
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Extend the theme with custom colors and config
const theme = extendTheme({
  config,
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
      },
    }),
  },
  colors: {
    // Custom colors for dark mode
    gray: {
      // Your existing colors
      700: '#2D3748',
      750: '#232B3A',
      800: '#1A202C',
      900: '#171923',
    },
  },
  components: {
    Button: {
      baseStyle: {
        _focus: {
          boxShadow: 'outline',
        },
      },
    },
    Text: {
      baseStyle: (props: StyleFunctionProps) => ({
        color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
      }),
    },
  },
});

export default theme;