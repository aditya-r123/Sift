import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Search, UserPlus, UserMinus, Check, X } from 'lucide-react';
import { supabase } from '../supabase.js';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

const AVATAR_PALETTE = ['#14b8a6', '#8b5cf6', '#f97316', '#ef4444', '#22c55e', '#3b82f6', '#eab308'];

function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]!;
}

function initialsFor(name: string | null | undefined, fallback: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return fallback.slice(0, 2).toUpperCase() || '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
}

function labelFor(profile: Profile): string {
  return (profile.display_name || '').trim() || 'Unnamed user';
}

export function ProfilePage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);
  const [friendsFilter, setFriendsFilter] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [pending, setPending] = useState<Record<string, boolean>>({});

  const friendIds = useMemo(() => new Set(friends.map((f) => f.id)), [friends]);

  const loadFriends = useCallback(async (userId: string) => {
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const { data: rows, error: rowsError } = await supabase
        .from('friends')
        .select('friend_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (rowsError) throw rowsError;
      const ids = (rows ?? []).map((r) => r.friend_id as string);
      if (ids.length === 0) {
        setFriends([]);
        return;
      }
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids);
      if (profilesError) throw profilesError;
      const byId = new Map<string, Profile>();
      for (const p of profiles ?? []) byId.set(p.id as string, p as Profile);
      const ordered = ids
        .map((id) => byId.get(id))
        .filter((p): p is Profile => Boolean(p));
      setFriends(ordered);
    } catch (e) {
      setFriendsError(e instanceof Error ? e.message : String(e));
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const id = data.session?.user.id ?? null;
      setMeId(id);
      if (id) void loadFriends(id);
      else setFriendsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setMeId(id);
      if (id) void loadFriends(id);
      else {
        setFriends([]);
        setFriendsLoading(false);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadFriends]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!meId || query.length === 0) {
      setSearchResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const handle = setTimeout(async () => {
      try {
        const escaped = query.replace(/([%_\\])/g, '\\$1');
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .ilike('display_name', `%${escaped}%`)
          .neq('id', meId)
          .order('display_name', { ascending: true })
          .limit(20);
        if (error) throw error;
        setSearchResults((data ?? []) as Profile[]);
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : String(e));
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [searchQuery, meId]);

  const addFriend = useCallback(
    async (friend: Profile) => {
      if (!meId || pending[friend.id]) return;
      setPending((p) => ({ ...p, [friend.id]: true }));
      try {
        const { error } = await supabase
          .from('friends')
          .insert({ user_id: meId, friend_id: friend.id });
        if (error && !/duplicate key/i.test(error.message)) throw error;
        setFriends((prev) =>
          prev.some((p) => p.id === friend.id) ? prev : [friend, ...prev]
        );
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[friend.id];
          return next;
        });
      }
    },
    [meId, pending]
  );

  const removeFriend = useCallback(
    async (friend: Profile) => {
      if (!meId || pending[friend.id]) return;
      setPending((p) => ({ ...p, [friend.id]: true }));
      try {
        const { error } = await supabase
          .from('friends')
          .delete()
          .eq('user_id', meId)
          .eq('friend_id', friend.id);
        if (error) throw error;
        setFriends((prev) => prev.filter((p) => p.id !== friend.id));
      } catch (e) {
        setFriendsError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[friend.id];
          return next;
        });
      }
    },
    [meId, pending]
  );

  const filteredFriends = useMemo(() => {
    const q = friendsFilter.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => labelFor(f).toLowerCase().includes(q));
  }, [friends, friendsFilter]);

  if (!meId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Friends</h1>
          <p className="text-gray-400">Sign in to find and follow other Sift users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Friends</h1>
        <p className="text-gray-400 mb-6">
          Find people on Sift by name, add them to your friends list, and remove them anytime.
        </p>

        <section className="mb-8">
          <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Find people</h2>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full bg-[#1a1a1a] text-white placeholder-gray-500 rounded-2xl pl-11 pr-4 py-3 outline-none border border-transparent focus:border-[#2a2a2a]"
            />
          </div>
          {searchError && (
            <p className="text-sm text-red-400 mb-3">{searchError}</p>
          )}
          {searchQuery.trim().length === 0 ? (
            <p className="text-gray-500 text-sm">Start typing to search every Sift user.</p>
          ) : searching ? (
            <p className="text-gray-500 text-sm">Searching…</p>
          ) : searchResults.length === 0 ? (
            <p className="text-gray-500 text-sm">No users match “{searchQuery.trim()}”.</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((p) => {
                const already = friendIds.has(p.id);
                const busy = !!pending[p.id];
                const label = labelFor(p);
                return (
                  <li
                    key={p.id}
                    className="bg-[#1a1a1a] rounded-2xl p-3 flex items-center gap-4"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: colorFor(p.id) }}
                    >
                      <span className="text-white text-sm font-semibold">
                        {initialsFor(p.display_name, label)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{label}</h3>
                    </div>
                    {already ? (
                      <span className="inline-flex items-center gap-1 text-teal-400 text-xs px-3 py-1.5 bg-[#2a2a2a] rounded-full">
                        <Check className="w-3.5 h-3.5" /> Friends
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void addFriend(p)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-white text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] rounded-full disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {busy ? 'Adding…' : 'Add'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">
              Your friends {friends.length > 0 ? `(${friends.length})` : ''}
            </h2>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={friendsFilter}
              onChange={(e) => setFriendsFilter(e.target.value)}
              placeholder="Filter your friends…"
              className="w-full bg-[#1a1a1a] text-white placeholder-gray-500 rounded-2xl pl-11 pr-4 py-3 outline-none border border-transparent focus:border-[#2a2a2a]"
            />
          </div>

          {friendsError && (
            <p className="text-sm text-red-400 mb-3">{friendsError}</p>
          )}

          {friendsLoading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : friends.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No friends yet. Search above to add the first one.
            </p>
          ) : filteredFriends.length === 0 ? (
            <p className="text-gray-500 text-sm">
              None of your friends match “{friendsFilter.trim()}”.
            </p>
          ) : (
            <div
              className="space-y-3 overflow-y-auto pr-1"
              style={{ maxHeight: '60vh' }}
            >
              {filteredFriends.map((friend) => {
                const busy = !!pending[friend.id];
                const label = labelFor(friend);
                return (
                  <div
                    key={friend.id}
                    className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222] transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: colorFor(friend.id) }}
                    >
                      <span className="text-white font-semibold">
                        {initialsFor(friend.display_name, label)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{label}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeFriend(friend)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-gray-300 hover:text-white text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a2a2a] rounded-full disabled:opacity-50"
                      aria-label={`Remove ${label}`}
                    >
                      {busy ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Removing…
                        </>
                      ) : (
                        <>
                          <UserMinus className="w-3.5 h-3.5" /> Remove
                        </>
                      )}
                    </button>
                    <ChevronRight className="w-5 h-5 text-gray-600 hidden sm:block" />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
