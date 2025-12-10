import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container } from '@mui/material';
import { LandscapeCalculator } from './components/LandscapeCalculator';

// Material You (M3)-inspired theme tokens (light)
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4', // M3 purple
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F7F3FF', // soft background per M3 light
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C1B1F',
      secondary: '#49454F',
    },
    divider: '#E7E0EC',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h3: { fontWeight: 700, fontSize: '2rem' },
    h4: { fontWeight: 700, fontSize: '1.5rem' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.95rem' },
    caption: { fontSize: '0.8rem' },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: false,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(16,24,40,0.08)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        thumb: {
          boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
        }
      }
    }
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <LandscapeCalculator />
      </Container>
    </ThemeProvider>
  );
}

export default App;
