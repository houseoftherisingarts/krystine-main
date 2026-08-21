import * as R from 'react/jsx-dev-runtime';
import { translateProps } from './jsx-runtime';
export const Fragment = R.Fragment;
export function jsxDEV(type: any, props: any, key: any, isStatic: any, source: any, self: any) {
  return (R as any).jsxDEV(type, translateProps(type, props), key, isStatic, source, self);
}
