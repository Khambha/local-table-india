import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, Compass, Flame, Sparkles, UtensilsCrossed } from 'lucide-react'
import SearchBar from './components/SearchBar.jsx'
import FilterBar from './components/FilterBar.jsx'
import RestaurantCard from './components/RestaurantCard.jsx'

const API = (import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')).replace(/\/$/, '')

export default function App() {
  const [cities, setCities] = useState([])
  const [cityLoadState, setCityLoadState] = useState('loading')
  const [city, setCity] = useState('')
  const [cuisines, setCuisines] = useState([])
  const [cuisine, setCuisine] = useState('')
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API}/api/cities`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('City request failed'); return response.json() })
      .then(data => { const list = data.cities || []; setCities(list); setCityLoadState(list.length ? 'ready' : 'empty'); if (list.length) setCity(list[0]) })
      .catch(error => { if (error.name !== 'AbortError') { setCityLoadState('error'); setError('The guide is taking a break. Check that the API is running and Supabase is connected.') } })
    return () => controller.abort()
  }, [])

  const loadPlaces = useCallback(async (signal) => {
    if (!city) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ city })
      if (cuisine) params.set('cuisine', cuisine)
      const [cuisineResponse, placesResponse] = await Promise.all([
        fetch(`${API}/api/cuisines?city=${encodeURIComponent(city)}`, { signal }),
        fetch(`${API}/api/restaurants?${params}`, { signal }),
      ])
      if (!cuisineResponse.ok || !placesResponse.ok) throw new Error('Could not load city data')
      const [cuisineData, placesData] = await Promise.all([cuisineResponse.json(), placesResponse.json()])
      setCuisines(cuisineData.cuisines || [])
      setRestaurants(placesData || [])
    } catch (error) {
      if (error.name !== 'AbortError') setError('Could not load this shortlist. Please try again in a moment.')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [city, cuisine])

  useEffect(() => {
    const controller = new AbortController()
    loadPlaces(controller.signal)
    return () => controller.abort()
  }, [loadPlaces, retryCount])

  const chooseCity = (nextCity) => {
    setCuisine('')
    setCity(nextCity)
    document.getElementById('shortlist')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return <div className="min-h-screen overflow-hidden bg-[#f6f3ec] text-[#1d2922]">
    <header className="relative z-30 mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <a href="#top" className="group flex items-center gap-3" aria-label="Local Table India home">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#204c3b] text-[#f5d693] transition group-hover:rotate-[-8deg]"><UtensilsCrossed size={18} strokeWidth={1.7}/></span>
        <span className="font-serif text-lg font-semibold tracking-tight">local table<span className="ml-1 text-[#a45a3c]">.</span><span className="ml-1 font-sans text-[10px] font-semibold uppercase tracking-[.18em] text-[#69756b]">India</span></span>
      </a>
      <nav className="hidden items-center gap-8 text-sm text-[#58645c] md:flex"><a href="#shortlist" className="transition hover:text-[#204c3b]">The shortlist</a><a href="#about" className="transition hover:text-[#204c3b]">Our approach</a><a href="https://wibest.in/data/" target="_blank" rel="noreferrer" className="transition hover:text-[#204c3b]">Data source <ArrowUpRight className="ml-1 inline" size={13}/></a></nav>
      <a href="#shortlist" className="flex items-center gap-2 rounded-full border border-[#d8d5cb] px-4 py-2.5 text-xs font-semibold text-[#314b3d] transition hover:border-[#204c3b] hover:bg-white">Explore places <ArrowDown size={14}/></a>
    </header>

    <main id="top" className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 lg:px-12">
      <section className="relative isolate grid min-h-[570px] min-w-0 grid-cols-1 overflow-hidden rounded-[2rem] bg-[#183e32] text-white md:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] lg:min-h-[610px]">
        <div className="relative z-10 flex min-w-0 flex-col justify-center px-7 py-12 sm:px-12 lg:px-[4.5rem]">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/[.06] px-3.5 py-2 text-[11px] font-medium uppercase tracking-[.16em] text-[#ecd39e]"><Sparkles size={13}/> A guide to India's local tables</div>
          <h1 className="max-w-[650px] font-serif text-[3.4rem] leading-[.99] tracking-[-.045em] sm:text-7xl lg:text-[5.6rem]">Good food.<br/><span className="italic text-[#f0d59a]">Found nearby.</span></h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/70 sm:text-base">A considered little guide to the places that make a city taste like itself.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full max-w-[370px] rounded-2xl bg-[#fffdf8] p-3.5 text-[#1d2922] shadow-xl shadow-black/10"><SearchBar cities={cities} city={city} onChange={chooseCity}/></div>
            <div aria-live="polite" className="pb-1 text-xs text-white/65">{cities.length ? <><span className="font-semibold text-[#f0d59a]">{cities.length}</span> cities in the guide</> : cityLoadState === 'loading' ? 'Finding cities...' : cityLoadState === 'error' ? 'API unavailable — check setup' : 'No city data loaded yet'}</div>
          </div>
          <a href="#shortlist" className="mt-8 flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[.15em] text-white/60 transition hover:text-white">Scroll to the table <ArrowDown size={14}/></a>
        </div>
        <div className="relative min-h-[300px] min-w-0 overflow-hidden rounded-b-[2rem] md:rounded-bl-none md:rounded-r-[2rem]">
          <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1400&q=85" alt="A colorful Indian thali served at a restaurant" className="absolute inset-0 h-full w-full object-cover object-center"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#102b22]/75 via-[#102b22]/10 to-transparent md:bg-gradient-to-l md:from-transparent md:via-[#183e32]/10 md:to-[#183e32]/30"/>
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4 sm:bottom-9 sm:left-9 sm:right-9"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/70">A little more local</p><p className="mt-1 font-serif text-2xl italic text-white sm:text-3xl">Every city has a signature.</p></div><span className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/10 text-white backdrop-blur-sm"><Compass size={19} strokeWidth={1.5}/></span></div>
        </div>
      </section>

      <section id="shortlist" className="scroll-mt-8 pt-16 sm:pt-20 lg:pt-24">
        <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#a45a3c]"><span className="h-px w-7 bg-[#a45a3c]"/> The city's good table</div><h2 className="font-serif text-4xl tracking-[-.035em] sm:text-5xl">{city ? <>{city}<span className="text-[#a45a3c]">, served.</span></> : 'A table worth finding.'}</h2><p className="mt-3 text-sm text-[#667168]">Ten places to get to know, picked for the way they make the city feel.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-[#e0ddd3] bg-[#fbfaf6] px-3.5 py-2 text-xs text-[#5c685f]"><Flame size={14} className="text-[#bd6848]"/> Sorted by local rating</div>
        </div>
        <div className="mb-7 flex flex-col gap-3 border-y border-[#dedbd1] py-4 sm:flex-row sm:items-center sm:justify-between"><FilterBar cuisines={cuisines} cuisine={cuisine} onChange={setCuisine}/><span className="shrink-0 text-[11px] text-[#899189]">{restaurants.length ? `${restaurants.length} ${restaurants.length === 1 ? 'place' : 'places'} on this list` : 'A short list, by design'}</span></div>
        {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-[330px] animate-pulse rounded-[1.35rem] bg-[#eae7dd]"/>)}</div> : error ? <div className="rounded-3xl border border-[#e2d5bd] bg-[#fffaf0] px-6 py-12 text-center"><p className="font-serif text-2xl">The kitchen's not connected yet.</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667168]">{error}</p><button onClick={() => setRetryCount(count => count + 1)} className="mt-5 rounded-full bg-[#204c3b] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#173a2e]">Try again</button></div> : restaurants.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{restaurants.slice(0, 10).map((restaurant, index) => <RestaurantCard key={restaurant.id} restaurant={restaurant} rank={index + 1}/>)}</div> : <div className="rounded-3xl border border-dashed border-[#cfccc1] bg-white/40 px-6 py-14 text-center"><p className="font-serif text-2xl">No tables on this list yet.</p><p className="mt-2 text-sm text-[#667168]">Try another city or clear the cuisine filter.</p></div>}
      </section>

      <section id="about" className="mt-20 grid gap-8 rounded-[1.75rem] bg-[#e9e6db] p-7 sm:p-10 lg:grid-cols-[.7fr_1.3fr] lg:items-center lg:p-12"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#a45a3c]"><span className="h-px w-7 bg-[#a45a3c]"/> The idea</div><h2 className="font-serif text-3xl tracking-tight sm:text-4xl">A good city<br/>is best <i>tasted.</i></h2></div><div className="grid gap-5 text-sm leading-7 text-[#5b665e] sm:grid-cols-2"><p>We bring together standout local restaurants and make them easy to explore by city and cuisine. No endless scrolling, just a few good places to start.</p><p>Ratings and listings are sourced from <a href="https://wibest.in/data/" target="_blank" rel="noreferrer" className="font-semibold text-[#294d3c] underline decoration-[#a7b3a8] underline-offset-4">WIB Open Data</a>. Restaurant details can change, so check the venue before heading out.</p></div></section>
    </main>

    <footer className="border-t border-[#dedbd1]"><div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-5 py-7 text-xs text-[#747d75] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><a href="#top" className="font-serif text-base font-semibold text-[#314b3d]">local table<span className="text-[#a45a3c]">.</span></a><span>Restaurant data: <a className="font-medium text-[#314b3d] underline underline-offset-2" href="https://wibest.in/data/" target="_blank" rel="noreferrer">WIB Open Data · CC-BY 4.0</a></span><span>Made for the joy of eating well.</span></div></footer>
  </div>
}
