import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const BlockMath: React.FC<{ math: string }> = ({ math }) => {
  const html = katex.renderToString(math, { displayMode: true, throwOnError: false });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export const InlineMath: React.FC<{ math: string }> = ({ math }) => {
  const html = katex.renderToString(math, { displayMode: false, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};
