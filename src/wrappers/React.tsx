import type { ComponentType, ReactNode } from 'react';
import React from 'react';
import { defineComponent } from '@vue/composition-api';
import { createRoot, Root } from 'react-dom/client';
import { VueWrapper } from './Vue';

const wrapVueChildren = (children: any) => {
  return defineComponent({
    render: () => children,
  });
};

const makeReactComponent = (Component: ComponentType<{ children?: ReactNode }>) => {
  const ReactComponent = function ({ children, ...props }: any) {
    return (
      <Component {...props}>
        {children && <VueWrapper component={wrapVueChildren(children)} />}
      </Component>
    );
  };

  ReactComponent.displayName = `ReactInVue${
    Component.displayName || Component.name || 'Component'
  }`;

  return ReactComponent;
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const REACT_WRAPPER_TESTID = 'reavue-react-wrapper';

export const ReactWrapper = defineComponent({
  inheritAttrs: false,
  props: ['component', 'passedProps'],
  render(createElement) {
    return createElement('div', {
      ref: 'react',
      attrs: { 'data-testid': REACT_WRAPPER_TESTID, style: 'display: contents;' },
    });
  },
  data() {
    return {
      reactRoot: null,
      Component: null,
    } as { reactRoot: any; Component: any };
  },
  mounted() {
    this.reactRoot = createRoot(this.$refs.react as HTMLDivElement);
    this.Component = makeReactComponent(this.$props.component);
    this.mountReactComponent(this.reactRoot);
  },
  methods: {
    mountReactComponent(reactRoot: Root) {
      const { passedProps } = this.$props;
      const children = this.$slots.default !== undefined ? { children: this.$slots.default } : {};

      // Bind `@click` to `onClick`, `@submit` to `onSubmit`, ...
      const onEvents = Object.fromEntries(
        Object.entries(this.$listeners).map(([eventName, callback]) => [
          `on${capitalize(eventName)}`,
          callback,
        ])
      );

      reactRoot.render(
        <this.Component {...passedProps} {...children} {...this.$attrs} {...onEvents} />
      );
    },
  },
  updated() {
    this.mountReactComponent(this.reactRoot);
  },
  watch: {
    $props: {
      handler(newProps, oldProps) {
        if (oldProps.component !== newProps.component) {
          this.Component = makeReactComponent(newProps.component);
        }
        this.mountReactComponent(this.reactRoot);
      },
      deep: true,
    },
    $listeners: {
      handler() {
        this.mountReactComponent(this.reactRoot);
      },
      deep: true,
    },
  },
});
