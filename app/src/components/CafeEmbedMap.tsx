import { mapEmbedUrl, type MappableCafe } from '../lib/mapEmbed'

/**
 * A small embedded Google Map for one cafe, using its name and address/neighbourhood as a
 * search query — no stored coordinates needed. Renders nothing if VITE_GOOGLE_MAPS_EMBED_KEY
 * isn't set (see README), so the app works the same without it, just without the map.
 */
export function CafeEmbedMap({ cafe }: { cafe: MappableCafe }) {
  const src = mapEmbedUrl(cafe, import.meta.env.VITE_GOOGLE_MAPS_EMBED_KEY)
  if (!src) return null
  return (
    <div className="cafe-map">
      <iframe
        src={src}
        title={`Map of ${cafe.name}`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  )
}
