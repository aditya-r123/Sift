import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, UserMinus, Check, X, Clock } from 'lucide-react';
import { supabase } from '../supabase.js';

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type FriendRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  profile: Profile;
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

function Avatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' }) {
  const label = labelFor(profile);
  const sizeClass = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-12 h-12';
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: colorFor(profile.id) }}
    >
      <span className="text-white font-semibold">
        {initialsFor(profile.display_name, label)}
      </span>
    </div>
  );
}

export function ProfilePage() {
  const [meId, setMeId] = useState<string | null>(null);
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [friendsFilter, setFriendsFilter] = useState('');
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const incoming = useMemo(
    () => rows.filter((r) => r.addressee_id === meId && r.status === 'pending'),
    [rows, meId]
  );
  const sent = useMemo(
    () => rows.filter((r) => r.requester_id === meId && r.status === 'pending'),
    [rows, meId]
  );
  const accepted = useMemo(
    () => rows.filter((r) => r.status === 'accepted'),
    [rows]
  );

  const sentToIds = useMemo(() => new Set(sent.map((r) => r.addressee_id)), [sent]);
  const friendIds = useMemo(() => new Set(accepted.map((r) => r.profile.id)), [accepted]);

  const loadRows = useCallback(async (userId: string) => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const { data, error } = await supabase
        .from('friends')
        .select('id, requester_id, addressee_id, status, profiles!requester_id(id, display_name, avatar_url), profiles!addressee_id(id, display_name, avatar_url)')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const shaped: FriendRow[] = (data ?? []).map((row: Record<string, unknown>) => {
        const isRequester = (row.requester_id as string) === userId;
        const otherProfile = isRequester
          ? (row['profiles!addressee_id'] as Profile)
          : (row['profiles!requester_id'] as Profile);
        return {
          id: row.id as string,
          requester_id: row.requester_id as string,
          addressee_id: row.addressee_id as string,
          status: row.status as 'pending' | 'accepted',
          profile: otherProfile,
        };
      });
      setRows(shaped);
    } catch (e) {
      setRowsError(e instanceof Error ? e.message : String(e));
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const id = data.session?.user.id ?? null;
      setMeId(id);
      if (id) void loadRows(id);
      else setRowsLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setMeId(id);
      if (id) void loadRows(id);
      else {
        setRows([]);
        setRowsLoading(false);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadRows]);

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

  const sendRequest = useCallback(
    async (target: Profile) => {
      if (!meId || pending[target.id]) return;
      setPending((p) => ({ ...p, [target.id]: true }));
      try {
        const { data, error } = await supabase
          .from('friends')
          .insert({ requester_id: meId, addressee_id: target.id })
          .select('id, requester_id, addressee_id, status')
          .single();
        if (error && !/duplicate key/i.test(error.message)) throw error;
        if (data) {
          const newRow: FriendRow = {
            id: (data as Record<string, unknown>).id as string,
            requester_id: meId,
            addressee_id: target.id,
            status: 'pending',
            profile: target,
          };
          setRows((prev) => [newRow, ...prev]);
        }
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[target.id];
          return next;
        });
      }
    },
    [meId, pending]
  );

  const acceptRequest = useCallback(
    async (row: FriendRow) => {
      if (pending[row.id]) return;
      setPending((p) => ({ ...p, [row.id]: true }));
      try {
        const { error } = await supabase
          .from('friends')
          .update({ status: 'accepted' })
          .eq('id', row.id);
        if (error) throw error;
        setRows((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, status: 'accepted' } : r))
        );
      } catch (e) {
        setRowsError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[row.id];
          return next;
        });
      }
    },
    [pending]
  );

  const deleteRow = useCallback(
    async (row: FriendRow) => {
      if (pending[row.id]) return;
      setPending((p) => ({ ...p, [row.id]: true }));
      try {
        const { error } = await supabase
          .from('friends')
          .delete()
          .eq('id', row.id);
        if (error) throw error;
        setRows((prev) => prev.filter((r) => r.id !== row.id));
      } catch (e) {
        setRowsError(e instanceof Error ? e.message : String(e));
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[row.id];
          return next;
        });
      }
    },
    [pending]
  );

  const filteredFriends = useMemo(() => {
    const q = friendsFilter.trim().toLowerCase();
    if (!q) return accepted;
    return accepted.filter((r) => labelFor(r.profile).toLowerCase().includes(q));
  }, [accepted, friendsFilter]);

  if (!meId) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Friends</h1>
          <p className="text-gray-400">Sign in to find and connect with other Sift users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Friends</h1>
        <p className="text-gray-400 mb-6">
          Search for people on Sift, send a friend request, and accept theirs.
        </p>

        {rowsError && <p className="text-sm text-red-400 mb-4">{rowsError}</p>}

        {/* find people */}
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
          {searchError && <p className="text-sm text-red-400 mb-3">{searchError}</p>}
          {searchQuery.trim().length === 0 ? (
            <p className="text-gray-500 text-sm">Start typing to search every Sift user.</p>
          ) : searching ? (
            <p className="text-gray-500 text-sm">Searching…</p>
          ) : searchResults.length === 0 ? (
            <p className="text-gray-500 text-sm">No users match "{searchQuery.trim()}".</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((p) => {
                const isFriend = friendIds.has(p.id);
                const hasPending = sentToIds.has(p.id);
                const busy = !!pending[p.id];
                const label = labelFor(p);
                return (
                  <li key={p.id} className="bg-[#1a1a1a] rounded-2xl p-3 flex items-center gap-4">
                    <Avatar profile={p} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{label}</h3>
                    </div>
                    {isFriend ? (
                      <span className="inline-flex items-center gap-1 text-teal-400 text-xs px-3 py-1.5 bg-[#2a2a2a] rounded-full">
                        <Check className="w-3.5 h-3.5" /> Friends
                      </span>
                    ) : hasPending ? (
                      <span className="inline-flex items-center gap-1 text-gray-400 text-xs px-3 py-1.5 bg-[#2a2a2a] rounded-full">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void sendRequest(p)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-white text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] rounded-full disabled:opacity-50 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {busy ? 'Sending…' : 'Add'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* incoming requests */}
        {incoming.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Requests ({incoming.length})
            </h2>
            <ul className="space-y-2">
              {incoming.map((row) => {
                const busy = !!pending[row.id];
                const label = labelFor(row.profile);
                return (
                  <li key={row.id} className="bg-[#1a1a1a] rounded-2xl p-3 flex items-center gap-4">
                    <Avatar profile={row.profile} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{label}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">Wants to be friends</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void acceptRequest(row)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-teal-400 text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#333] rounded-full disabled:opacity-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {busy ? '…' : 'Accept'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteRow(row)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a2a2a] rounded-full disabled:opacity-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* sent requests */}
        {sent.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Sent ({sent.length})
            </h2>
            <ul className="space-y-2">
              {sent.map((row) => {
                const busy = !!pending[row.id];
                const label = labelFor(row.profile);
                return (
                  <li key={row.id} className="bg-[#1a1a1a] rounded-2xl p-3 flex items-center gap-4">
                    <Avatar profile={row.profile} size="sm" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{label}</h3>
                      <p className="text-gray-500 text-xs mt-0.5">Request pending</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteRow(row)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a2a2a] rounded-full disabled:opacity-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      {busy ? 'Cancelling…' : 'Cancel'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* friends list */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs text-gray-500 uppercase tracking-wider">
              Your friends {accepted.length > 0 ? `(${accepted.length})` : ''}
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

          {rowsLoading ? (
            <p className="text-gray-500 text-sm">Loading…</p>
          ) : accepted.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No friends yet. Search above to send the first request.
            </p>
          ) : filteredFriends.length === 0 ? (
            <p className="text-gray-500 text-sm">
              None of your friends match "{friendsFilter.trim()}".
            </p>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '60vh' }}>
              {filteredFriends.map((row) => {
                const busy = !!pending[row.id];
                const label = labelFor(row.profile);
                return (
                  <div
                    key={row.id}
                    className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222] transition-colors"
                  >
                    <Avatar profile={row.profile} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{label}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteRow(row)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-gray-300 hover:text-white text-xs px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a2a2a] rounded-full disabled:opacity-50 transition-colors"
                      aria-label={`Unfriend ${label}`}
                    >
                      {busy ? (
                        <>
                          <X className="w-3.5 h-3.5" /> Removing…
                        </>
                      ) : (
                        <>
                          <UserMinus className="w-3.5 h-3.5" /> Unfriend
                        </>
                      )}
                    </button>
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
