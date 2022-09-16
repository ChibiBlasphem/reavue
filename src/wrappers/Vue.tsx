import React, { RefObject, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import Vue from 'vue';
import type { Component, CreateElement, ComponentOptions } from 'vue';
import { ReactWrapper } from './React';
import { ExtractPropTypes } from '@vue/composition-api';

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

const wrapReactChildren = (
  createElement: CreateElement,
  childrenRef: RefObject<ReactNode | undefined>
) => {
  return createElement('revue-internal-react-wrapper', {
    props: {
      component: () => childrenRef.current ?? null,
    },
  });
};

export const VUE_WRAPPER_TESTID = 'reavue-vue-wrapper';

export const VueWrapper = function VueWrapper<P extends Record<string, any>>({
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
        el: el.firstElementChild!,
        data: props,
        // directives: { 'vue-element': vueElement },
        render(createElement) {
          return createElement(
            componentRef.current,
            {
              props: this.$data,
              on: listenersRef.current,
            },
            [wrapReactChildren(createElement, childrenRef)]
          );
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

  // Using a double div to mount vue on child div,
  // so it does override our react root element and to no throw when unmounting.
  return (
    <div ref={rootEl} style={{ display: 'contents' }} data-testid={VUE_WRAPPER_TESTID}>
      <div></div>
    </div>
  );
};
