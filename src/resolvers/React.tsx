import type { ExtractPropTypes } from '@vue/composition-api';
import React, { type ReactNode } from 'react';
import type { Component } from 'vue';
import { VueWrapper } from '../wrappers/Vue';

type VueInReactProps<P> = {
  on?: Record<string, any>;
  children?: ReactNode;
} & ExtractPropTypes<P>;

export function VueInReact<P extends Record<string, any>>(
  component: Component<any, any, any, P>,
  rootVariables: Record<string, any> = {}
) {
  return (props: VueInReactProps<P>) => (
    <VueWrapper $rootVariables={rootVariables} component={component} {...props} />
  );
}
