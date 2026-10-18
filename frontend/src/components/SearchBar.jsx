import { useMemo, useState } from 'react'
import { MapPin, Search, ChevronDown } from 'lucide-react'

export default function SearchBar({ cities, city, onChange }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = useMemo(() => cities.filter(c => c.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [cities, query])
  return <div className="relative w-full sm:w-[310px]">
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-stone-500">Find your city</label>
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 shadow-sm focus-within:border-emerald-700">
      <MapPin size={18} className="text-emerald-800" />
      <input aria-label="Search city" value={open ? query : city} onFocus={() => { setOpen(true); setQuery('') }} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && filtered[0]) { onChange(filtered[0]); setOpen(false) } }} placeholder="Search a city..." className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" />
      {open ? <Search size={16} className="text-stone-400" /> : <ChevronDown size={16} className="text-stone-400" />}
    </div>
    {open && <><button aria-label="Close city list" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} /><div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl">{filtered.length ? filtered.map(c => <button key={c} onClick={() => { onChange(c); setQuery(''); setOpen(false) }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 hover:bg-emerald-50 hover:text-emerald-900">{c}</button>) : <p className="px-3 py-4 text-sm text-stone-500">No cities found</p>}</div></>}
  </div>
}
