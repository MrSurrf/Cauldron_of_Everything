function establishesFixedContainingBlock(
  style: CSSStyleDeclaration,
) {
  const containment = style.contain
    .split(/\s+/)
    .filter(Boolean)
  const willChange = style.willChange
    .split(',')
    .map((property) => property.trim())

  return (
    style.transform !== 'none' ||
    style.perspective !== 'none' ||
    style.filter !== 'none' ||
    (style.backdropFilter !== '' &&
      style.backdropFilter !== 'none') ||
    containment.some((value) =>
      [
        'content',
        'layout',
        'paint',
        'strict',
      ].includes(value),
    ) ||
    willChange.some((property) =>
      [
        'backdrop-filter',
        'filter',
        'perspective',
        'transform',
      ].includes(property),
    ) ||
    style.contentVisibility === 'auto' ||
    (style.containerType !== '' &&
      style.containerType !== 'normal')
  )
}

function isViewportFixedSafe(
  container: HTMLElement,
) {
  const ownerDocument = container.ownerDocument
  const view = ownerDocument.defaultView

  if (!view) {
    return false
  }

  let current: HTMLElement | null = container

  while (
    current &&
    current !== ownerDocument.body &&
    current !== ownerDocument.documentElement
  ) {
    if (
      establishesFixedContainingBlock(
        view.getComputedStyle(current),
      )
    ) {
      return false
    }

    current = current.parentElement
  }

  return true
}

export function resolvePortalContainer(
  anchor: HTMLElement | null,
  requested?: HTMLElement,
) {
  const ownerDocument =
    anchor?.ownerDocument ??
    requested?.ownerDocument ??
    (typeof document === 'undefined'
      ? null
      : document)
  const fallback = ownerDocument?.body ?? null

  if (!ownerDocument || !fallback) {
    return null
  }

  const candidate =
    requested ??
    anchor?.closest<HTMLElement>(
      '[data-overlay-root]',
    ) ??
    fallback

  if (
    candidate.ownerDocument !== ownerDocument ||
    !isViewportFixedSafe(candidate)
  ) {
    return fallback
  }

  return candidate
}
