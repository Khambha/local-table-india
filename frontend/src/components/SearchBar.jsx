import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, MapPin, Search } from 'lucide-react'

const OTHER_CITY = 'Others...'

export default function SearchBar({ cities = [], city = '', onChange }) {
  const [query, setQuery] = useState('')
  const [customCity, setCustomCity] = useState('')
  const [open, setOpen] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')

  const filteredCities = useMemo(
    () => cities.filter(item => item.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8),
    [cities, query],
  )

  const selectCity = (nextCity) => {
    setCustomMode(false)
    setCustomCity('')
    setValidationMessage('')
    setQuery('')
    setOpen(false)
    onChange(nextCity)
  }

  const selectOther = () => {
    setCustomMode(true)
    setCustomCity('')
    setValidationMessage('')
    setQuery('')
    setOpen(false)
  }

  const submitCustomCity = (event) => {
    event.preventDefault()
    const value = customCity.trim()
    if (!value) {
      setValidationMessage('Type a city name to continue.')
      return
    }
    if (value.length > 120) {
      setValidationMessage('City names must be 120 characters or fewer.')
      return
    }
    setValidationMessage('')
    // Keep the user's spelling and casing; the API receives this exact city name.
    onChange(value)
  }

  return <div className="relative w-full sm:w-[310px]">
    <label className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-stone-500">Find your city</label>
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 shadow-sm transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-800/10">
      <MapPin size={18} className="shrink-0 text-emerald-800" />
      <input
        aria-label="Search city"
        aria-expanded={open}
        aria-controls="city-options"
        aria-autocomplete="list"
        role="combobox"
        value={open ? query : customMode ? OTHER_CITY : city}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter') {
            event.preventDefault()
            if (filteredCities.length) selectCity(filteredCities[0])
            else selectOther()
          }
        }}
        placeholder="Search a city..."
        className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
      />
      {open ? <Search size={16} className="shrink-0 text-stone-400" /> : <ChevronDown size={16} className="shrink-0 text-stone-400" />}
    </div>

    {open && <>
      <button aria-label="Close city list" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
      <div id="city-options" role="listbox" aria-label="Available cities" className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-stone-200 bg-white p-1 shadow-xl">
        {filteredCities.map(item => <button key={item} type="button" role="option" aria-selected={item === city} onClick={() => selectCity(item)} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 transition hover:bg-emerald-50 hover:text-emerald-900">{item}</button>)}
        {filteredCities.length === 0 && <p className="px-3 py-2 text-xs text-stone-500">No matching operational city</p>}
        <button type="button" role="option" aria-selected={customMode} onClick={selectOther} className="mt-1 flex w-full items-center justify-between rounded-lg border-t border-stone-100 px-3 py-3 text-left text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50">
          <span>{OTHER_CITY}</span><span className="text-xs font-normal text-stone-400">Enter a city name</span>
        </button>
      </div>
    </>}

    <div className={`grid transition-all duration-300 ease-out ${customMode ? 'mt-3 grid-rows-[1fr] translate-y-0 opacity-100' : 'pointer-events-none grid-rows-[0fr] -translate-y-1 opacity-0'}`} aria-hidden={!customMode}>
      <div className="overflow-hidden">
        <form onSubmit={submitCustomCity} className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
          <label htmlFor="custom-city" className="mb-2 block text-[11px] font-semibold uppercase tracking-[.12em] text-stone-500">Your city</label>
          <div className="flex gap-2">
            <input
              id="custom-city"
              value={customCity}
              maxLength={120}
              disabled={!customMode}
              onChange={event => { setCustomCity(event.target.value); setValidationMessage('') }}
              placeholder="e.g. Mysuru, Vizag"
              className="h-10 min-w-0 flex-1 rounded-lg border border-stone-200 px-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-800/10"
              aria-describedby={validationMessage ? 'city-validation' : undefined}
            />
            <button type="submit" disabled={!customMode} aria-label="Search this city" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-white transition hover:bg-emerald-800 disabled:opacity-50"><ArrowRight size={16}/></button>
          </div>
          {validationMessage && <p id="city-validation" role="alert" className="mt-2 text-xs text-rose-700">{validationMessage}</p>}
        </form>
      </div>
    </div>
  </div>
}
