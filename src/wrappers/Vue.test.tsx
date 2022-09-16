import React, { useState } from 'react';
import Vue from 'vue';
import { render, act, fireEvent } from '@testing-library/react';
import { VueWrapper, VUE_WRAPPER_TESTID } from './Vue';
import { defineComponent } from '@vue/composition-api';
import type { Component } from 'vue';

Vue.config.devtools = false;
Vue.config.productionTip = false;

const VueCountComponent = defineComponent({
  props: {
    count: {
      type: Number,
      default: 0,
    },
  },
  render(h) {
    const count = (this.$props as { count: number }).count;
    return h('span', ['Count is: ', count.toString()]);
  },
});

const VueButtonComponent = defineComponent({
  emits: ['click'],
  render(h) {
    return h(
      'button',
      {
        on: {
          click: (e: any) => this.$emit('click', e),
        },
      },
      ['Button']
    );
  },
});

const VueChildrenComponent = defineComponent({
  render(h) {
    return h('div', [this.$slots.default]);
  },
});

const ReactCountComponentTester = ({ component }: { component: Component }) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <VueWrapper component={component} count={count} />
    </div>
  );
};

const ReactChildrenComponentTester = ({ component }: { component: Component }) => {
  const [text, setText] = useState('Bonjour');

  return (
    <div>
      <button onClick={() => setText((c) => (c === 'Bonjour' ? 'Bonsoir' : 'Bonjour'))}>
        Change text
      </button>
      <VueWrapper component={component}>{text}</VueWrapper>
    </div>
  );
};

const ReactLifecycleComponentTester = ({
  component,
  $options,
}: {
  component: Component;
  $options: any;
}) => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
      <VueWrapper component={component} count={count} $options={$options} />
    </div>
  );
};

describe('Vue Wrapper', () => {
  it('should render the ReactComponent', () => {
    const { getByText, getByTestId } = render(
      <VueWrapper count={0} component={VueCountComponent} />
    );

    const wrapper = getByTestId(VUE_WRAPPER_TESTID);
    expect(getComputedStyle(wrapper).display).toBe('contents');
    getByText('Count is: 0');
  });

  it('should render the ReactComponent with props', () => {
    const { getByText } = render(<VueWrapper component={VueCountComponent} count={1} />);

    getByText('Count is: 1');
  });

  it('should forward react event to emit', () => {
    const mockOnClick = jest.fn();
    const { getByRole } = render(
      <VueWrapper component={VueButtonComponent} on={{ click: mockOnClick }} />
    );

    const button = getByRole('button');

    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('should be possible to pass children', () => {
    const { getByRole } = render(
      <VueWrapper component={VueChildrenComponent}>
        <button>Child button</button>
      </VueWrapper>
    );

    getByRole('button');
  });

  it('should be possible to update props', async () => {
    const { getByRole, getByText } = render(
      <ReactCountComponentTester component={VueCountComponent} />
    );

    getByText('Count is: 0');
    await act(() => {
      fireEvent.click(getByRole('button'));
    });
    getByText('Count is: 1');
  });

  it('should be possible to update children', async () => {
    const { getByText, getByRole } = render(
      <ReactChildrenComponentTester component={VueChildrenComponent} />
    );

    getByText('Bonjour');
    await act(async () => {
      fireEvent.click(getByRole('button'));
    });
    getByText('Bonsoir');
  });

  it('should be able to take lifecycle methods', async () => {
    const beforeCreate = jest.fn();
    const updated = jest.fn();
    const destroyed = jest.fn();

    const $options = {
      lifecycles: {
        beforeCreate,
        destroyed,
        updated,
      },
    };

    const { getByRole, unmount } = render(
      <ReactLifecycleComponentTester component={VueCountComponent} $options={$options} />
    );
    expect(beforeCreate).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(getByRole('button'));
    });
    expect(updated).toHaveBeenCalled();

    unmount();
    expect(destroyed).toHaveBeenCalled();
  });
});
