// Выбор в общем Combobox вместо нативного HTML select.
export async function chooseCombobox(page, label, option) {
  const control = page.getByRole('combobox', { name: label, exact: true })
  await control.click()
  await control.fill(option)
  await page.getByRole('option', { name: option, exact: true }).click()
}
