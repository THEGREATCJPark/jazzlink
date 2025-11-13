import React, { useState } from 'react';
import { db } from '../firebase/config.ts';
import { collection, addDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { Team } from '../types.ts';

interface CreateTeamModalProps {
    onClose: () => void;
    onTeamCreated: (newTeam: Team) => void;
    currentUser: FirebaseUser | null;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ onClose, onTeamCreated, currentUser }) => {
    const [teamName, setTeamName] = useState('');
    const [teamDescription, setTeamDescription] = useState('');
    const [region, setRegion] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [instagramId, setInstagramId] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !db) {
            setError('로그인 정보가 유효하지 않습니다.');
            return;
        }
        if (!teamName.trim()) {
            setError('팀 이름은 필수 항목입니다.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const newTeamData = {
                teamName,
                teamDescription,
                region,
                youtubeUrl,
                instagramUrl: instagramId ? `https://instagram.com/${instagramId.replace('@', '')}` : '',
                teamPhotos: [`https://ui-avatars.com/api/?name=${teamName}&background=1A263A&color=FFC700&size=256`],
                ownerUid: currentUser.uid,
                members: [], // Members will be added after musician profile is created
            };

            const docRef = await addDoc(collection(db, 'teams'), newTeamData);
            
            onTeamCreated({ id: docRef.id, ...newTeamData });

        } catch (err) {
            console.error("Error creating team:", err);
            setError('팀 생성에 실패했습니다. 다시 시도해주세요.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white rounded-lg max-w-sm w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">새 연주팀 생성</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">팀 이름</label>
                        <input id="teamName" type="text" value={teamName} onChange={e => setTeamName(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-2 text-gray-700 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" required />
                    </div>
                     <div>
                        <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">주요 활동 지역</label>
                        <input id="region" type="text" placeholder="예: 서울, 홍대" value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-2 text-gray-700 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                    <div>
                        <label htmlFor="teamDesc" className="block text-sm font-medium text-gray-700 mb-1">한 줄 소개</label>
                        <textarea id="teamDesc" rows={3} value={teamDescription} onChange={e => setTeamDescription(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-2 text-gray-700 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                    <div>
                        <label htmlFor="teamYoutube" className="block text-sm font-medium text-gray-700 mb-1">YouTube 채널 주소 (선택)</label>
                        <input id="teamYoutube" type="text" placeholder="https://youtube.com/..." value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-2 text-gray-700 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                    <div>
                        <label htmlFor="teamInstagram" className="block text-sm font-medium text-gray-700 mb-1">Instagram ID (선택)</label>
                        <input id="teamInstagram" type="text" placeholder="my_jazz_band" value={instagramId} onChange={(e) => setInstagramId(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-2 text-gray-700 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>

                    {error && <p className="text-sm text-rose-500">{error}</p>}
                    
                    <button type="submit" disabled={isSubmitting} className="w-full bg-jazz-blue-900 text-white font-bold py-2 rounded-md hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400">
                        {isSubmitting ? '생성 중...' : '연주팀 생성하기'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateTeamModal;