import type { ComponentType, ReactNode } from 'react';
import React from 'react';
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

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

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

      // Bind `@click` to `onClick`, `@submit` to `onSubmit`, ...
      const onEvents = Object.fromEntries(
        Object.entries(this.$listeners).map(([eventName, callback]) => [
          `on${capitalize(eventName)}`,
          callback,
        ])
      );

      reactRoot.render(<Component {...passedProps} {...children} {...this.$attrs} {...onEvents} />);
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
