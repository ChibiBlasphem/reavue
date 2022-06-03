import React from 'react';
import type { ComponentType, ReactNode } from 'react';
import { defineComponent } from '@vue/composition-api';
import { createRoot, Root } from 'react-dom/client';
import { VueWrapper } from './Vue';

const wrapVueChildren = (children: any) => {
  return defineComponent({
    render: (createElement) => createElement('div', children),
  });
};

const makeReactComponent = (Component: ComponentType<{ children?: ReactNode }>) => {
  const ReactComponent = function ({ children, ...props }: any) {
    const wrappedChildren = wrapVueChildren(children);

    return (
      <Component {...props}>{children && <VueWrapper component={wrappedChildren} />}</Component>
    );
  };

  ReactComponent.displayName = `ReactInVue${
    Component.displayName || Component.name || 'Component'
  }`;

  return ReactComponent;
};

export const ReactWrapper = defineComponent({
  props: ['component', 'passedProps'],
  render(createElement) {
    return createElement('div', { ref: 'react' });
  },
  data() {
    return {
      reactRoot: null,
    } as { reactRoot: any };
  },
  mounted() {
    this.reactRoot = createRoot(this.$refs.react as HTMLDivElement);
    this.mountReactComponent(this.reactRoot);
  },
  methods: {
    mountReactComponent(reactRoot: Root) {
      const { component, passedProps } = this.$props;
      const Component = makeReactComponent(component);
      const children = this.$slots.default !== undefined ? { children: this.$slots.default } : {};

      reactRoot.render(
        <Component {...passedProps} {...children} {...this.$attrs} {...this.$listeners} />
      );
    },
  },
  updated() {
    this.mountReactComponent(this.reactRoot);
  },
  watch: {
    $props: {
      handler() {
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
