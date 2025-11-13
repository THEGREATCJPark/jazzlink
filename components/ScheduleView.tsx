import React, { useMemo, useState, useEffect } from 'react';
import { db, USE_MOCK_DATA } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Performance, Venue } from '../types';
import { performances as mockPerformances, venues as mockVenues } from '../data/mockData';

const CUTE_ANIMAL_EMOJIS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'];
const getRandomCuteAnimalEmoji = () => CUTE_ANIMAL_EMOJIS[Math.floor(Math.random() * CUTE_ANIMAL_EMOJIS.length)];

const VenueAvatar: React.FC<{ venue: Venue }> = ({ venue }) => {
    const photoUrl = useMemo(() => {
        if (Array.isArray(venue.photos) && venue.photos.length > 0 && venue.photos[0]) {
            return venue.photos[0];
        }
        return null;
    }, [venue.photos]);

    const randomEmoji = useMemo(() => getRandomCuteAnimalEmoji(), [venue.name]);

    if (photoUrl) {
        return <img src={photoUrl} alt={venue.name} className="w-16 h-16 rounded-full object-cover border-2 border-jazz-gold-500 p-0.5" />;
    }

    return (
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-gray-200 dark:bg-jazz-blue-700 border-2 border-gray-300 dark:border-jazz-blue-600 p-0.5">
            <span className="text-3xl" role="img">{randomEmoji}</span>
        </div>
    );
};

const ScheduleView: React.FC = () => {
    
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        if (USE_MOCK_DATA || !db) {
            setPerformances(mockPerformances);
            setVenues(mockVenues);
            setLoading(false);
            return;
        }
        try {
            const performancesSnapshot = await getDocs(collection(db, 'performances'));
            const venuesSnapshot = await getDocs(collection(db, 'venues'));
            
            const performanceList = performancesSnapshot.docs.map(doc => {
                const data = doc.data();
                if (data.dateTime?.toDate) {
                    data.dateTime = data.dateTime.toDate().toISOString();
                }
                return { id: doc.id, ...data } as Performance;
            });

            setPerformances(performanceList);
            setVenues(venuesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue)));

        } catch (error) {
            console.error("Error fetching schedule data: ", error);
            console.warn("Falling back to mock data due to Firestore error.");
            setPerformances(mockPerformances);
            setVenues(mockVenues);
        }
        setLoading(false);
    };
    fetchData();
  }, []);

  const today = new Date();
  const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
  const weekEnd = new Date(new Date(weekStart).setDate(weekStart.getDate() + 6));

  const weeklyPerformances = useMemo(() => {
    let filtered = performances.filter(p => {
        const pDate = new Date(p.dateTime);
        return pDate >= weekStart && pDate <= weekEnd;
    });

    if (selectedVenueId) {
        filtered = filtered.filter(p => p.venueId === selectedVenueId);
    }

    return filtered.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [performances, selectedVenueId]);
  
  const getVenueName = (venueId: string) => venues.find(v => v.id === venueId)?.name || '알 수 없는 장소';
  
  const formatScheduleTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('ko-KR', options).format(date);
  }
  
  const selectedVenue = useMemo(() => {
    if (!selectedVenueId) return null;
    return venues.find(v => v.id === selectedVenueId);
  }, [selectedVenueId, venues]);

  const mapUrl = useMemo(() => {
    if (selectedVenue && selectedVenue.coordinates) {
        return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3162.72101961445!2d${selectedVenue.coordinates.lng}!3d${selectedVenue.coordinates.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzfCsDMzJzE4LjAiTiAxMjbCsDU5JzQxLjAiRQ!5e0!3m2!1sko!2skr!4v1622012111111!5m2!1sko!2skr&q=${selectedVenue.coordinates.lat},${selectedVenue.coordinates.lng}`;
    }
    return "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1581.6579893541248!2d126.95831628885498!3d37.545129600000005!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357c989111c11aff%3A0x256a6552a466a2b3!2z7JWI65SV7J6s7J6Q!5e0!3m2!1sko!2skr!4v1722234567890!5m2!1sko!2skr";
  }, [selectedVenue]);


  const currentMonth = new Intl.DateTimeFormat('ko-KR', { month: 'long'}).format(new Date());

  return (
    <div className="p-4">
      <div className="h-48 bg-gray-200 rounded-lg mb-4 overflow-hidden border border-gray-200 dark:border-jazz-blue-700">
         <iframe
            key={mapUrl}
            src={mapUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Jazz Venues Map"
        ></iframe>
      </div>

       <div className="mb-4">
            <div className="flex space-x-4 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
                <button onClick={() => setSelectedVenueId(null)} className="flex flex-col items-center flex-shrink-0 space-y-1">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${!selectedVenueId ? 'border-jazz-blue-900 dark:border-jazz-gold-500' : 'border-gray-300 dark:border-jazz-blue-600'} bg-gray-100 dark:bg-jazz-blue-800`}>
                        <span className="text-sm font-bold">전체</span>
                    </div>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">전체보기</span>
                </button>
                {venues.map(venue => (
                    <button key={venue.id} onClick={() => setSelectedVenueId(venue.id)} className="flex flex-col items-center flex-shrink-0 space-y-1">
                        <div className={`${selectedVenueId === venue.id ? '' : 'grayscale'}`}>
                            <VenueAvatar venue={venue} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate w-16">{venue.name}</span>
                    </button>
                ))}
            </div>
       </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-bold text-jazz-blue-900 dark:text-white">{selectedVenue ? selectedVenue.name : `${currentMonth} 공연 일정`}</h2>
        <p className="text-sm text-gray-500 dark:text-jazz-gray-400">이번 주 공연 정보를 확인하세요.</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-jazz-gray-400">일정 로딩 중...</div>
      ) : (
        <div className="space-y-3">
          {weeklyPerformances.length > 0 ? weeklyPerformances.map(p => (
            <div key={p.id} className="bg-white dark:bg-jazz-blue-800 p-3 rounded-lg flex items-center space-x-4 border border-gray-200 dark:border-jazz-blue-700 shadow-sm">
              <div className="text-center w-16 flex-shrink-0">
                  <p className="font-bold text-lg text-jazz-blue-900 dark:text-gray-100">{new Date(p.dateTime).getDate()}</p>
                  <p className="text-xs text-gray-500 dark:text-jazz-gray-400">{new Intl.DateTimeFormat('ko-KR', { weekday: 'short'}).format(new Date(p.dateTime))}</p>
              </div>
              <div className="flex-grow">
                  <p className="font-bold text-gray-800 dark:text-gray-200">{p.title}</p>
                  {!selectedVenueId && <p className="text-sm text-gray-500 dark:text-jazz-gray-400">{getVenueName(p.venueId)}</p>}
              </div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatScheduleTime(p.dateTime)}
              </div>
            </div>
          )) : (
              <div className="text-center py-8 bg-white dark:bg-jazz-blue-800 rounded-lg border border-gray-200 dark:border-jazz-blue-700">
                  <p className="text-gray-500 dark:text-jazz-gray-400">이번 주에 예정된 공연이 없습니다.</p>
              </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleView;