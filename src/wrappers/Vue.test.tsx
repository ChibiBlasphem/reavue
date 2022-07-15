import React, { useState } from 'react';
import { render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VueWrapper } from './Vue';
import { defineComponent } from '@vue/composition-api';
import type { Component } from 'vue';

const VueCountComponent = defineComponent({
  props: {
    count: {
      type: Number,
      default: 0,
    },
  },
  render(h) {
    const count = (this.$props as { count: number }).count;
    return h('div', ['Count is: ', count.toString()]);
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
  it('should render the ReactComponent', async () => {
    const { findByText } = render(<VueWrapper count={0} component={VueCountComponent} />);

    await findByText('Count is: 0');
  });

  it('should render the ReactComponent with props', async () => {
    const { findByText } = render(<VueWrapper component={VueCountComponent} count={1} />);

    await findByText('Count is: 1');
  });

  it('should forward react event to emit', async () => {
    const mockOnClick = jest.fn();
    const { findByRole } = render(
      <VueWrapper component={VueButtonComponent} on={{ click: mockOnClick }} />
    );

    const button = await findByRole('button');

    await userEvent.click(button);
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('should be possible to pass children', async () => {
    const { findByRole } = render(
      <VueWrapper component={VueChildrenComponent}>
        <button>Child button</button>
      </VueWrapper>
    );

    await findByRole('button');
  });

  it('should be possible to update props', async () => {
    const { findByRole, findByText } = render(
      <ReactCountComponentTester component={VueCountComponent} />
    );

    await findByText('Count is: 0');
    await act(async () => {
      await userEvent.click(await findByRole('button'));
    });
    await findByText('Count is: 1');
  });

  it('should be possible to update children', async () => {
    const { findByText, findByRole } = render(
      <ReactChildrenComponentTester component={VueChildrenComponent} />
    );

    await findByText('Bonjour');
    await act(async () => {
      await userEvent.click(await findByRole('button'));
    });
    await findByText('Bonsoir');
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

    const { findByRole, unmount } = render(
      <ReactLifecycleComponentTester component={VueCountComponent} $options={$options} />
    );
    expect(beforeCreate).toHaveBeenCalled();

    await act(async () => {
      await userEvent.click(await findByRole('button'));
    });
    expect(updated).toHaveBeenCalled();

    unmount();
    expect(destroyed).toHaveBeenCalled();
  });
});
