'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import CharacterSidebar from '@/components/CharacterSidebar';
import StartCard from '@/components/StartCard';
import CharacterCard from '@/components/CharacterCard';

interface Character { id:string; slug:string; name:string; avatar_url?:string }

export default function CharactersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTier] = useState('free');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(12);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsAuthenticated(true);
    load(1, search, tag);
  }, []);

  const load = async (p = page, s = search, t = tag) => {
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
    if (s) params.set('search', s);
    if (t) params.set('tag', t);
    const res = await fetch(`/api/characters?${params.toString()}`);
    const data = await res.json();
    setCharacters(data.items || []);
    setTotal(data.total || 0);
    setPage(data.page || p);
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} userTier={userTier} />

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-6">
          <CharacterSidebar />

          <div className="flex-1 space-y-8">
            <section className="bg-gray-900/70 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">Create Your Character</h1>
                  <p className="text-gray-400">Start building characters to use in your future image creation!</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StartCard title="Start with 4+ Images" onClick={() => window.location.href = '/admin/character?admin=true'} />
                <StartCard title="Start with One Image" onClick={() => window.location.href = '/admin/character?admin=true'} />
                <StartCard title="Start with Description" onClick={() => window.location.href = '/admin/character?admin=true'} />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Character Library</h2>
              <div className="flex gap-2 mb-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search characters"
                  className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 w-64"
                />
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="Filter by tag"
                  className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 w-48"
                />
                <button onClick={() => load(1, search, tag)} className="px-3 py-2 rounded bg-blue-600 text-white">Apply</button>
                {(search || tag) && (
                  <button onClick={() => { setSearch(''); setTag(''); load(1, '', ''); }} className="px-3 py-2 rounded bg-gray-700 text-gray-200">Clear</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {characters.map((c) => (
                  <CharacterCard key={c.id} slug={c.slug} name={c.name} avatar_url={c.avatar_url} />
                ))}
              </div>
              <div className="flex items-center justify-between mt-6 text-gray-300">
                <div>
                  Page {page} of {Math.max(1, Math.ceil(total / pageSize))}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => load(page - 1)}
                    className="px-3 py-1.5 rounded bg-gray-800 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page >= Math.ceil(total / pageSize)}
                    onClick={() => load(page + 1)}
                    className="px-3 py-1.5 rounded bg-gray-800 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}


