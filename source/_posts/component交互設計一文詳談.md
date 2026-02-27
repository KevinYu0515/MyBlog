---
title: Vue Component 交互設計，你只會 Props 和 Emits 嗎
toc: true
cover: /gallery/covers/default.jpg
date: 2026-02-27 10:22:34
tags: ["front-end", "vue"]
categories:  ["Develop", "Web"]
excerpt: "簡單探討 props、emits、provide/inject、composable 的使用情境"
---

Vue 設計的核心就是 Component 和 Reactive，那麼不同 Component 要如何傳遞參數、Function 是個值得探討的技術問題，以下分為三種情況探討
- Parent -> Child：父元件傳遞參數給子元件
- Child -> Parent：子元件呼叫父元件方法
- Sibling Communication：同層級的元件如何溝通

## Parent -> Child

這個情況可以使用 props 實現，除了基本型別之外，也能傳入 Function、Array 等 Object 參數

```ts Parent Component
<template>
  <Card :count="count"/>
  <button @click="click">Add Count</button>
</template>

<script setup>
import { ref } from "vue";
import Card from './card.vue';

const count = ref(0);
const click = () => {
  count.value += 1;
}
</script>
```

```ts Child Component(card.vue)
<template>
    <div>{{ props.count }}</div>
</template>

<script setup lang="ts">
const props = defineProps({
    count: Number
})
</script>
```

如果 child 需要自己管理內部的狀態，不應該直接修改 props 參數，而是建立自己的 reactive value 控制，而且 props 的資料流是單向的，所以不能直接在 child 修改 props，以下是上面範例 props 的型別
```ts
const props: {
    readonly count?: number;
}
```
---

## Child -> Parent

那麼如果不能在 Child 修改 props，那可不可以透過呼叫 Parent 的 function 來修改 props，答案是可行的，這邊使用 emits 實現

```ts parent component
<template>
  <h1>Current Count: {{ count }}</h1>
  <Card
    :count="count"
    @add="click"
    />
  <button @click="click">Add Count</button>
</template>

<script setup>
import { ref } from "vue";
import Card from './card.vue';

const count = ref(0);
const click = () => {
  count.value += 1;
}
</script>
```

```ts child component(card.vue)
<template>
    <div>{{ props.count }}</div>
    <div>
        <button @click="emits('add')">Add Count</button>
    </div>
</template>

<script setup lang="ts">
const props = defineProps({
    count: Number
})
const emits = defineEmits<{
    (e: 'add'): void
}>()
</script>
```

這邊 child 會去呼叫 parent 的 click function 來作為 add 使用，這樣就是從 parent 層面修改 reactive vlue 來響應子元件的 props。

如果想要傳遞參數可以這樣寫

```ts parent component
<template>
  <h1>Current Count: {{ count }}</h1>
  <Card
    :count="count"
    @add="click"
    />
  <button @click="click(1)">Add Count</button>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import Card from './card.vue';

const count = ref(0);
const click: (v: number) => void = (v) => {
  count.value += v;
}
</script>
```

```ts child component(card.vue)
<template>
    <div>{{ props.count }}</div>
    <div>
        <button @click="emits('add', 10)">Add Count</button>
    </div>
</template>

<script setup lang="ts">
const props = defineProps({
    count: Number
})
const emits = defineEmits<{
    (e: 'add', v: number): void
}>()
</script>
```

---

## Sibling Communication

如果兩個 Component 在同一個層級，不是父子關係要傳遞資料的情況，就會需要建立一個共享的資料來源

### **Props + Emits**

最原始的做法可以先在共同的 Parent Component 定義 reactive value，之後添加 props 和 emits 在這兩個 Sibling Component 上。
假如 ChildA Component 要更新狀態， ChildB Component 要可以成功顯示

```ts Parent Component
<template>
  <ChildA @update="handleUpdate" />
  <ChildB :value="sharedValue" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChildA from './ChildA.vue'
import ChildB from './ChildB.vue'

const sharedValue = ref('')

function handleUpdate(val: string) {
  sharedValue.value = val
}
</script>
```

這樣在 ChildA 就會將要更新的狀態丟給 Parent Componet 的 sharedValue，同時響應給 ChildB 的 props.value。
不過這樣如果要做雙向，就會需要在兩邊都要開 props 和 emits 的接口

### **建立 Composable**

更好的做法是建立一個有狀態的 Function，在 Vue 稱此為 Composable。
這樣也能在不同 Component 之間做到共享資料，不過要注意不要將 reactive value 放入 function，不然會變成 local scope，每次 Component 創建都是新的 reactive value，所以如果真的要共享資料，記得將 reactive value 宣告在 module scope，因為每個 module 只會載入一次，所以才能保證資料一致。

```ts useSharedState.ts
import { ref } from 'vue'

const sharedValue = ref('') // 放在 module scope
export function useSharedState() {
  return { sharedValue }
}
```

```ts ChildA.vue
import { useSharedState } from './useSharedState'
const { sharedValue } = useSharedState()

function send() {
  sharedValue.value = 'Hello Sibling'
}
```

```ts ChildB.vue
import { useSharedState } from './useSharedState'
const { sharedValue } = useSharedState()
```

---

## Props Drilling

如果 component 太多層，會導致需要傳遞很多次 props，這個糟糕的狀況稱作 Props Drilling，那麼能不能在 Parent 定義好，讓 Child 可以直接呼叫，Vue 提供了 provide、inject 就是用來解決這個問題

```ts parent component
<script setup lang="ts">
import { ref, provide } from 'vue'

const count = ref(0)
provide('count', count)    // 將 count 提供給 Child
</script>
```

```ts child component
<script setup lang="ts">
import { inject } from 'vue'

const count = inject('count') as Ref<number>

function increment() {
  if (count) count.value++
}
</script>
```

簡單來說，provide 做的事是在 Parent DOM 將 count 這個屬性註冊在 instance 上，這樣當 child 用 inject 調用時，就會往上尋找 Parent 的 count 屬性。這樣就能避免 props 每一層都需要建構導致維護成本增加。

不過這個 reactive value 只限這個 Parent Componet 的 Scope，如果想要在任何一個 Component 都能呼叫，就要導入 store 的技巧，建立全域的 reactive value，'可以參考 [pinia](https://pinia.vuejs.org/)、[vuex](https://vuex.vuejs.org/zh/)

---

## 總結

一開始開發可以先從 props、emits 開始，隨著 component 越來越多，需要共享資料或是減少重複的邏輯，就在套入 composable、provide/inject、store 等語法讓專案更容易維護。不過也不要因為某個語法太好用，就全部採用，要分清楚那些是 local scope、那些需要跨頁面共享，再採取是要直接定義在 module scope 變成共享資料還是定義在 function scope 變成 local reactive value。這樣才能讓一個專案穩定的擴大並減少 component 之間的耦合關係。