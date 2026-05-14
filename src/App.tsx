import { FormEvent, useEffect, useRef, useState } from 'react';
import { Search, Loader2, Globe, HelpCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { SearchResponse, SearchResult, FaqResult } from './types';

export default function App() {
  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasSearched && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasSearched]);

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setHasSearched(true);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed to respond.');
      }
      const data: SearchResponse = await response.json();
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during search.');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
    setResults(null);
    setError(null);
  };

  return (
    <div className={`min-h-screen bg-neutral-50 text-neutral-900 transition-all duration-500 ease-in-out flex flex-col font-sans ${hasSearched ? 'justify-start' : 'justify-center items-center'}`}>
      {/* Header / Search Area */}
      <div className={`w-full max-w-4xl px-4 md:px-8 transition-all p-4 duration-500 ease-in-out ${hasSearched ? 'pt-8 pb-6 border-b border-neutral-200 bg-white sticky top-0 z-10 shadow-sm' : 'py-20'}`}>
        {!hasSearched && (
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-3 mb-2 text-primary">
               <Globe className="w-12 h-12 text-blue-600" />
               <h1 className="text-4xl font-bold tracking-tight text-neutral-800">Search</h1>
            </div>
            <p className="text-neutral-500 text-sm">Powered by Brave Scraper</p>
          </div>
        )}

        <form onSubmit={handleSearch} className={`relative mx-auto flex items-center transition-all duration-300 ${hasSearched ? 'w-full' : 'max-w-2xl w-full'}`}>
          {hasSearched && (
            <button 
              type="button" 
              onClick={clearSearch} 
              className="mr-3 p-2 text-blue-600 hover:bg-neutral-100 rounded-full transition-colors hidden sm:flex items-center justify-center shrink-0"
              title="Return home"
            >
              <Globe className="w-6 h-6" />
            </button>
          )}
          <div className="relative flex-1 group shadow-sm hover:shadow-md transition-shadow duration-200 rounded-full bg-white border border-neutral-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-neutral-400 group-focus-within:text-blue-500" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the web..."
              className="block w-full pl-11 pr-4 py-3 sm:py-3.5 border-transparent rounded-full focus:outline-none bg-transparent text-lg text-neutral-800 placeholder-neutral-400"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="ml-3 shrink-0 px-6 py-3 sm:py-3.5 bg-blue-600 text-white font-medium rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </form>
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl mx-auto px-4 md:px-8 py-8 flex-1">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-neutral-500">Searching...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 my-8">
            <p className="font-medium">Error fetching results</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!isLoading && results && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Primary Web Results */}
            <div className="lg:col-span-2 space-y-8">
              {results.web.length === 0 ? (
                <div className="py-12 text-center text-neutral-500">
                  <p className="text-lg">No results found for "{query}".</p>
                  <p className="mt-2 text-sm">Try different keywords.</p>
                </div>
              ) : (
                results.web.map((res: SearchResult, idx: number) => {
                  let hostname = '';
                  try {
                    hostname = new URL(res.url).hostname;
                  } catch (e) {
                    // Ignore invalid urls
                  }
                  
                  return (
                  <article key={`web-${idx}`} className="group relative break-words">
                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="block outline-none rounded-lg -m-2 p-2 focus:ring-2 focus:ring-blue-500 transition-colors hover:bg-neutral-100">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 overflow-hidden">
                          {hostname && (
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} 
                              alt="" 
                              className="w-4 h-4 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                        </div>
                        <cite className="text-sm text-neutral-600 truncate not-italic group-hover:text-neutral-800 transition-colors">
                          {res.displayUrl || hostname || res.url}
                        </cite>
                      </div>
                      <h3 className="text-xl md:text-2xl font-medium text-blue-700 group-hover:underline mb-1 tracking-tight leading-snug">
                        {res.title}
                      </h3>
                      <p className="text-neutral-700 text-sm leading-relaxed max-w-prose line-clamp-3">
                        {res.age && <span className="text-neutral-500 mr-2">{res.age} &bull;</span>}
                        {res.description}
                      </p>
                    </a>
                  </article>
                )})
              )}
            </div>

            {/* Sidebar FAQ / Knowledge */}
            {results.faq.length > 0 && (
              <div className="lg:col-span-1 border-t lg:border-t-0 lg:border-l border-neutral-200 pt-8 lg:pt-0 lg:pl-8 space-y-4">
                <div className="flex items-center gap-2 text-neutral-800 font-medium pb-2 border-b border-neutral-200">
                  <HelpCircle className="w-5 h-5 text-neutral-500" />
                  <h2>People also ask</h2>
                </div>
                <div className="space-y-3">
                  {results.faq.map((faq: FaqResult, idx: number) => (
                    <details 
                      key={`faq-${idx}`} 
                      className="group bg-white border border-neutral-200 rounded-lg overflow-hidden [&_summary::-webkit-details-marker]:hidden cursor-pointer"
                    >
                      <summary className="flex items-center justify-between px-4 py-3 font-medium text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
                        <span className="pr-4">{faq.question}</span>
                        <span className="transition group-open:rotate-90 shrink-0">
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        </span>
                      </summary>
                      <div className="px-4 pb-4 pt-1 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 bg-neutral-50/50">
                        {faq.answer}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
