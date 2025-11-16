


import React, { useState, useEffect, useMemo } from 'react';
import { db, USE_MOCK_DATA } from '../firebase/config';
import { collection, getDocs, doc, getDoc, query, orderBy, runTransaction, Timestamp } from 'firebase/firestore';
import { Musician, Team, Venue, User, Review, TeamMember } from '../types';
import InstagramIcon from './icons/InstagramIcon';
import YoutubeIcon from './icons/YoutubeIcon';
import MapPinIcon from './icons/GoogleMapsIcon';
import PencilIcon from './icons/PencilIcon';
import StarIcon from './icons/StarIcon';
import { musicians as mockMusicians, teams as mockTeams, venues as mockVenues } from '../data/mockData';
import { User as FirebaseUser } from 'firebase/auth';
import PlusIcon from './icons/PlusIcon';
import LeaderIcon from './icons/LeaderIcon';

type NavigateToEditorFn = (profile: { type: 'musician' | 'venue' | 'team' | 'general', id: string }) => void;
type ProfileTab = '재즈바' | '연주자' | '연주팀';

interface ProfileViewProps {
    currentUser: FirebaseUser | null;
    navigateToEditor: NavigateToEditorFn;
    onTabChange: (tab: ProfileTab) => void;
    targetUid?: string | null;
    isOverlay?: boolean;
    onCloseOverlay?: () => void;
}

const CUTE_ANIMAL_EMOJIS = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁'];
const getRandomCuteAnimalEmoji = () => CUTE_ANIMAL_EMOJIS[Math.floor(Math.random() * CUTE_ANIMAL_EMOJIS.length)];

interface AvatarProps {
    photos?: string[] | null;
    name: string;
    className: string;
    textClassName?: string;
}

const ProfileAvatar: React.FC<AvatarProps> = ({ photos, name, className, textClassName = 'text-2xl' }) => {
    const photoUrl = useMemo(() => {
        if (Array.isArray(photos) && photos.length > 0 && photos[0]) {
            return photos[0];
        }
        return null;
    }, [photos]);

    const randomEmoji = useMemo(() => getRandomCuteAnimalEmoji(), [name]); // Depend on name to get consistent emoji for the same person

    if (photoUrl) {
        return <img src={photoUrl} alt={name} className={className} />;
    }

    const divClassName = `${className} flex items-center justify-center bg-gray-200 dark:bg-jazz-blue-700`;
    const finalDivClassName = divClassName.replace(/object-cover|object-center/g, '');


    return (
        <div className={finalDivClassName}>
            <span className={textClassName} role="img">{randomEmoji}</span>
        </div>
    );
};


const ImageSlider: React.FC<{ images: string[] | null | undefined }> = ({ images }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.clientWidth;
        const newIndex = Math.round(scrollLeft / width);
        setCurrentIndex(newIndex);
    };
    
    const randomEmoji = useMemo(() => getRandomCuteAnimalEmoji(), []);
    const validImages = useMemo(() => (Array.isArray(images) ? images.filter(img => typeof img === 'string' && img.trim() !== '') : []), [images]);

    if (validImages.length === 0) {
        return (
            <div className="w-full h-48 bg-gray-200 dark:bg-jazz-blue-700 rounded-t-lg flex items-center justify-center border-b border-gray-200 dark:border-jazz-blue-600">
                <span className="text-6xl" role="img" aria-label="cute animal emoji">{randomEmoji}</span>
            </div>
        );
    }


    return (
        <div className="relative">
            <div className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-t-lg" onScroll={handleScroll} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`.snap-x::-webkit-scrollbar { display: none; }`}</style>
                {validImages.map((img, index) => (
                    <img key={index} src={img} alt={`Slide ${index + 1}`} className="w-full h-48 object-cover snap-center flex-shrink-0" />
                ))}
            </div>
            {validImages.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
                    {validImages.map((_, index) => (
                        <div key={index} className={`w-2 h-2 rounded-full transition-colors ${currentIndex === index ? 'bg-white' : 'bg-white/50'}`}></div>
                    ))}
                </div>
            )}
        </div>
    );
};


const VenueDetailModal: React.FC<{ venue: Venue; onClose: () => void; currentUser: FirebaseUser | null; navigateToEditor: NavigateToEditorFn; }> = ({ venue, onClose, currentUser, navigateToEditor }) => {
    const isOwner = currentUser && currentUser.uid === venue.ownerUid;
    const [reviews, setReviews] = useState<Review[]>([]);
    const [usersData, setUsersData] = useState<Map<string, User>>(new Map());
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [newReviewContent, setNewReviewContent] = useState('');
    const [newReviewRating, setNewReviewRating] = useState(0);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [averageRating, setAverageRating] = useState((venue.ratingCount && venue.totalRating) ? (venue.totalRating / venue.ratingCount) : 0);
    const [ratingCount, setRatingCount] = useState(venue.ratingCount || 0);

    useEffect(() => {
        if (!db) return;
        const fetchReviews = async () => {
            setReviewsLoading(true);
            try {
                const reviewsRef = collection(db, 'venues', venue.id, 'reviews');
                const q = query(reviewsRef, orderBy('dateTime', 'desc'));
                const querySnapshot = await getDocs(q);
                const reviewsList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    if (data.dateTime?.toDate) data.dateTime = data.dateTime.toDate().toISOString();
                    return { id: doc.id, ...data } as Review;
                });
                setReviews(reviewsList);
                
                const authorUids = [...new Set(reviewsList.filter(r => !r.isAnonymous).map(r => r.authorUid))];
                if (authorUids.length > 0) {
                    const usersToFetch = authorUids.filter(uid => !usersData.has(uid));
                    if (usersToFetch.length > 0) {
                        const userPromises = usersToFetch.map(uid => getDoc(doc(db, 'users', uid)));
                        const userDocs = await Promise.all(userPromises);
                        const newUsers = new Map(usersData);
                        // FIX: Safely assign properties from Firestore data to the User type by checking their types.
                        userDocs.forEach(userDoc => {
                            if (userDoc.exists()) {
                                const data = userDoc.data();
                                const accountTypeVal = data.accountType;
                                newUsers.set(userDoc.id, {
                                    uid: userDoc.id,
                                    name: typeof data.name === 'string' ? data.name : null,
                                    photo: typeof data.photo === 'string' ? data.photo : null,
                                    email: typeof data.email === 'string' ? data.email : null,
                                    accountType: (accountTypeVal === 'musician' || accountTypeVal === 'venue_owner' || accountTypeVal === 'general') ? accountTypeVal : undefined
                                });
                            }
                        });
                        setUsersData(newUsers);
                    }
                }
            } catch (e) { console.error("Error fetching reviews:", e); }
            setReviewsLoading(false);
        };
        fetchReviews();
    }, [venue.id, usersData]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentUser || !newReviewContent.trim() || newReviewRating === 0) return;
        setIsSubmittingReview(true);
        
        try {
            await runTransaction(db, async (transaction) => {
                const venueRef = doc(db, 'venues', venue.id);
                const venueDoc = await transaction.get(venueRef);
                if (!venueDoc.exists()) throw "Venue not found!";

                const currentData = venueDoc.data();
                const newRatingCount = (currentData.ratingCount || 0) + 1;
                const newTotalRating = (currentData.totalRating || 0) + newReviewRating;

                transaction.update(venueRef, { ratingCount: newRatingCount, totalRating: newTotalRating });
                
                const newReviewRef = doc(collection(db, 'venues', venue.id, 'reviews'));
                transaction.set(newReviewRef, {
                    authorUid: currentUser.uid,
                    content: newReviewContent,
                    rating: newReviewRating,
                    dateTime: Timestamp.now(),
                    isAnonymous: isAnonymous,
                });
                 setAverageRating(newTotalRating / newRatingCount);
                 setRatingCount(newRatingCount);
            });
            
            const newReview: Review = { id: 'temp' + Date.now(), authorUid: currentUser.uid, content: newReviewContent, rating: newReviewRating, dateTime: new Date().toISOString(), isAnonymous: isAnonymous };
            setReviews(prev => [newReview, ...prev]);
            setNewReviewContent('');
            setNewReviewRating(0);
            setIsAnonymous(false);
            alert("후기가 등록되었습니다.");
        } catch (e) {
            console.error("Failed to submit review:", e);
            alert("후기 등록에 실패했습니다.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-jazz-blue-800 rounded-lg max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-200">
        <div className="relative">
          <ImageSlider images={venue.photos} />
          <button onClick={onClose} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
           {isOwner && (
                <button onClick={() => { onClose(); navigateToEditor({ type: 'venue', id: venue.id }); }} className="absolute top-2 left-2 bg-white/80 text-gray-800 py-1 px-3 rounded-full text-sm font-semibold flex items-center space-x-1 hover:bg-gray-200 transition-colors">
                    <PencilIcon className="w-4 h-4" />
                    <span>수정</span>
                </button>
            )}
        </div>
        <div className="p-4">
          <h2 className="text-2xl font-bold text-jazz-blue-900 dark:text-white mb-2">{venue.name}</h2>
          <p className="text-sm text-gray-500 dark:text-jazz-gray-400 mb-4">{venue.address}</p>
          <div className="flex items-center space-x-4 mb-4">
             <a href={venue.naverMapsUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-jazz-gray-400 hover:text-jazz-blue-900 dark:hover:text-white transition-colors"><MapPinIcon className="w-6 h-6" /></a>
             <a href={venue.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-jazz-gray-400 hover:text-jazz-blue-900 dark:hover:text-white transition-colors"><InstagramIcon className="w-7 h-7" /></a>
          </div>
          {venue.operatingHours && <p className="text-sm text-gray-600 dark:text-jazz-gray-300 mb-2"><strong>영업 시간:</strong> {venue.operatingHours}</p>}
          <p className="text-gray-700 dark:text-jazz-gray-300 mb-4">{venue.description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {(venue.tagsVenue || []).map(tag => <span key={tag} className="bg-blue-100 text-jazz-blue-900 dark:bg-jazz-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1 rounded-full">{tag}</span>)}
          </div>
          <div className="border-t border-gray-200 dark:border-jazz-blue-700 pt-3 mt-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">후기 ({ratingCount})</h3>
            {averageRating > 0 && (
                <div className="flex items-center mb-4">
                    <span className="text-yellow-500 font-bold text-lg mr-2">{averageRating.toFixed(1)}</span>
                    <div className="flex">
                        {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-yellow-500" filled={i < Math.round(averageRating)} />)}
                    </div>
                </div>
            )}
            {currentUser && (
                <form onSubmit={handleReviewSubmit} className="bg-gray-100 dark:bg-jazz-blue-700 p-3 rounded-lg mb-4">
                    <div className="flex items-center mb-2">{[1, 2, 3, 4, 5].map(star => <button type="button" key={star} onClick={() => setNewReviewRating(star)}><StarIcon className={`w-6 h-6 transition-colors ${newReviewRating >= star ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`} filled={newReviewRating >= star} /></button>)}</div>
                    <textarea value={newReviewContent} onChange={(e) => setNewReviewContent(e.target.value)} placeholder="이곳에 대한 후기를 남겨주세요." rows={2} className="w-full bg-white dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-600 rounded-md p-2 text-sm text-gray-700 dark:text-gray-200 mb-2" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <label htmlFor="anonymous-toggle-venue" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">익명으로 등록</label>
                            <button type="button" onClick={() => setIsAnonymous(!isAnonymous)} className={`${isAnonymous ? 'bg-jazz-blue-900 dark:bg-jazz-gold-500' : 'bg-gray-300 dark:bg-jazz-blue-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none`}>
                                <span className={`${isAnonymous ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                            </button>
                        </div>
                        <button type="submit" disabled={isSubmittingReview || !newReviewContent.trim() || newReviewRating === 0} className="bg-jazz-blue-900 text-white font-bold py-2 px-4 rounded-md text-sm disabled:bg-gray-400 dark:disabled:bg-jazz-blue-700">등록</button>
                    </div>
                </form>
            )}
            <div className="space-y-4">
                {reviewsLoading ? <p className="text-sm text-gray-400 dark:text-jazz-gray-500">후기 로딩 중...</p> : reviews.length > 0 ? reviews.map(review => {
                    const isReviewAnonymous = review.isAnonymous;
                    const author = isReviewAnonymous ? null : usersData.get(review.authorUid);
                    const authorName = isReviewAnonymous ? '익명' : author?.name || '익명';
                    const authorPhoto = isReviewAnonymous 
                        ? `https://ui-avatars.com/api/?name=?&background=656E7C&color=FFFFFF`
                        : author?.photo || `https://ui-avatars.com/api/?name=${author?.name || '?'}`;

                    return (<div key={review.id} className="border-t border-gray-100 dark:border-jazz-blue-700 pt-3">
                                <div className="flex items-center mb-1">
                                    <img src={authorPhoto} alt={authorName} className="w-6 h-6 rounded-full mr-2" />
                                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{authorName}</span>
                                    <div className="flex ml-auto">{[...Array(5)].map((_, i) => <StarIcon key={i} className="w-4 h-4 text-yellow-500" filled={i < review.rating} />)}</div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-jazz-gray-300 pl-8">{review.content}</p>
                            </div>);
                }) : <p className="text-sm text-center text-gray-500 dark:text-jazz-gray-400 py-4">아직 등록된 후기가 없습니다.</p>}
            </div>
        </div>
        </div>
      </div>
    </div>
  );
};

const MusicianDetailModal: React.FC<{ musician: Musician, onClose: () => void; currentUser: FirebaseUser | null; navigateToEditor: NavigateToEditorFn; }> = ({ musician, onClose, currentUser, navigateToEditor }) => {
    const calculateExperience = (startYear: number) => {
        const numericStartYear = Number(startYear);
        if (!numericStartYear || numericStartYear > new Date().getFullYear()) return '신입';
        const years = new Date().getFullYear() - numericStartYear;
        return `${Math.max(1, years)}년차`;
    };
    const skillLevelText = { '초보': '연습한 곡 위주로 합주 가능', '중급': '대부분의 스탠다드 연주 가능', '프로': '공연 리딩 및 즉흥 연주 가능' };
    const isOwner = currentUser && currentUser.uid === musician.ownerUid;

    const [reviews, setReviews] = useState<Review[]>([]);
    const [usersData, setUsersData] = useState<Map<string, User>>(new Map());
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [newReviewContent, setNewReviewContent] = useState('');
    const [newReviewRating, setNewReviewRating] = useState(0);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [averageRating, setAverageRating] = useState((musician.ratingCount && musician.totalRating) ? (musician.totalRating / musician.ratingCount) : 0);
    const [ratingCount, setRatingCount] = useState(musician.ratingCount || 0);

    useEffect(() => {
        if (!db) return;
        const fetchReviews = async () => {
            setReviewsLoading(true);
            try {
                const reviewsRef = collection(db, 'musicians', musician.id, 'reviews');
                const q = query(reviewsRef, orderBy('dateTime', 'desc'));
                const querySnapshot = await getDocs(q);
                const reviewsList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    if (data.dateTime?.toDate) data.dateTime = data.dateTime.toDate().toISOString();
                    return { id: doc.id, ...data } as Review;
                });
                setReviews(reviewsList);
                
                const authorUids = [...new Set(reviewsList.filter(r => !r.isAnonymous).map(r => r.authorUid))];
                if (authorUids.length > 0) {
                    const usersToFetch = authorUids.filter(uid => !usersData.has(uid));
                    if (usersToFetch.length > 0) {
                        const userPromises = usersToFetch.map(uid => getDoc(doc(db, 'users', uid)));
                        const userDocs = await Promise.all(userPromises);
                        const newUsers = new Map(usersData);
                        // FIX: Safely assign properties from Firestore data to the User type by checking their types.
                        userDocs.forEach(userDoc => {
                            if (userDoc.exists()) {
                                const data = userDoc.data();
                                const accountTypeVal = data.accountType;
                                newUsers.set(userDoc.id, {
                                    uid: userDoc.id,
                                    name: typeof data.name === 'string' ? data.name : null,
                                    photo: typeof data.photo === 'string' ? data.photo : null,
                                    email: typeof data.email === 'string' ? data.email : null,
                                    accountType: (accountTypeVal === 'musician' || accountTypeVal === 'venue_owner' || accountTypeVal === 'general') ? accountTypeVal : undefined
                                });
                            }
                        });
                        setUsersData(newUsers);
                    }
                }
            } catch (e) { console.error("Error fetching reviews:", e); }
            setReviewsLoading(false);
        };
        fetchReviews();
    }, [musician.id, usersData]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentUser || !newReviewContent.trim() || newReviewRating === 0) return;
        setIsSubmittingReview(true);
        
        try {
            await runTransaction(db, async (transaction) => {
                const musicianRef = doc(db, 'musicians', musician.id);
                const musicianDoc = await transaction.get(musicianRef);
                if (!musicianDoc.exists()) throw "Musician not found!";

                const currentData = musicianDoc.data();
                const newRatingCount = (currentData.ratingCount || 0) + 1;
                const newTotalRating = (currentData.totalRating || 0) + newReviewRating;

                transaction.update(musicianRef, { ratingCount: newRatingCount, totalRating: newTotalRating });
                
                const newReviewRef = doc(collection(db, 'musicians', musician.id, 'reviews'));
                transaction.set(newReviewRef, {
                    authorUid: currentUser.uid,
                    content: newReviewContent,
                    rating: newReviewRating,
                    dateTime: Timestamp.now(),
                    isAnonymous: isAnonymous,
                });
                setAverageRating(newTotalRating / newRatingCount);
                setRatingCount(newRatingCount);
            });
            
            const newReview: Review = { id: 'temp' + Date.now(), authorUid: currentUser.uid, content: newReviewContent, rating: newReviewRating, dateTime: new Date().toISOString(), isAnonymous: isAnonymous };
            setReviews(prev => [newReview, ...prev]);
            setNewReviewContent('');
            setNewReviewRating(0);
            setIsAnonymous(false);
            alert("후기가 등록되었습니다.");
        } catch (e) {
            console.error("Failed to submit review:", e);
            alert("후기 등록에 실패했습니다.");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white dark:bg-jazz-blue-800 rounded-lg max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-200">
            <div className="relative">
                <ImageSlider images={musician.photos} />
                <button onClick={onClose} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                 {isOwner && (
                    <button onClick={() => { onClose(); navigateToEditor({ type: 'musician', id: musician.id }); }} className="absolute top-2 left-2 bg-white/80 text-gray-800 py-1 px-3 rounded-full text-sm font-semibold flex items-center space-x-1 hover:bg-gray-200 transition-colors">
                        <PencilIcon className="w-4 h-4" />
                        <span>수정</span>
                    </button>
                )}
            </div>
            <div className="p-4">
                <h2 className="text-2xl font-bold text-jazz-blue-900 dark:text-white">{musician.name}</h2>
                <p className="text-md text-gray-600 dark:text-jazz-gray-300 mb-1">{(musician.instruments || []).join(', ')}</p>
                <div className="text-sm text-gray-500 dark:text-jazz-gray-400 mb-3 space-x-2">
                    <span>{calculateExperience(musician.startYear)}</span>
                    <span>·</span>
                    <span>{skillLevelText[musician.skillLevel]}</span>
                </div>
                <div className="flex items-center space-x-4 mb-4">
                    {musician.youtubeUrl && <a href={musician.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-jazz-gray-400 hover:text-jazz-blue-900 dark:hover:text-white transition-colors"><YoutubeIcon className="w-8 h-8" /></a>}
                    {musician.instagramUrl && <a href={musician.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-jazz-gray-400 hover:text-jazz-blue-900 dark:hover:text-white transition-colors"><InstagramIcon className="w-7 h-7" /></a>}
                </div>
                <p className="text-gray-700 dark:text-jazz-gray-300 mb-4">{musician.profile}</p>
                 <div className="flex flex-wrap gap-2 mb-4">
                    {(musician.tagsMusician || []).map(tag => <span key={tag} className="bg-blue-100 text-jazz-blue-900 dark:bg-jazz-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1 rounded-full">{tag}</span>)}
                </div>
                <div className="border-t border-gray-200 dark:border-jazz-blue-700 pt-3 mt-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">후기 ({ratingCount})</h3>
                    {averageRating > 0 && (
                        <div className="flex items-center mb-4">
                            <span className="text-yellow-500 font-bold text-lg mr-2">{averageRating.toFixed(1)}</span>
                            <div className="flex">{[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-yellow-500" filled={i < Math.round(averageRating)} />)}</div>
                        </div>
                    )}
                    {currentUser && (
                        <form onSubmit={handleReviewSubmit} className="bg-gray-100 dark:bg-jazz-blue-700 p-3 rounded-lg mb-4">
                            <div className="flex items-center mb-2">{[1, 2, 3, 4, 5].map(star => <button type="button" key={star} onClick={() => setNewReviewRating(star)}><StarIcon className={`w-6 h-6 transition-colors ${newReviewRating >= star ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`} filled={newReviewRating >= star} /></button>)}</div>
                            <textarea value={newReviewContent} onChange={(e) => setNewReviewContent(e.target.value)} placeholder="연주자의 연주가 어땠는지 적어주세요." rows={2} className="w-full bg-white dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-600 rounded-md p-2 text-sm text-gray-700 dark:text-gray-200 mb-2" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <label htmlFor="anonymous-toggle-musician" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">익명으로 등록</label>
                                    <button type="button" onClick={() => setIsAnonymous(!isAnonymous)} className={`${isAnonymous ? 'bg-jazz-blue-900 dark:bg-jazz-gold-500' : 'bg-gray-300 dark:bg-jazz-blue-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none`}>
                                        <span className={`${isAnonymous ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                    </button>
                                </div>
                                <button type="submit" disabled={isSubmittingReview || !newReviewContent.trim() || newReviewRating === 0} className="bg-jazz-blue-900 text-white font-bold py-2 px-4 rounded-md text-sm disabled:bg-gray-400 dark:disabled:bg-jazz-blue-700">등록</button>
                            </div>
                        </form>
                    )}
                     <div className="space-y-4">
                        {reviewsLoading ? <p className="text-sm text-gray-400 dark:text-jazz-gray-500">후기 로딩 중...</p> : reviews.length > 0 ? reviews.map(review => {
                             const isReviewAnonymous = review.isAnonymous;
                             const author = isReviewAnonymous ? null : usersData.get(review.authorUid);
                             const authorName = isReviewAnonymous ? '익명' : author?.name || '익명';
                             const authorPhoto = isReviewAnonymous 
                                 ? `https://ui-avatars.com/api/?name=?&background=656E7C&color=FFFFFF`
                                 : author?.photo || `https://ui-avatars.com/api/?name=${author?.name || '?'}`;
                            return (<div key={review.id} className="border-t border-gray-100 dark:border-jazz-blue-700 pt-3">
                                        <div className="flex items-center mb-1">
                                            <img src={authorPhoto} alt={authorName} className="w-6 h-6 rounded-full mr-2" />
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{authorName}</span>
                                            <div className="flex ml-auto">{[...Array(5)].map((_, i) => <StarIcon key={i} className="w-4 h-4 text-yellow-500" filled={i < review.rating} />)}</div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-jazz-gray-300 pl-8">{review.content}</p>
                                    </div>);
                        }) : <p className="text-sm text-center text-gray-500 dark:text-jazz-gray-400 py-4">아직 등록된 후기가 없습니다.</p>}
                    </div>
                </div>
            </div>
        </div>
    </div>
    )
};

const TeamDetailModal: React.FC<{ team: Team, allMusicians: Musician[], onSelectMusician: (m: Musician) => void, onClose: () => void; currentUser: FirebaseUser | null; navigateToEditor: NavigateToEditorFn; }> = ({ team, allMusicians, onSelectMusician, onClose, currentUser, navigateToEditor }) => {
    const isOwner = currentUser && currentUser.uid === team.ownerUid;
    const isTeamMember = useMemo(() => {
        if (!currentUser) return false;
        return team.members.some(member => member.ownerUid === currentUser.uid);
    }, [currentUser, team.members]);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [usersData, setUsersData] = useState<Map<string, User>>(new Map());
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [newReviewContent, setNewReviewContent] = useState('');
    const [newReviewRating, setNewReviewRating] = useState(0);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [averageRating, setAverageRating] = useState((team.ratingCount && team.totalRating) ? (team.totalRating / team.ratingCount) : 0);
    const [ratingCount, setRatingCount] = useState(team.ratingCount || 0);

    useEffect(() => {
        if (!db) return;
        const fetchReviews = async () => {
            setReviewsLoading(true);
            try {
                const reviewsRef = collection(db, 'teams', team.id, 'reviews');
                const q = query(reviewsRef, orderBy('dateTime', 'desc'));
                const querySnapshot = await getDocs(q);
                const reviewsList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    if (data.dateTime?.toDate) data.dateTime = data.dateTime.toDate().toISOString();
                    return { id: doc.id, ...data } as Review;
                });
                setReviews(reviewsList);
                
                const authorUids = [...new Set(reviewsList.filter(r => !r.isAnonymous).map(r => r.authorUid))];
                if (authorUids.length > 0) {
                    const usersToFetch = authorUids.filter(uid => !usersData.has(uid));
                    if (usersToFetch.length > 0) {
                        const userPromises = usersToFetch.map(uid => getDoc(doc(db, 'users', uid)));
                        const userDocs = await Promise.all(userPromises);
                        const newUsers = new Map(usersData);
                        // FIX: Safely assign properties from Firestore data to the User type by checking their types.
                        userDocs.forEach(userDoc => {
                            if (userDoc.exists()) {
                                const data = userDoc.data();
                                const accountTypeVal = data.accountType;
                                newUsers.set(userDoc.id, {
                                    uid: userDoc.id,
                                    name: typeof data.name === 'string' ? data.name : null,
                                    photo: typeof data.photo === 'string' ? data.photo : null,
                                    email: typeof data.email === 'string' ? data.email : null,
                                    accountType: (accountTypeVal === 'musician' || accountTypeVal === 'venue_owner' || accountTypeVal === 'general') ? accountTypeVal : undefined
                                });
                            }
                        });
                        setUsersData(newUsers);
                    }
                }
            } catch (e) { console.error("Error fetching reviews:", e); }
            setReviewsLoading(false);
        };
        fetchReviews();
    }, [team.id, usersData]);

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentUser || !newReviewContent.trim() || newReviewRating === 0) return;
        setIsSubmittingReview(true);
        try {
            await runTransaction(db, async (transaction) => {
                const teamRef = doc(db, 'teams', team.id);
                const teamDoc = await transaction.get(teamRef);
                if (!teamDoc.exists()) throw "Team not found!";

                const currentData = teamDoc.data();
                const newRatingCount = (currentData.ratingCount || 0) + 1;
                const newTotalRating = (currentData.totalRating || 0) + newReviewRating;

                transaction.update(teamRef, { ratingCount: newRatingCount, totalRating: newTotalRating });
                const newReviewRef = doc(collection(db, 'teams', team.id, 'reviews'));
                transaction.set(newReviewRef, { authorUid: currentUser.uid, content: newReviewContent, rating: newReviewRating, dateTime: Timestamp.now(), isAnonymous: isAnonymous });
                setAverageRating(newTotalRating / newRatingCount);
                setRatingCount(newRatingCount);
            });
            const newReview: Review = { id: 'temp' + Date.now(), authorUid: currentUser.uid, content: newReviewContent, rating: newReviewRating, dateTime: new Date().toISOString(), isAnonymous: isAnonymous };
            setReviews(prev => [newReview, ...prev]);
            setNewReviewContent('');
            setNewReviewRating(0);
            setIsAnonymous(false);
            alert("후기가 등록되었습니다.");
        } catch (e) {
            console.error("Failed to submit review:", e);
            alert("후기 등록에 실패했습니다.");
        } finally {
            setIsSubmittingReview(false);
        }
    };
    
    return (
     <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
        <div className="bg-white dark:bg-jazz-blue-800 rounded-lg max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto text-gray-800 dark:text-gray-200">
            <div className="relative">
                <ImageSlider images={team.teamPhotos} />
                 <button onClick={onClose} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1.5 hover:bg-opacity-75"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                 {(isOwner || isTeamMember) && (
                    <button onClick={() => { onClose(); navigateToEditor({ type: 'team', id: team.id }); }} className="absolute top-2 left-2 bg-white/80 text-gray-800 py-1 px-3 rounded-full text-sm font-semibold flex items-center space-x-1 hover:bg-gray-200 transition-colors">
                        <PencilIcon className="w-4 h-4" />
                        <span>수정</span>
                    </button>
                )}
            </div>
            <div className="p-4">
                <h2 className="text-2xl font-bold text-jazz-blue-900 dark:text-white mb-1">{team.teamName}</h2>
                {team.region && <p className="text-sm text-gray-500 dark:text-jazz-gray-400 mb-3">활동 지역: {team.region}</p>}
                 <div className="flex items-center space-x-4 mb-4">
                    {team.youtubeUrl && <a href={team.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-jazz-gray-400 hover:text-jazz-blue-900 dark:hover:text-white transition-colors"><YoutubeIcon className="w-8 h-8" /></a>}
                    {team.instagramUrl && <a href={team.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-jazz-gray-400 hover:text-jazz-blue-900 dark:hover:text-white transition-colors"><InstagramIcon className="w-7 h-7" /></a>}
                </div>
                <p className="text-gray-700 dark:text-jazz-gray-300 mb-4">{team.teamDescription}</p>
                
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 border-t border-gray-200 dark:border-jazz-blue-700 pt-3 mt-3 mb-2">멤버</h3>
                <div className="space-y-3">
                    {(team.members && team.members.length > 0) ? team.members.map(member => {
                        const musicianProfile = member.musicianId ? allMusicians.find(m => m.id === member.musicianId) : null;
                        return (
                        <div key={`${member.name}-${member.instrument}`} 
                            className={`bg-gray-50 dark:bg-jazz-blue-700/50 border border-gray-200 dark:border-jazz-blue-700 p-2 rounded-lg flex items-center ${musicianProfile ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-jazz-blue-700' : ''}`} 
                            onClick={() => musicianProfile && onSelectMusician(musicianProfile)}>
                            <ProfileAvatar 
                                photos={musicianProfile?.photos} 
                                name={member.name} 
                                className="w-12 h-12 rounded-full object-cover mr-3" 
                                textClassName="text-2xl" 
                            />
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800 dark:text-gray-200">{member.name}</p>
                                <p className="text-sm text-gray-500 dark:text-jazz-gray-400">{member.instrument}</p>
                            </div>
                            {member.isLeader && (
                                <LeaderIcon className="w-6 h-6 text-jazz-gold-500" filled={true}/>
                            )}
                        </div>
                    )}) : (
                        <p className="text-sm text-gray-500 dark:text-jazz-gray-400">아직 등록된 멤버가 없습니다.</p>
                    )}
                </div>
                <div className="border-t border-gray-200 dark:border-jazz-blue-700 pt-3 mt-3">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">후기 ({ratingCount})</h3>
                    {averageRating > 0 && (
                        <div className="flex items-center mb-4">
                            <span className="text-yellow-500 font-bold text-lg mr-2">{averageRating.toFixed(1)}</span>
                            <div className="flex">{[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-yellow-500" filled={i < Math.round(averageRating)} />)}</div>
                        </div>
                    )}
                    {currentUser && (
                        <form onSubmit={handleReviewSubmit} className="bg-gray-100 dark:bg-jazz-blue-700 p-3 rounded-lg mb-4">
                            <div className="flex items-center mb-2">{[1, 2, 3, 4, 5].map(star => <button type="button" key={star} onClick={() => setNewReviewRating(star)}><StarIcon className={`w-6 h-6 transition-colors ${newReviewRating >= star ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`} filled={newReviewRating >= star} /></button>)}</div>
                            <textarea value={newReviewContent} onChange={(e) => setNewReviewContent(e.target.value)} placeholder="팀에 대한 후기를 남겨주세요." rows={2} className="w-full bg-white dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-600 rounded-md p-2 text-sm text-gray-700 dark:text-gray-200 mb-2" />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <label htmlFor="anonymous-toggle-team" className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">익명으로 등록</label>
                                    <button type="button" onClick={() => setIsAnonymous(!isAnonymous)} className={`${isAnonymous ? 'bg-jazz-blue-900 dark:bg-jazz-gold-500' : 'bg-gray-300 dark:bg-jazz-blue-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none`}>
                                        <span className={`${isAnonymous ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
                                    </button>
                                </div>
                                <button type="submit" disabled={isSubmittingReview || !newReviewContent.trim() || newReviewRating === 0} className="bg-jazz-blue-900 text-white font-bold py-2 px-4 rounded-md text-sm disabled:bg-gray-400 dark:disabled:bg-jazz-blue-700">등록</button>
                            </div>
                        </form>
                    )}
                     <div className="space-y-4">
                        {reviewsLoading ? <p className="text-sm text-gray-400 dark:text-jazz-gray-500">후기 로딩 중...</p> : reviews.length > 0 ? reviews.map(review => {
                            const isReviewAnonymous = review.isAnonymous;
                            const author = isReviewAnonymous ? null : usersData.get(review.authorUid);
                            const authorName = isReviewAnonymous ? '익명' : author?.name || '익명';
                            const authorPhoto = isReviewAnonymous 
                                ? `https://ui-avatars.com/api/?name=?&background=656E7C&color=FFFFFF`
                                : author?.photo || `https://ui-avatars.com/api/?name=${author?.name || '?'}`;
                            return (<div key={review.id} className="border-t border-gray-100 dark:border-jazz-blue-700 pt-3">
                                        <div className="flex items-center mb-1">
                                            <img src={authorPhoto} alt={authorName} className="w-6 h-6 rounded-full mr-2" />
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{authorName}</span>
                                            <div className="flex ml-auto">{[...Array(5)].map((_, i) => <StarIcon key={i} className="w-4 h-4 text-yellow-500" filled={i < review.rating} />)}</div>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-jazz-gray-300 pl-8">{review.content}</p>
                                    </div>);
                        }) : <p className="text-sm text-center text-gray-500 dark:text-jazz-gray-400 py-4">아직 등록된 후기가 없습니다.</p>}
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};


const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, navigateToEditor, onTabChange, targetUid, isOverlay = false, onCloseOverlay = () => {} }) => {
  const [viewState, setViewState] = useState<ProfileTab>('연주자');
  const [instrumentFilter, setInstrumentFilter] = useState<string>('전체');
  const [regionFilter, setRegionFilter] = useState<string>('전체');
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (USE_MOCK_DATA || !db) {
        setMusicians(mockMusicians as any[]);
        setTeams(mockTeams as any[]);
        setVenues(mockVenues);
        setLoading(false);
        return;
      }
      try {
        const [musiciansSnap, teamsSnap, venuesSnap] = await Promise.all([
          getDocs(collection(db, 'musicians')),
          getDocs(collection(db, 'teams')),
          getDocs(collection(db, 'venues')),
        ]);
        setMusicians(musiciansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Musician)));
        setTeams(teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
        setVenues(venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Venue)));
      } catch (error) {
        console.error("Error fetching profiles:", error);
        console.warn("Falling back to mock data due to Firestore error.");
        setMusicians(mockMusicians as any[]);
        setTeams(mockTeams as any[]);
        setVenues(mockVenues);
      }
      setLoading(false);
    };
    fetchData();
  }, []);
  
    useEffect(() => {
        if (!loading && targetUid && (musicians.length > 0 || teams.length > 0 || venues.length > 0)) {
            const musician = musicians.find(m => m.ownerUid === targetUid);
            if (musician) {
                setViewState('연주자');
                setSelectedMusician(musician);
                return;
            }

            const team = teams.find(t => t.ownerUid === targetUid);
            if (team) {
                setViewState('연주팀');
                setSelectedTeam(team);
                return;
            }

            const venue = venues.find(v => v.ownerUid === targetUid);
            if (venue) {
                setViewState('재즈바');
                setSelectedVenue(venue);
                return;
            }
        }
    }, [loading, targetUid, musicians, teams, venues]);

  const filteredMusicians = useMemo(() => {
    if (instrumentFilter === '전체') {
        return musicians;
    }
    return musicians.filter(m => 
        (m.instruments || []).some(inst => inst.toLowerCase().includes(instrumentFilter.toLowerCase()))
    );
  }, [musicians, instrumentFilter]);

  const uniqueRegions = useMemo(() => {
    if (venues.length === 0) return ['전체'];
    const regions = new Set(venues.map(v => v.address.split(' ')[0]));
    return ['전체', ...Array.from(regions)];
  }, [venues]);

  const filteredVenues = useMemo(() => {
    if (regionFilter === '전체') return venues;
    return venues.filter(v => v.address.startsWith(regionFilter));
  }, [venues, regionFilter]);


  const handleSelectMusician = (musician: Musician) => {
    setSelectedTeam(null);
    setSelectedMusician(musician);
  };

  const handleCloseModal = () => {
    setSelectedVenue(null);
    setSelectedMusician(null);
    setSelectedTeam(null);
    if (isOverlay) {
        onCloseOverlay();
    }
  };
  
  const TABS:ProfileTab[] = ['재즈바', '연주자', '연주팀'];
  const INSTRUMENTS = ['전체', '피아노', '베이스', '드럼', '색소폰', '트럼펫', '기타', '보컬'];

  const renderContent = () => {
    if (loading) {
      return <div className="text-center py-10 text-gray-500 dark:text-jazz-gray-400">프로필 로딩 중...</div>;
    }
    switch(viewState) {
        case '재즈바':
            return (
                <>
                    <div className="flex space-x-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
                        {uniqueRegions.map(region => (
                            <button
                                key={region}
                                onClick={() => setRegionFilter(region)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${regionFilter === region ? 'bg-jazz-blue-900 text-white dark:bg-jazz-gold-500 dark:text-jazz-blue-900' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-jazz-blue-800 dark:text-gray-300 dark:border-jazz-blue-700 dark:hover:bg-jazz-blue-700'}`}
                            >
                                {region}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {filteredVenues.map(venue => (
                            <div key={venue.id} className="relative rounded-lg overflow-hidden cursor-pointer group shadow" onClick={() => setSelectedVenue(venue)}>
                                <ProfileAvatar photos={venue.photos} name={venue.name} className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-110" textClassName="text-5xl" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                <h3 className="absolute bottom-2 left-2 text-white font-bold text-md">{venue.name}</h3>
                            </div>
                        ))}
                    </div>
                    {filteredVenues.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500 dark:text-jazz-gray-400">
                            해당 지역의 재즈바가 없습니다.
                        </div>
                    )}
                </>
            );
        case '연주자':
            return (
                <div>
                    <div className="flex space-x-2 mb-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                       <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
                        {INSTRUMENTS.map(inst => (
                            <button
                                key={inst}
                                onClick={() => setInstrumentFilter(inst)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${instrumentFilter === inst ? 'bg-jazz-blue-900 text-white dark:bg-jazz-gold-500 dark:text-jazz-blue-900' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-jazz-blue-800 dark:text-gray-300 dark:border-jazz-blue-700 dark:hover:bg-jazz-blue-700'}`}
                            >
                                {inst}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {filteredMusicians.map(musician => (
                            <div key={musician.id} className="bg-white dark:bg-jazz-blue-800 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-jazz-blue-700 cursor-pointer group transition-shadow hover:shadow-lg" onClick={() => setSelectedMusician(musician)}>
                                <ProfileAvatar photos={musician.photos} name={musician.name} className="w-full h-40 object-cover object-center" textClassName="text-6xl" />
                                <div className="p-3">
                                    <h3 className="font-bold text-md text-gray-800 dark:text-gray-100">{musician.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-jazz-gray-400 truncate">{(musician.instruments || []).join(', ')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                     {filteredMusicians.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500 dark:text-jazz-gray-400">
                            해당 악기 연주자가 없습니다.
                        </div>
                    )}
                </div>
            );
        case '연주팀':
            return (
                <div className="space-y-4">
                {teams.map(team => (
                    <div key={team.id} className="bg-white dark:bg-jazz-blue-800 border border-gray-200 dark:border-jazz-blue-700 rounded-lg flex items-center p-3 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-jazz-blue-700 transition-colors" onClick={() => setSelectedTeam(team)}>
                        <ProfileAvatar photos={team.teamPhotos} name={team.teamName} className="w-20 h-20 rounded-md mr-4 object-cover" textClassName="text-4xl" />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{team.teamName}</h3>
                            <p className="text-sm text-gray-600 dark:text-jazz-gray-300 line-clamp-2">{team.teamDescription}</p>
                        </div>
                    </div>
                ))}
                </div>
            );
        default: return null;
    }
  }

  if (isOverlay) {
    return (
        <>
            {selectedVenue && <VenueDetailModal venue={selectedVenue} onClose={handleCloseModal} currentUser={currentUser} navigateToEditor={navigateToEditor} />}
            {selectedMusician && <MusicianDetailModal musician={selectedMusician} onClose={handleCloseModal} currentUser={currentUser} navigateToEditor={navigateToEditor} />}
            {selectedTeam && <TeamDetailModal team={selectedTeam} allMusicians={musicians} onSelectMusician={handleSelectMusician} onClose={handleCloseModal} currentUser={currentUser} navigateToEditor={navigateToEditor} />}
        </>
    );
  }

  return (
    <div className="p-4 relative">
      <div className="flex bg-gray-200 dark:bg-jazz-blue-800 rounded-full p-1 mb-4">
        {TABS.map(tab => (
            <button
                key={tab}
                onClick={() => {
                    setViewState(tab);
                    onTabChange(tab);
                }}
                className={`w-1/3 py-2 text-sm font-bold rounded-full transition-colors ${viewState === tab ? 'bg-white dark:bg-jazz-blue-700 shadow text-jazz-blue-900 dark:text-white' : 'text-gray-600 dark:text-jazz-gray-300'}`}
            >
                {tab}
            </button>
        ))}
      </div>

      {renderContent()}

      {selectedVenue && <VenueDetailModal venue={selectedVenue} onClose={handleCloseModal} currentUser={currentUser} navigateToEditor={navigateToEditor} />}
      {selectedMusician && <MusicianDetailModal musician={selectedMusician} onClose={handleCloseModal} currentUser={currentUser} navigateToEditor={navigateToEditor} />}
      {selectedTeam && <TeamDetailModal team={selectedTeam} allMusicians={musicians} onSelectMusician={handleSelectMusician} onClose={handleCloseModal} currentUser={currentUser} navigateToEditor={navigateToEditor} />}
    </div>
  );
};

export default ProfileView;