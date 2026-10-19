import { useState } from 'react'
import { ArrowUpRight, MapPin, Star } from 'lucide-react'

const cuisineVisuals = [
  { match: /seafood|fish|crab|prawn|coastal/i, key: 'seafood', label: 'Seafood' },
  { match: /biryani|pulao/i, key: 'biryani', label: 'Biryani' },
  { match: /south indian|dosa|idli|chettinad|andhra|kerala|tamil|mangalorean/i, key: 'south-indian', label: 'South Indian' },
  { match: /cafe|coffee|bakery|dessert|ice cream|sweets/i, key: 'cafe-bakery', label: 'Cafe and bakery' },
  { match: /street food|chaat|snacks|kebab/i, key: 'street-food', label: 'Indian street food' },
  { match: /north indian|mughlai|punjabi|gujarati|rajasthani|thali|indian/i, key: 'north-indian', label: 'Indian cuisine' },
]

function hashText(value) {
  let hash = 2166136261
  for (const character of value) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 2147483646) + 1
}

function cleanKeyword(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 48)
}

function getCuisineVisual(restaurant) {
  const cuisines = Array.isArray(restaurant.cuisine) ? restaurant.cuisine : []
  const primaryCuisine = cleanKeyword(cuisines[0] || '')
  const metadata = `${cuisines.join(' ')} ${restaurant.name || ''}`
  const visual = cuisineVisuals.find(item => item.match.test(metadata)) || cuisineVisuals[cuisineVisuals.length - 1]
  const cleanedName = cleanKeyword(restaurant.name)
  const keyword = [primaryCuisine, cleanedName, 'Indian food'].filter(Boolean).join(',')
  const lock = hashText(`${primaryCuisine}|${cleanedName}`)

  return {
    primaryCuisine: primaryCuisine || visual.label,
    alt: `Representative ${visual.label.toLowerCase()} food image for ${restaurant.name}`,
    // The lock keeps the keyword-matched external image stable for this restaurant.
    remote: `https://loremflickr.com/800/600/${encodeURIComponent(keyword)}?lock=${lock}`,
    local: `/images/cuisines/${visual.key}.svg`,
  }
}

export default function RestaurantCard({ restaurant, rank }) {
  const visual = getCuisineVisual(restaurant)
  const [imageSrc, setImageSrc] = useState(visual.remote)
  const [usingLocalImage, setUsingLocalImage] = useState(false)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name}, ${restaurant.city}`)}`
  const rating = Number(restaurant.rating || 0)
  const reviews = Number(restaurant.reviews || 0)

  const useCuisineFallback = () => {
    if (!usingLocalImage) {
      setUsingLocalImage(true)
      setImageSrc(visual.local)
    }
  }

  return <article className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#e1ded5] bg-[#fffefa] transition duration-300 hover:-translate-y-1 hover:border-[#c7cfc5] hover:shadow-[0_18px_45px_rgba(31,54,42,.12)]">
    <div className="relative h-44 overflow-hidden bg-[#e5e1d6]">
      <img src={imageSrc} alt={visual.alt} onError={useCuisineFallback} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10"/>
      <span className="absolute left-3.5 top-3.5 rounded-full bg-[#fffdf7]/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#294d3c]">No. {String(rank).padStart(2, '0')}</span>
      <a href={mapsUrl} target="_blank" rel="noreferrer" aria-label={`Find ${restaurant.name} on Google Maps`} className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fffdf7]/95 text-[#294d3c] transition hover:bg-[#204c3b] hover:text-white"><ArrowUpRight size={16}/></a>
      <span className="absolute bottom-3.5 left-3.5 flex items-center gap-1 rounded-full bg-[#183e32]/90 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm"><Star size={12} fill="currentColor" className="text-[#f1cf7b]"/>{rating.toFixed(1)}</span>
    </div>
    <div className="flex flex-1 flex-col p-4 sm:p-[1.15rem]">
      <h3 className="font-serif text-[1.2rem] font-semibold leading-snug tracking-[-.015em] text-[#1d2922]">{restaurant.name}</h3>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-[#788078]"><MapPin size={13} className="shrink-0 text-[#a45a3c]"/><span>{restaurant.city}{restaurant.state ? `, ${restaurant.state}` : ''}</span></div>
      <div className="mt-3 text-[11px] text-[#8a918b]">{reviews > 0 ? `${reviews.toLocaleString('en-IN')} public reviews` : 'WIB editorial rating'}</div>
      <div className="mt-auto flex min-h-[54px] flex-wrap content-end gap-1.5 pt-4">{(restaurant.cuisine || []).slice(0, 3).map(item => <span key={item} className="rounded-full bg-[#edf0e9] px-2.5 py-1 text-[10px] font-medium text-[#49604e]">{item}</span>)}</div>
      <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between border-t border-[#eeece5] pt-3.5 text-[11px] font-semibold uppercase tracking-[.1em] text-[#49604e] transition group-hover:text-[#a45a3c]">Find on the map <ArrowUpRight size={14}/></a>
    </div>
  </article>
}
