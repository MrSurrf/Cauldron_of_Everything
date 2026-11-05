# CampaignWikiImage

`CampaignWikiImageField` загружает обложку или портрет, уменьшает изображение и
сохраняет его в отдельной IndexedDB текущего аккаунта. В документе кампании нужно
хранить только возвращённый `assetId`.

```tsx
<CampaignWikiImageField
  kind="cover"
  assetId={card.coverAssetId}
  onAssetIdChange={coverAssetId => updateCard({ coverAssetId })}
/>
```

Замена перезаписывает тот же `assetId`, поэтому ссылка карточки остаётся стабильной.
Для показа без контролов передайте `editable={false}` либо используйте
`useCampaignWikiImage(assetId)` и его `src`. Object URL освобождается автоматически.
