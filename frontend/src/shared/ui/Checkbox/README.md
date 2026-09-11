# Checkbox

Компактный нативный флажок с подписью и необязательным описанием.

```tsx
<Checkbox
  label="Экипировано"
  checked={equipped}
  onCheckedChange={setEquipped}
/>
```

Для неуправляемого режима используйте `defaultChecked`. Нативные атрибуты
поля, включая `name`, `required`, `disabled` и `aria-*`, передаются в `input`.
Состояние `indeterminate` задаётся отдельно и отражается как
`aria-checked="mixed"`.

`className` применяется к самому `input`, а `rootClassName` — к внешней
подписи.
