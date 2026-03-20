// Stub for solito/link in the Storybook web environment.
// Renders a plain <a> tag instead of the native-compatible Solito Link.
import React from 'react';

const baseStyle = { textDecoration: 'none', color: 'inherit' };

export const Link = ({ href, children, viewProps, textProps, style, ...rest }) =>
  React.createElement('a', { href: href ?? '#', style: { ...baseStyle, ...style }, ...rest }, children);

export const TextLink = ({ href, children, style, ...rest }) =>
  React.createElement('a', { href: href ?? '#', style: { ...baseStyle, ...style }, ...rest }, children);
