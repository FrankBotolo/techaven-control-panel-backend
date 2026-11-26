# Live brand menu and filters

The categories API now adds `brands` containing canonical slug, display name, available model count and a representative catalogue image. Counts use distinct active devices with active variants, positive-stock active offers and approved active shops. Loans uses offer/category membership. Existing category fields and marketplace brand filtering remain compatible.

Frontend `BrandTiles.tsx` provides tinted image tiles, canonical brand links, focus styling and reduced-motion support. Header renders a full-width scrollable brand panel with a compact navigation sidebar. The category page replaces the generic three-image hero with live brand tiles. URL search is the filter state; loader dependencies trigger API filtering before pagination. Category retrieval walks all result pages rather than filtering an arbitrary first 60 products. Legacy display-name brand URLs are normalized through live brand identities. Missing representative images display the brand name rather than unrelated device photos.

Validation: all eight smartphone brand facet counts matched their filtered API counts with no cross-brand leakage. Category Google URL returned HTTP 200 with rendered brand tiles. Eleven initial focused frontend tests passed; final eight tests covering tiles, API filter forwarding and header keyboard/failure behavior passed. Final container production build passed. Windows test environment lacked happy-dom; authoritative tests ran in the configured frontend container. Browser visual inspection was unavailable: No Codex IAB backends were discovered. Changes are locally committed; no push.

Owning paths: backend controllers/CategoryController.js; frontend src/components/BrandTiles.tsx, Header.tsx, src/lib/catalog-api.ts, resolve-catalog.ts and src/routes/category.$slug.tsx. Existing unrelated dirty UI changes remain unstaged.

