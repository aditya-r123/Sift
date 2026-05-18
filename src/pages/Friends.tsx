import { ChevronRight } from 'lucide-react';

interface Friend {
    id: string;
    name: string;
    genres: string;
    color: string;
    initials: string;
}

const friends: Friend[] = [
    { id: '1', name: 'Daniel', genres: 'pop · synpop', color: '#14b8a6', initials: 'D' },
    { id: '2', name: 'King', genres: 'new wave', color: '#8b5cf6', initials: 'K' },
    { id: '3', name: 'Alex', genres: 'indie · rnb-soul · hip-hop', color: '#14b8a6', initials: 'A' },
    { id: '4', name: 'Maya', genres: 'indie pop · hip-hop', color: '#f97316', initials: 'M' },
];

export function ProfilePage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-2">Profile & Friends</h1>

                <div className="mb-8">
                    <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">Your Friends</h2>
                    <div className="space-y-3">
                        {friends.map((friend) => (
                            <div
                                key={friend.id}
                                className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222] transition-colors cursor-pointer"
                            >
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: friend.color }}
                                >
                                    <span className="text-white font-semibold">{friend.initials}</span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-medium mb-1">{friend.name}</h3>
                                    <p className="text-gray-400 text-sm">{friend.genres}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-500" />
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-4">
                        Sifted Curated Playlist
                    </h2>
                    <div className="bg-[#1a1a1a] rounded-2xl p-4 flex items-center gap-4 hover:bg-[#222] transition-colors cursor-pointer">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center flex-shrink-0">
                            <div className="w-8 h-8 bg-white/10 rounded" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-medium mb-2">Discovered on SIFT</h3>
                            <span className="inline-block px-3 py-1 bg-[#2a2a2a] text-teal-400 text-xs rounded-full">
                                GENRES
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
