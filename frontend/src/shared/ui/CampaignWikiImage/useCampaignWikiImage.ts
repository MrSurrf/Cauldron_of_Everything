import { useEffect, useMemo, useState } from 'react'
import {
  CAMPAIGN_WIKI_IMAGE_CHANGED_EVENT,
  captureCampaignWikiImageRepository,
  getCampaignWikiImageAccountScope,
} from '../../local'
import type {
  CampaignWikiImageAsset,
  CampaignWikiImageChange,
  CampaignWikiImageRepository,
} from '../../local'

type ImageState = {
  key: string
  status: 'loading' | 'ready' | 'missing' | 'error'
  asset?: CampaignWikiImageAsset
  url?: string
  error?: string
}

export type CampaignWikiImageResult = {
  asset?: CampaignWikiImageAsset
  src?: string
  loading: boolean
  missing: boolean
  error?: string
}

export function useCampaignWikiImage(
  assetId: string | null | undefined,
  providedRepository?: CampaignWikiImageRepository,
): CampaignWikiImageResult {
  const defaultScope = getCampaignWikiImageAccountScope()
  const repository = useMemo(
    () => providedRepository ?? captureCampaignWikiImageRepository(defaultScope),
    [defaultScope, providedRepository],
  )
  const normalizedId = assetId?.trim() || null
  const [revision, setRevision] = useState(0)
  const key = `${repository.scope}:${normalizedId ?? ''}:${revision}`
  const [state, setState] = useState<ImageState | null>(null)

  useEffect(() => {
    if (!normalizedId || typeof window === 'undefined') return
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<CampaignWikiImageChange>).detail
      if (detail?.scope === repository.scope && detail.assetId === normalizedId) {
        setRevision(value => value + 1)
      }
    }
    window.addEventListener(CAMPAIGN_WIKI_IMAGE_CHANGED_EVENT, changed)
    return () => window.removeEventListener(CAMPAIGN_WIKI_IMAGE_CHANGED_EVENT, changed)
  }, [normalizedId, repository.scope])

  useEffect(() => {
    if (!normalizedId) return
    let cancelled = false
    let objectUrl: string | undefined

    void repository.get(normalizedId).then((asset) => {
      if (cancelled) return
      if (!asset) {
        setState({ key, status: 'missing' })
        return
      }
      objectUrl = URL.createObjectURL(asset.blob)
      setState({ key, status: 'ready', asset, url: objectUrl })
    }).catch((cause: unknown) => {
      if (cancelled) return
      setState({
        key,
        status: 'error',
        error: cause instanceof Error ? cause.message : 'Не удалось открыть изображение.',
      })
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [key, normalizedId, repository])

  if (!normalizedId) return { loading: false, missing: true }
  if (!state || state.key !== key) return { loading: true, missing: false }
  return {
    asset: state.asset,
    src: state.url,
    loading: state.status === 'loading',
    missing: state.status === 'missing',
    error: state.error,
  }
}

