import type { ReactNode } from 'react';
import React from 'react';
import { fireEvent, render } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ReactWrapper, REACT_WRAPPER_TESTID } from './React';
import { defineComponent } from '@vue/composition-api';

const ReactCountComponent = ({ count = 0 }: { count?: number }) => {
  return <div>Count is: {count}</div>;
};

const ReactButtonComponent = ({ onClick }: { onClick: () => void }) => {
  return <button onClick={onClick}>Button</button>;
};

const ReactChildrenComponent = ({ children }: { children: ReactNode }) => {
  return <div>{children}</div>;
};

const VueCountPropsComponentTester = defineComponent({
  props: {
    component: Function,
  },
  data() {
    return { count: 0 };
  },
  methods: {
    increment() {
      this.count++;
    },
  },
  render(h) {
    return h('div', [
      h('button', { on: { click: () => this.increment() } }, ['Increment']),
      h(ReactWrapper, { props: { component: this.component, passedProps: { count: this.count } } }),
    ]);
  },
});

const VueCountAttrsComponentTester = defineComponent({
  props: {
    component: Function,
  },
  data() {
    return { count: 0 };
  },
  methods: {
    increment() {
      this.count++;
    },
  },
  render(h) {
    return h('div', [
      h('button', { on: { click: () => this.increment() } }, ['Increment']),
      h(ReactWrapper, { props: { component: this.component }, attrs: { count: this.count } }),
    ]);
  },
});

const VueChildrenComponentTester = defineComponent({
  props: {
    component: Function,
  },
  data() {
    return { text: 'Bonjour' };
  },
  methods: {
    changeText() {
      this.text = this.text === 'Bonjour' ? 'Bonsoir' : 'Bonjour';
    },
  },
  render(h) {
    return h('div', [
      h('button', { on: { click: () => this.changeText() } }, ['Change text']),
      h(ReactWrapper, { props: { component: this.component } }, [h('div', [this.text] as any)]),
    ]);
  },
});

describe('Vue Wrapper', () => {
  it('should render the ReactComponent', async () => {
    const { findByText, getByTestId } = render(ReactWrapper, {
      props: {
        component: ReactCountComponent,
      },
    });

    const wrapper = getByTestId(REACT_WRAPPER_TESTID);
    expect(getComputedStyle(wrapper).display).toBe('contents');
    await findByText('Count is: 0');
  });

  it('Should not replace the entire element', async () => {
    const { findByText, getByRole } = render(VueCountPropsComponentTester, {
      props: {
        component: ReactCountComponent,
      },
    });

    const reactRoot = await findByText('Count is: 0');
    await fireEvent.click(getByRole('button'));
    const reactRootRerender = await findByText('Count is: 1');

    expect(reactRootRerender).toBe(reactRoot);
  });

  describe('passing props/attrs', () => {
    it('should render the ReactComponent with props', async () => {
      const { findByText } = render(ReactWrapper, {
        props: {
          component: ReactCountComponent,
          passedProps: {
            count: 1,
          },
        },
      });

      await findByText('Count is: 1');
    });

    it('should render the ReactComponent with attrs', async () => {
      const { findByText } = render(ReactWrapper, {
        props: {
          component: ReactCountComponent,
        },
        attrs: {
          count: 1,
        } as any,
      });

      await findByText('Count is: 1');
    });
  });

  it('should forward react event to emit', async () => {
    const mockOnClick = jest.fn();
    const { findByRole } = render(ReactWrapper, {
      props: {
        component: ReactButtonComponent,
      },
      listeners: {
        click: mockOnClick,
      },
    });

    const button = await findByRole('button');

    await userEvent.click(button);
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('should be possible to pass children', async () => {
    const { findByRole } = render(ReactWrapper, {
      props: {
        component: ReactChildrenComponent,
      },
      slots: {
        default: '<button>Child button</button>',
      },
    });

    await findByRole('button');
  });

  describe('update props/attrs', () => {
    it('should be possible to update props', async () => {
      const { findByRole, findByText } = render(VueCountPropsComponentTester, {
        props: {
          component: ReactCountComponent,
        },
      });

      await findByText('Count is: 0');
      await userEvent.click(await findByRole('button'));
      await findByText('Count is: 1');
    });

    it('should be possible to update props', async () => {
      const { findByRole, findByText } = render(VueCountAttrsComponentTester, {
        props: {
          component: ReactCountComponent,
        },
      });

      await findByText('Count is: 0');
      await userEvent.click(await findByRole('button'));
      await findByText('Count is: 1');
    });
  });

  it('should be possible to update children', async () => {
    const { findByText, findByRole } = render(VueChildrenComponentTester, {
      props: {
        component: ReactChildrenComponent,
      },
    });

    await findByText('Bonjour');
    await userEvent.click(await findByRole('button'));
    await findByText('Bonsoir');
  });
});
