import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Define the color mode config
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Extend the theme with custom colors and config
const theme = extendTheme({
  config,
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
      },
    }),
  },
  colors: {
    // Custom colors for dark mode
    gray: {
      700: '#2D3748', // Darker background for containers in dark mode
      800: '#1A202C', // Even darker background for nested containers
      900: '#171923', // Darkest background for page in dark mode
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
      baseStyle: (props: { colorMode: string }) => ({
        color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
      }),
    },
  },
});

export default theme;
