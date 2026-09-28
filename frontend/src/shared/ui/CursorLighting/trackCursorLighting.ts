const surfaceSelector = '[data-cursor-reveal]'

/** Общий цикл обновления: сначала измерения видимых панелей, затем запись стилей. */
export function trackCursorLighting(glow: HTMLElement) {
  const media = window.matchMedia(
    '(any-hover: hover) and (any-pointer: fine) and (prefers-reduced-motion: no-preference) and (forced-colors: none)',
  )
  const radius = parseFloat(getComputedStyle(glow).getPropertyValue('--cursor-reveal-radius')) || 180
  const surfaces = new Set<HTMLElement>()
  const visible = new Set<HTMLElement>()
  const lit = new Set<HTMLElement>()
  let pointer: { x: number; y: number } | null = null
  let frame = 0

  function resetSurface(surface: HTMLElement) {
    surface.style.removeProperty('--cursor-reveal-x')
    surface.style.removeProperty('--cursor-reveal-y')
    surface.style.removeProperty('--cursor-reveal-active')
    lit.delete(surface)
  }

  function render() {
    frame = 0
    if (!pointer || !media.matches) return
    const { x, y } = pointer
    const measurements = [...visible].map(surface => ({ surface, rect: surface.getBoundingClientRect() }))
    const nextLit = new Set<HTMLElement>()

    glow.style.setProperty('--cursor-light-x', `${x}px`)
    glow.style.setProperty('--cursor-light-y', `${y}px`)
    glow.dataset.active = 'true'
    for (const { surface, rect } of measurements) {
      const dx = Math.max(rect.left - x, 0, x - rect.right)
      const dy = Math.max(rect.top - y, 0, y - rect.bottom)
      if (!rect.width || !rect.height || Math.hypot(dx, dy) > radius) continue
      surface.style.setProperty('--cursor-reveal-x', `${x - rect.left}px`)
      surface.style.setProperty('--cursor-reveal-y', `${y - rect.top}px`)
      surface.style.setProperty('--cursor-reveal-active', '1')
      nextLit.add(surface)
    }
    for (const surface of lit) {
      if (!nextLit.has(surface)) resetSurface(surface)
    }
    for (const surface of nextLit) lit.add(surface)
  }

  function schedule() {
    if (pointer && media.matches && !frame) frame = requestAnimationFrame(render)
  }

  function hide() {
    pointer = null
    cancelAnimationFrame(frame)
    frame = 0
    delete glow.dataset.active
    for (const surface of lit) resetSurface(surface)
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
      if (entry.isIntersecting) visible.add(surface)
      else {
        visible.delete(surface)
        resetSurface(surface)
      }
    }
    schedule()
  }, { rootMargin: `${radius}px` })
  const resize = new ResizeObserver(schedule)

  // Новые маршруты и раскрытые карточки подключаются автоматически.
  // Изменения style намеренно не наблюдаем: они записываются самим эффектом.
  function refreshSurfaces() {
    for (const surface of surfaces) {
      if (!surface.isConnected) {
        intersection.unobserve(surface)
        resize.unobserve(surface)
        surfaces.delete(surface)
        visible.delete(surface)
        resetSurface(surface)
      }
    }
    for (const surface of document.querySelectorAll<HTMLElement>(surfaceSelector)) {
      if (surfaces.has(surface)) continue
      surfaces.add(surface)
      intersection.observe(surface)
      resize.observe(surface)
    }
    schedule()
  }

  const mutations = new MutationObserver(refreshSurfaces)
  mutations.observe(document.body, { childList: true, subtree: true })
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
