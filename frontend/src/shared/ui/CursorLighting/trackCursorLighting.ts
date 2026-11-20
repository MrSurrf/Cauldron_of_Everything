const surfaceSelector = '[data-cursor-reveal]'
const backgroundSelector = 'main, [data-cursor-light-background]'
const suspensionSelector = '[data-cursor-light-suspended]'
const interactiveSelector = [
  'a[href]', 'button', 'input', 'select', 'textarea', 'label', 'summary',
  '[contenteditable="true"]', '[role="button"]', '[role="link"]',
  '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
  '[role="tab"]', '[role="option"]', '[role="menuitem"]',
].join(', ')

function isInteractiveSurface(surface: HTMLElement) {
  return surface.closest(interactiveSelector) !== null
}

function writeProperty(target: HTMLElement, name: string, value: string) {
  if (target.style.getPropertyValue(name) !== value) target.style.setProperty(name, value)
}

function clearProperties(target: HTMLElement, prefix: 'light' | 'reveal') {
  for (const suffix of ['x', 'y', 'active']) {
    const name = `--cursor-${prefix}-${suffix}`
    if (target.style.getPropertyValue(name)) target.style.removeProperty(name)
  }
}

function distanceToRect(x: number, y: number, rect: DOMRect) {
  return Math.hypot(Math.max(rect.left - x, 0, x - rect.right), Math.max(rect.top - y, 0, y - rect.bottom))
}

/** Координаты изолированы CSS @property; сначала читаем геометрию, затем меняем только свет. */
export function trackCursorLighting() {
  // Без регистрации свойств координаты снова наследовались бы всем содержимым страницы.
  if (!('registerProperty' in CSS)) return () => {}
  const media = window.matchMedia(
    '(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)',
  )
  const rootStyle = getComputedStyle(document.documentElement)
  const radius = parseFloat(rootStyle.getPropertyValue('--cursor-reveal-radius')) || 180
  const backgroundRadius = (parseFloat(rootStyle.getPropertyValue('--cursor-light-size')) || 760) / 2
  const backgrounds = new Set<HTMLElement>()
  const surfaces = new Map<HTMLElement, HTMLElement>()
  const visible = new Set<HTMLElement>()
  const litBackgrounds = new Set<HTMLElement>()
  const litSurfaces = new Set<HTMLElement>()
  let pointer: { x: number; y: number } | null = null
  let frame = 0
  let needsRefresh = false
  let suspended = Boolean(document.querySelector(suspensionSelector))

  function resetBackground(background: HTMLElement) {
    clearProperties(background, 'light')
    litBackgrounds.delete(background)
  }

  function resetSurface(surface: HTMLElement) {
    const target = surfaces.get(surface)
    if (target) clearProperties(target, 'reveal')
    litSurfaces.delete(surface)
  }

  function render() {
    frame = 0
    if (!pointer || !media.matches || suspended) return
    if (needsRefresh) {
      needsRefresh = false
      refreshSurfaces()
    }
    const { x, y } = pointer
    const measurements = [...visible].filter(surface => surfaces.has(surface) && !isInteractiveSurface(surface))
      .map(surface => ({ surface, rect: surface.getBoundingClientRect() }))
    const backgroundMeasurements = [...backgrounds].map(background => ({
      background,
      rect: background.getBoundingClientRect(),
      borderLeft: background.clientLeft,
      borderTop: background.clientTop,
    }))
    const nextBackgrounds = new Set<HTMLElement>()
    const nextSurfaces = new Set<HTMLElement>()

    for (const { background, rect, borderLeft, borderTop } of backgroundMeasurements) {
      if (!rect.width || !rect.height || distanceToRect(x, y, rect) > backgroundRadius) continue
      writeProperty(background, '--cursor-light-x', `${x - rect.left - borderLeft}px`)
      writeProperty(background, '--cursor-light-y', `${y - rect.top - borderTop}px`)
      writeProperty(background, '--cursor-light-active', '1')
      nextBackgrounds.add(background)
    }
    for (const { surface, rect } of measurements) {
      if (!rect.width || !rect.height || distanceToRect(x, y, rect) > radius) continue
      const target = surfaces.get(surface)!
      writeProperty(target, '--cursor-reveal-x', `${x - rect.left}px`)
      writeProperty(target, '--cursor-reveal-y', `${y - rect.top}px`)
      writeProperty(target, '--cursor-reveal-active', '1')
      nextSurfaces.add(surface)
    }
    for (const background of litBackgrounds) if (!nextBackgrounds.has(background)) resetBackground(background)
    for (const surface of litSurfaces) if (!nextSurfaces.has(surface)) resetSurface(surface)
    for (const background of nextBackgrounds) litBackgrounds.add(background)
    for (const surface of nextSurfaces) litSurfaces.add(surface)
  }

  function schedule() {
    if (pointer && media.matches && !suspended && !frame) frame = requestAnimationFrame(render)
  }

  function clearLights() {
    cancelAnimationFrame(frame)
    frame = 0
    for (const background of litBackgrounds) resetBackground(background)
    for (const surface of litSurfaces) resetSurface(surface)
  }

  function hide() {
    pointer = null
    clearLights()
  }

  function move(event: PointerEvent) {
    if (!media.matches || event.pointerType === 'touch' || !event.isPrimary) {
      hide()
      return
    }
    pointer = { x: event.clientX, y: event.clientY }
    schedule()
  }

  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const surface = entry.target as HTMLElement
      if (!surfaces.has(surface)) continue
      if (entry.isIntersecting) visible.add(surface)
      else { visible.delete(surface); resetSurface(surface) }
    }
    schedule()
  }, { rootMargin: `${radius}px` })
  const resize = new ResizeObserver(schedule)

  function refreshSurfaces() {
    for (const background of backgrounds) {
      if (!background.isConnected || !background.matches(backgroundSelector)) {
        resize.unobserve(background)
        backgrounds.delete(background)
        resetBackground(background)
      }
    }
    for (const background of document.querySelectorAll<HTMLElement>(backgroundSelector)) {
      if (backgrounds.has(background)) continue
      backgrounds.add(background)
      resize.observe(background)
    }
    for (const surface of surfaces.keys()) {
      if (!surface.isConnected || !surface.matches(surfaceSelector) || isInteractiveSurface(surface)) {
        intersection.unobserve(surface)
        resize.unobserve(surface)
        visible.delete(surface)
        resetSurface(surface)
        surfaces.delete(surface)
      }
    }
    for (const surface of document.querySelectorAll<HTMLElement>(surfaceSelector)) {
      if (isInteractiveSurface(surface)) continue
      const layer = surface.querySelector<HTMLElement>('[data-cursor-reveal-layer]')
      const target = layer?.closest(surfaceSelector) === surface ? layer : surface
      if (surfaces.get(surface) === target) continue
      if (surfaces.has(surface)) resetSurface(surface)
      else { intersection.observe(surface); resize.observe(surface) }
      surfaces.set(surface, target)
    }
  }

  // Изменения DOM объединяются в один кадр; запись style не запускает новый обход.
  const mutations = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) needsRefresh = true
    const nextSuspended = Boolean(document.querySelector(suspensionSelector))
    if (nextSuspended !== suspended) {
      suspended = nextSuspended
      if (suspended) clearLights()
    }
    schedule()
  })
  mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-cursor-light-suspended'] })
  refreshSurfaces()
  window.addEventListener('pointermove', move, { passive: true })
  document.documentElement.addEventListener('pointerleave', hide)
  document.addEventListener('scroll', schedule, { capture: true, passive: true })
  document.addEventListener('visibilitychange', hide)
  window.addEventListener('resize', schedule, { passive: true })
  window.addEventListener('blur', hide)
  media.addEventListener('change', hide)

  return () => {
    hide()
    intersection.disconnect()
    resize.disconnect()
    mutations.disconnect()
    window.removeEventListener('pointermove', move)
    document.documentElement.removeEventListener('pointerleave', hide)
    document.removeEventListener('scroll', schedule, true)
    document.removeEventListener('visibilitychange', hide)
    window.removeEventListener('resize', schedule)
    window.removeEventListener('blur', hide)
    media.removeEventListener('change', hide)
  }
}
