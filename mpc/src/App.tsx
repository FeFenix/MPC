import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container } from '@mui/material';
import { LandscapeCalculator } from './components/LandscapeCalculator';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container>
        <LandscapeCalculator />
      </Container>
    </ThemeProvider>
  );
}

export default App;
