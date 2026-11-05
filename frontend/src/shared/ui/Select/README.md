# Select

Выбор из фиксированного списка без текстового ввода. Для поиска по большому
справочнику используйте `Combobox`.

```tsx
<Select aria-label="Раздел" value={section} options={sections}
  onValueChange={setSection} />
```

Управляемые `value`/`onValueChange`, `label`, `disabled`, `readOnly`, скрытое
поле формы через `name`. Стрелки, Home/End и поиск первыми буквами перемещают
выбор; Enter/Space подтверждают, Escape отменяет, Tab закрывает список.
Список открывается в portal, переносится вверх у края экрана и сохраняет
фокус на кнопке. Анимации учитывают `prefers-reduced-motion`.
