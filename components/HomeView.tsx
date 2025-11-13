import React, { useState, useMemo, useEffect } from 'react';
import { db, USE_MOCK_DATA } from '../firebase/config';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import EyeIcon from './icons/EyeIcon';
import HeartIcon from './icons/HeartIcon';
import { communityFeed as mockFeedData } from '../data/mockData';
import SearchIcon from './icons/SearchIcon';
import { FeedItem as FeedItemType } from '../types';
import { User } from 'firebase/auth';

interface FeedItemProps {
  item: FeedItemType;
  onSelect: () => void;
  currentUser: User | null;
}

const FeedItem: React.FC<FeedItemProps> = ({ item, onSelect, currentUser }) => {
  const categoryStyle = item.category === '연주자 구함' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' : item.category === '연주 구함' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' : 'bg-gray-200 text-gray-800 dark:bg-jazz-blue-700 dark:text-jazz-gray-200';
  const hasLiked = currentUser && item.likedBy ? item.likedBy.includes(currentUser.uid) : false;

  return (
    <div onClick={onSelect} className="bg-white dark:bg-jazz-blue-800 p-4 rounded-lg border border-gray-200 dark:border-jazz-blue-700 hover:border-jazz-blue-600 dark:hover:border-jazz-gold-500 transition-all cursor-pointer shadow-sm hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${categoryStyle}`}>{item.category}</span>
        </div>
        {item.category !== '잡담' && item.instruments && (
            <div className="flex flex-wrap gap-1 justify-end">
                {item.instruments.map(inst => (
                    <span key={inst} className="text-xs bg-blue-100 text-jazz-blue-900 dark:bg-jazz-blue-700 dark:text-blue-300 font-semibold px-2 py-1 rounded-full">{inst}</span>
                ))}
            </div>
        )}
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2 truncate">{item.title}</h3>
      <p className="text-sm text-gray-600 dark:text-jazz-gray-300 mb-4 line-clamp-2">{item.content}</p>
      {item.images && item.images.length > 0 && (
         <div className="w-16 h-16 rounded-md overflow-hidden border border-gray-200 dark:border-jazz-blue-700 mb-4">
            <img src={item.images[0]} alt="Post image" className="w-full h-full object-cover" />
         </div>
      )}
      <div className="border-t border-gray-100 dark:border-jazz-blue-700 pt-3 flex items-center justify-between text-xs text-gray-500 dark:text-jazz-gray-400">
        <div className="flex items-center space-x-2">
            <img src={item.authorPhoto || `https://ui-avatars.com/api/?name=${item.authorName || '?'}&background=1A263A&color=FFC700`} alt={item.authorName} className="w-5 h-5 rounded-full" />
            <span className="font-semibold">{item.authorName || '익명'}</span>
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
                <EyeIcon className="w-4 h-4" />
                <span>{item.viewedBy?.length || 0}</span>
            </div>
            <div className="flex items-center space-x-1">
                <HeartIcon className={`w-4 h-4 ${hasLiked ? 'text-rose-500' : ''}`} filled={hasLiked} />
                <span>{item.likedBy?.length || 0}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

const INSTRUMENTS = ['전체', '피아노', '베이스', '드럼', '색소폰', '트럼펫', '기타', '보컬'];

interface HomeViewProps {
  currentUser: User | null;
  onSelectFeedItem: (id: string) => void;
  fetchFeedTrigger: number;
  showSearch: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ currentUser, onSelectFeedItem, fetchFeedTrigger, showSearch, searchQuery, setSearchQuery }) => {
  const [filter, setFilter] = useState('전체');
  const [instrumentFilter, setInstrumentFilter] = useState('전체');
  const [feed, setFeed] = useState<FeedItemType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    if (USE_MOCK_DATA || !db) {
      setFeed(mockFeedData);
      setLoading(false);
      return;
    }
    try {
      const feedCollection = collection(db, 'communityFeed');
      const q = query(feedCollection, orderBy('dateTime', 'desc'));
      const feedSnapshot = await getDocs(q);
      const feedList = feedSnapshot.docs.map(doc => {
        const data = doc.data();
        let dateTime = data.dateTime;
        if (dateTime instanceof Timestamp) {
            dateTime = dateTime.toDate().toISOString();
        }
        const viewedBy = Array.isArray(data.viewedBy) ? data.viewedBy : [];
        const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
        const authorName = data.authorName || '익명';
        const authorPhoto = data.authorPhoto || `https://ui-avatars.com/api/?name=${authorName}&background=1A263A&color=FFC700`;
        return { id: doc.id, ...data, dateTime, viewedBy, likedBy, authorName, authorPhoto } as FeedItemType;
      });
      setFeed(feedList);

    } catch (error) {
      console.error("Error fetching community feed: ", error);
      console.warn("Falling back to mock data due to Firestore error.");
      setFeed(mockFeedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeed();
  }, [fetchFeedTrigger]);

  const filteredFeed = useMemo(() => {
    let sortedFeed = [...feed];
    
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase();
        sortedFeed = sortedFeed.filter(item => 
            item.title.toLowerCase().includes(lowercasedQuery) ||
            item.content.toLowerCase().includes(lowercasedQuery)
        );
    }

    if (filter === '인기') {
        return sortedFeed.sort((a,b) => ((b.likedBy?.length || 0) + (b.viewedBy?.length || 0)) - ((a.likedBy?.length || 0) + (a.viewedBy?.length || 0)));
    }

    if (filter !== '전체') {
        sortedFeed = sortedFeed.filter(item => item.category === filter);
    }
    
    if (['연주자 구함', '연주 구함'].includes(filter) && instrumentFilter !== '전체') {
        sortedFeed = sortedFeed.filter(item => item.instruments?.includes(instrumentFilter));
    }
    
    return sortedFeed;
  }, [filter, instrumentFilter, feed, searchQuery]);

  const handleFilterChange = (f: string) => {
    setFilter(f);
    setInstrumentFilter('전체');
  };

  const filters = ['전체', '연주자 구함', '연주 구함', '인기', '잡담'];

  return (
    <div className="p-4 relative">
        {showSearch && (
            <div className="mb-4 relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="게시물 검색..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-jazz-blue-700 rounded-full bg-white dark:bg-jazz-blue-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-jazz-blue-900 dark:focus:ring-jazz-gold-500 focus:outline-none"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                </div>
            </div>
        )}
       <div className="flex space-x-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
        {filters.map(f => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === f ? 'bg-jazz-blue-900 text-white dark:bg-jazz-gold-500 dark:text-jazz-blue-900' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-jazz-blue-800 dark:text-gray-300 dark:border-jazz-blue-700 dark:hover:bg-jazz-blue-700'}`}
          >
            {f}
          </button>
        ))}
      </div>
      
      {['연주자 구함', '연주 구함'].includes(filter) && (
        <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 -mt-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
            {INSTRUMENTS.map(inst => (
                <button
                    key={inst}
                    onClick={() => setInstrumentFilter(inst)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${instrumentFilter === inst ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-jazz-blue-700 dark:text-blue-300 dark:hover:bg-jazz-blue-600'}`}
                >
                    {inst}
                </button>
            ))}
        </div>
       )}

      {loading ? (
        <div className="text-center py-10 text-gray-500 dark:text-jazz-gray-400">로딩 중...</div>
      ) : (
        <div className="space-y-4">
          {filteredFeed.map(item => (
            <FeedItem 
                key={item.id} 
                item={item} 
                onSelect={() => onSelectFeedItem(item.id)}
                currentUser={currentUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomeView;
