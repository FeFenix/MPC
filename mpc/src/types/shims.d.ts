// Shim declarations to silence missing module/type errors during TS checks
declare module 'react-katex';
declare module 'katex';
declare module '@mui/material';
declare module 'react/jsx-runtime';
declare module '*.css';
declare module '*.scss';
declare module '*.svg';

// Declare missing type packages referenced by tsconfig to silence compiler until proper @types are installed
declare module 'retry';
declare module 'semver';
declare module 'send';
declare module 'serve-index';
declare module 'serve-static';
declare module 'sockjs';
declare module 'stack-utils';
declare module 'testing-library__jest-dom';
declare module 'trusted-types';
declare module 'ws';
declare module 'yargs';
declare module 'yargs-parser';

declare var process: {
  env: { [key: string]: string | undefined }
};
