# Re-Vue

Let you use Vue components inside of your React components and vice-versa.

## Installation
> re-vue has `vue@^2.6`, `@vue/composition-api`, `react@>=18`, `react-dom@>=18` as peer dependencies
```sh
yarn add re-vue
```

## Use Vue components in React

### With the HOC API

```tsx
import React from 'react';
import MyVueComponent from './path/to/MyComponent.vue';
import { VueInReact } from 're-vue';

const MyComponent = VueInReact(MyVueComponent);

export function MyReactComponent() {
  return <MyComponent message="Hello world" />
}
```

### With the wrapper component
```tsx
import React from 'react';
import MyVueComponent from './path/to/MyVueComponent.vue';
import { VueWrapper } from 're-vue';

export function MyReactComponent() {
  return <VueWrapper component={MyVueComponent} message="Hello world" />
}
```

## Use React components in Vue

### With the HOC API
```vue
<template>
  <ReactComponent message="Hello world" />
</template>

<script lang="ts">
import { MyReactComponent } from './path/to/MyReactComponent';
import { ReactInVue } from 're-vue';

export default defineComponent({
    components: {
        ReactComponent: ReactInVue(MyReactComponent)
    },
})
</script>
```

### With the wrapper component
```vue
<template>
  <ReactWrapper :component="MyReactComponent" message="Hello world" />
</template>

<script lang="ts">
import { MyReactComponent } from './path/to/MyReactComponent';
import { ReactWrapper } from 're-vue';

export default defineComponent({
    components: {
        ReactWrapper,
    },
    computed: {
        MyReactComponent() {
            return MyReactComponent;
        }
    }
})
</script>
```