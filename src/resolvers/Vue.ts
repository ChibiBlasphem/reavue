import { defineComponent } from '@vue/composition-api';
import { ReactWrapper } from '../wrappers/React';

export function ReactInVue(component: Function) {
  return defineComponent({
    components: { ReactWrapper },
    props: ['passedProps'],
    inheritAttrs: false,
    render(createElement) {
      return createElement(
        'ReactWrapper',
        {
          props: {
            component,
            passedProps: this.$props.passedProps,
          },
          attrs: this.$attrs,
          on: this.$listeners,
        },
        this.$slots.default
      );
    },
  });
}
