// Shim declarations to silence missing module/type errors during TS checks
declare module 'react-katex';
declare module '@mui/material';
declare module 'react/jsx-runtime';
declare module '*.css';
declare module '*.scss';
declare module '*.svg';

declare var process: {
  env: { [key: string]: string | undefined }
};
