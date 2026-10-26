/** Настоящее изображение для UI stories: проходит браузерное декодирование и canvas export. */
export async function createTestImageFile(name = 'portrait.png'): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 240
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas недоступен в тестовом окружении.')
  context.fillStyle = 'rgb(70 110 150)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgb(160 190 220)'
  context.fillRect(100, 40, 120, 160)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Не удалось создать тестовое изображение.')), 'image/png'))
  return new File([blob], name, { type: 'image/png' })
}
