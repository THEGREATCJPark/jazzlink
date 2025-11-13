
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { doc, getDoc, collection, query, orderBy, getDocs, addDoc, updateDoc, Timestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { CommunityFeed, Comment, User as UserType } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import HeartIcon from './icons/HeartIcon';

interface CommunityFeedDetailViewProps {
    feedId: string;
    currentUser: FirebaseUser | null;
    onViewUserProfile: (uid: string) => void;
}

const CommunityFeedDetailView: React.FC<CommunityFeedDetailViewProps> = ({ feedId, currentUser, onViewUserProfile }) => {
    const [feedItem, setFeedItem] = useState<CommunityFeed | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [usersData, setUsersData] = useState<Map<string, UserType>>(new Map());
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchAllData = useCallback(async () => {
        if (!db) return;
        setLoading(true);
        try {
            const feedRef = doc(db, 'communityFeed', feedId);
            const feedSnap = await getDoc(feedRef);
            if (!feedSnap.exists()) {
                setError('게시물을 찾을 수 없습니다.');
                setLoading(false);
                return;
            }
            const feedDataRaw = feedSnap.data();
            if (feedDataRaw.dateTime && feedDataRaw.dateTime instanceof Timestamp) {
                feedDataRaw.dateTime = feedDataRaw.dateTime.toDate().toISOString();
            }
            if (!feedDataRaw.viewedBy) {
                feedDataRaw.viewedBy = [];
            }
            const feedData = { id: feedSnap.id, ...feedDataRaw } as CommunityFeed;
            setFeedItem(feedData);

            const commentsRef = collection(db, 'communityFeed', feedId, 'comments');
            const q = query(commentsRef, orderBy('dateTime', 'asc'));
            const commentsSnap = await getDocs(q);
            const commentsData = commentsSnap.docs.map(doc => {
                const commentDataRaw = doc.data();
                if (commentDataRaw.dateTime && commentDataRaw.dateTime instanceof Timestamp) {
                    commentDataRaw.dateTime = commentDataRaw.dateTime.toDate().toISOString();
                }
                return { id: doc.id, ...commentDataRaw } as Comment;
            });
            setComments(commentsData);

            const authorUids = new Set<string>();
            commentsData.forEach(comment => authorUids.add(comment.authorUid));

            const newUsersData = new Map(usersData);
            const uidsToFetch = Array.from(authorUids).filter(uid => !newUsersData.has(uid));
            if (uidsToFetch.length > 0) {
                 const userPromises = uidsToFetch.map(uid => getDoc(doc(db, 'users', uid)));
                 const userDocs = await Promise.all(userPromises);
                 userDocs.forEach(userDoc => {
                    if (userDoc.exists()) {
                        newUsersData.set(userDoc.id, { uid: userDoc.id, ...userDoc.data() } as UserType);
                    }
                 });
                setUsersData(newUsersData);
            }
        } catch (e) {
            console.error(e);
            setError('데이터를 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [feedId, usersData]);

    useEffect(() => {
        const recordViewAndFetchData = async () => {
            if (db && currentUser) {
                const feedRef = doc(db, 'communityFeed', feedId);
                try {
                    await updateDoc(feedRef, {
                        viewedBy: arrayUnion(currentUser.uid)
                    });
                } catch (e) {
                    console.warn("Could not record view", e);
                }
            }
            await fetchAllData();
        };

        recordViewAndFetchData();
    }, [fetchAllData, feedId, currentUser]);


    const handleLike = async () => {
        if (!db || !currentUser || !feedItem) {
            alert('좋아요를 누르려면 로그인이 필요합니다.');
            return;
        }
        const feedRef = doc(db, 'communityFeed', feedId);
        const hasLiked = feedItem.likedBy.includes(currentUser.uid);

        try {
            if (hasLiked) {
                await updateDoc(feedRef, { likedBy: arrayRemove(currentUser.uid) });
                setFeedItem(prev => prev ? { ...prev, likedBy: prev.likedBy.filter(uid => uid !== currentUser.uid) } : null);
            } else {
                await updateDoc(feedRef, { likedBy: arrayUnion(currentUser.uid) });
                setFeedItem(prev => prev ? { ...prev, likedBy: [...prev.likedBy, currentUser.uid] } : null);
            }
        } catch (e) {
            console.error("Error liking post:", e);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !currentUser || !newComment.trim()) return;
        setIsSubmitting(true);
        try {
            const commentsRef = collection(db, 'communityFeed', feedId, 'comments');
            await addDoc(commentsRef, {
                authorUid: currentUser.uid,
                content: newComment,
                dateTime: Timestamp.fromDate(new Date()),
            });
            setNewComment('');
            await fetchAllData();
        } catch (e) {
            console.error("Error submitting comment:", e);
            alert("댓글 등록에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-6 text-center text-gray-500 dark:text-jazz-gray-400">게시물 로딩 중...</div>;
    if (error) return <div className="p-6 text-center text-rose-500">{error}</div>;
    if (!feedItem) return null;

    const categoryStyle = feedItem.category === '연주자 구함' ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300' : feedItem.category === '연주 구함' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' : 'bg-gray-200 text-gray-800 dark:bg-jazz-blue-700 dark:text-jazz-gray-200';
    const hasLiked = currentUser ? feedItem.likedBy.includes(currentUser.uid) : false;

    return (
        <div className="animate-fade-in bg-white dark:bg-jazz-blue-800 min-h-full flex flex-col">
            <div className="flex-grow p-4">
                <div className="border-b border-gray-200 dark:border-jazz-blue-700 pb-4">
                    <button onClick={() => onViewUserProfile(feedItem.authorUid)} className="flex items-center mb-4 text-left w-full rounded-md hover:bg-gray-100 dark:hover:bg-jazz-blue-700 p-1 -ml-1">
                        <img src={feedItem.authorPhoto || `https://ui-avatars.com/api/?name=${feedItem.authorName}&background=1A263A&color=FFC700`} alt={feedItem.authorName || ''} className="w-10 h-10 rounded-full mr-3" />
                        <div>
                            <p className="font-bold text-gray-800 dark:text-gray-100">{feedItem.authorName || '익명'}</p>
                            <p className="text-xs text-gray-500 dark:text-jazz-gray-400">{new Date(feedItem.dateTime).toLocaleString('ko-KR')}</p>
                        </div>
                    </button>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${categoryStyle} mb-2 inline-block`}>{feedItem.category}</span>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{feedItem.title}</h1>
                    <p className="text-gray-700 dark:text-jazz-gray-300 whitespace-pre-wrap">{feedItem.content}</p>
                    {feedItem.images && feedItem.images.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {feedItem.images.map((img, index) => (
                                <div key={index} className="w-full aspect-square rounded-md overflow-hidden border border-gray-200 dark:border-jazz-blue-700">
                                    <img src={img} alt={`Post image ${index + 1}`} className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-6 flex items-center justify-end space-x-4">
                        <button onClick={handleLike} className={`flex items-center space-x-1.5 transition-colors ${hasLiked ? 'text-rose-500' : 'text-gray-500 dark:text-jazz-gray-400 hover:text-rose-500'}`}>
                            <HeartIcon className="w-5 h-5" filled={hasLiked} />
                            <span className="font-semibold">{feedItem.likedBy.length}</span>
                        </button>
                    </div>
                </div>

                <div className="pt-4">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">댓글 {comments.length}</h2>
                    <div className="space-y-4">
                        {comments.map(comment => {
                            const commentAuthor = usersData.get(comment.authorUid);
                            return (
                                <div key={comment.id} className="flex items-start">
                                    <button onClick={() => onViewUserProfile(comment.authorUid)} className="flex-shrink-0 rounded-full hover:opacity-80">
                                        <img src={commentAuthor?.photo || `https://ui-avatars.com/api/?name=${commentAuthor?.name}&background=1A263A&color=FFC700`} alt={commentAuthor?.name || ''} className="w-8 h-8 rounded-full" />
                                    </button>
                                    <div className="ml-3 bg-gray-100 dark:bg-jazz-blue-700 rounded-lg p-3 w-full">
                                        <div className="flex items-baseline justify-between">
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{commentAuthor?.name || '익명'}</span>
                                            <span className="text-xs text-gray-500 dark:text-jazz-gray-400">{new Date(comment.dateTime).toLocaleString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-jazz-gray-300 mt-1">{comment.content}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <form onSubmit={handleCommentSubmit} className="flex-shrink-0 p-4 sticky bottom-0 bg-white dark:bg-jazz-blue-800 border-t border-gray-200 dark:border-jazz-blue-700 flex items-center space-x-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="w-full bg-gray-100 dark:bg-jazz-blue-700 border border-gray-300 dark:border-jazz-blue-600 rounded-full py-2 px-4 text-sm text-gray-800 dark:text-gray-200 focus:ring-jazz-blue-900 focus:border-jazz-blue-900"
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="flex-shrink-0 bg-jazz-blue-900 text-white font-bold py-2 px-5 rounded-full text-sm disabled:bg-gray-400 dark:disabled:bg-jazz-blue-700"
                >
                    등록
                </button>
            </form>
        </div>
    );
};

export default CommunityFeedDetailView;
