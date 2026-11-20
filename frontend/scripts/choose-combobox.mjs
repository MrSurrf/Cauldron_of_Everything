// Выбор в общем Select для коротких списков или поисковом Combobox для справочников.
export async function chooseCombobox(page, label, option) {
  const control = page.getByRole('combobox', { name: label, exact: true })
  await control.click()
  if (await control.evaluate(element => element.tagName === 'INPUT')) await control.fill(option)
  await page.getByRole('option', { name: option, exact: true }).click()
}
