import React, { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Vue from 'vue';
import type { Component, CreateElement, ComponentOptions } from 'vue';
import { vueElement } from '../directives/vue-element';
import { ReactWrapper } from './React';
import { ExtractPropTypes } from '@vue/composition-api';

const VUE_COMPONENT_NAME = 'revue-internal-component-name';

Vue.config.devtools = false;
Vue.config.productionTip = false;

export type VueWrapperOptions = {
  lifecycles?: Pick<
    ComponentOptions<Vue>,
    | 'beforeCreate'
    | 'created'
    | 'beforeDestroy'
    | 'destroyed'
    | 'beforeMount'
    | 'mounted'
    | 'beforeUpdate'
    | 'updated'
    | 'activated'
    | 'deactivated'
    | 'errorCaptured'
  >;
};

export type VueWrapperProps<P extends Record<string, any>> = {
  component: Component<any, any, any, P>;
  on?: Record<string, any>;
  children?: ReactNode;
  $rootVariables?: Record<string, any>;
  $options?: VueWrapperOptions;
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
  $options = {},
  ...props
}: VueWrapperProps<P>) {
  const rootEl = useRef<HTMLDivElement>(null);
  const vueInstance = useRef<Vue | null>(null);
  const childrenRef = useRef<ReactNode | undefined>();
  const listenersRef = useRef<Record<string, any> | undefined>(on);
  const componentRef = useRef<any>(component);

  useEffect(() => {
    childrenRef.current = children;
    listenersRef.current = on;
    componentRef.current = component;

    if (vueInstance.current) {
      Object.assign(vueInstance.current.$data, props);
      vueInstance.current.$forceUpdate();
    }
  });

  useEffect(() => {
    const el = rootEl.current;
    componentRef.current = component;

    if (el) {
      const instance = (vueInstance.current = new Vue({
        el,
        data: props,
        directives: { 'vue-element': vueElement },
        render(createElement) {
          return createElement('div', { directives: [{ name: 'vue-element' }] }, [
            createElement(
              componentRef.current,
              {
                props: this.$data,
                on: listenersRef.current,
              },
              [wrapReactChildren(createElement, childrenRef)]
            ),
          ]);
        },
        computed: {
          Component() {
            return componentRef.current;
          },
        },
        components: {
          'revue-internal-react-wrapper': ReactWrapper,
        },
        ...$rootVariables,
        ...($options.lifecycles ?? {}),
      }));

      return () => {
        instance.$destroy();
        vueInstance.current = null;
      };
    }
  }, []);

  return <div ref={rootEl} />;
};
