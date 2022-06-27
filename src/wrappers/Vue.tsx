import React, { createElement, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Vue from 'vue';
import type { Component, CreateElement } from 'vue';
import { vueElement } from '../directives/vue-element';
import { ReactWrapper } from './React';
import { ExtractPropTypes } from '@vue/composition-api';

const VUE_COMPONENT_NAME = 'revue-internal-component-name';

Vue.config.devtools = false;
Vue.config.productionTip = false;

export type VueWrapperProps<P extends Record<string, any>> = {
  component: Component<any, any, any, P>;
  on?: Record<string, any>;
  children?: ReactNode;
  $rootVariables?: Record<string, any>;
} & ExtractPropTypes<P>;

const wrapReactChildren = (createElement: CreateElement, childrenRef: any) => {
  return createElement('revue-internal-react-wrapper', {
    props: {
      component: () => <div>{childrenRef.current}</div>,
    },
  });
};

export const VueWrapper = function VueWrapper<P>({
  component,
  on,
  children,
  $rootVariables = {},
  ...props
}: VueWrapperProps<P>) {
  const rootEl = useRef<HTMLDivElement>(null);
  const vueInstance = useRef<Vue | null>(null);
  const childrenRef = useRef<ReactNode | undefined>();

  useEffect(() => {
    childrenRef.current = children;

    if (vueInstance.current) {
      Object.assign(vueInstance.current.$data, props);
      vueInstance.current.$forceUpdate();
    }
  });

  useEffect(() => {
    const el = rootEl.current;

    if (el) {
      const instance = (vueInstance.current = new Vue({
        el,
        data: props,
        directives: { 'vue-element': vueElement },
        render(createElement) {
          return createElement('div', { directives: [{ name: 'vue-element' }] }, [
            createElement(
              VUE_COMPONENT_NAME,
              {
                props: this.$data,
                on,
              },
              [wrapReactChildren(createElement, childrenRef)]
            ),
          ]);
        },
        components: {
          [VUE_COMPONENT_NAME]: component,
          'revue-internal-react-wrapper': ReactWrapper,
        },
        ...$rootVariables,
      }));

      return () => {
        instance.$destroy();
        vueInstance.current = null;
      };
    }
  }, []);

  return <div ref={rootEl} />;
};
