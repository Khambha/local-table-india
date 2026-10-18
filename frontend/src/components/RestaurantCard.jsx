import { ArrowUpRight, MapPin, Star } from 'lucide-react'

const foodPhotos = [
  'photo-1585937421612-70a008356fbe',
  'photo-1565557623262-b51c2513a641',
  'photo-1546833999-b9f581a1996d',
  'photo-1565299624946-b28f40a0ae38',
  'photo-1555939594-58d7cb561ad1',
  'photo-1547573854-74d2a71d0826',
  'photo-1504674900247-0877df9cc836',
  'photo-1517248135467-4c7edcad34c4',
  'photo-1512621776951-a57141f2eefd',
  'photo-1547592180-85f173990554',
]

export default function RestaurantCard({ restaurant, rank }) {
  const photo = foodPhotos[(rank - 1) % foodPhotos.length]
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name}, ${restaurant.city}`)}`
  const rating = Number(restaurant.rating || 0)
  const reviews = Number(restaurant.reviews || 0)

  return <article className="group flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#e1ded5] bg-[#fffefa] transition duration-300 hover:-translate-y-1 hover:border-[#c7cfc5] hover:shadow-[0_18px_45px_rgba(31,54,42,.12)]">
    <div className="relative h-44 overflow-hidden bg-[#e5e1d6]">
      <img src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=78`} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-105"/>
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
