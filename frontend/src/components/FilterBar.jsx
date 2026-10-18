import { SlidersHorizontal } from 'lucide-react'

export default function FilterBar({ cuisines, cuisine, onChange }) {
  return <div className="flex items-center gap-3 overflow-x-auto pb-1">
    <span className="mr-1 hidden items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 md:flex"><SlidersHorizontal size={14} /> Cuisine</span>
    <button onClick={() => onChange('')} className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${!cuisine ? 'bg-emerald-900 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-emerald-800'}`}>All cuisines</button>
    {cuisines.map(item => <button key={item} onClick={() => onChange(cuisine === item ? '' : item)} className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${cuisine === item ? 'bg-emerald-900 text-white' : 'border border-stone-200 bg-white text-stone-600 hover:border-emerald-800'}`}>{item}</button>)}
  </div>
}
