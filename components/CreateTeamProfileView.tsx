import React, { useState, useRef } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';
import { User } from 'firebase/auth';

interface CreateTeamProfileViewProps {
    currentUser: User | null;
    setCurrentView: (view: string) => void;
}

const availableTags = [
    '듀오', '트리오', '쿼텟', '퀸텟', '섹스텟+', '빅밴드',
    '스탠다드', '비밥', '하드밥', '쿨재즈', '퓨전', '펑크', '라틴',
    '보컬 재즈', '클럽 연주팀', '이벤트/행사', '녹음 세션', '잼세션 호스트'
];

interface TagSelectorProps {
    availableTags: string[];
    selectedTags: string[];
    onTagToggle: (tag: string) => void;
    title: string;
}

const TagSelector: React.FC<TagSelectorProps> = ({
    availableTags,
    selectedTags,
    onTagToggle,
    title
}) => (
    <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">{title}</h2>
        <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => onTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                            isSelected
                                ? 'bg-jazz-blue-900 text-white border-jazz-blue-900'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-jazz-blue-900'
                        }`}
                    >
                        {tag}
                    </button>
                )
            })}
        </div>
    </div>
);


const CreateTeamProfileView: React.FC<CreateTeamProfileViewProps> = ({ currentUser, setCurrentView }) => {
    const [teamData, setTeamData] = useState({
        teamName: '',
        teamDescription: '',
        region: '',
        youtubeUrl: '',
        instagramUrl: '',
        tagsTeam: [] as string[],
    });
    
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const setFormValue = (key: string, value: any) => {
      setTeamData(prev => ({...prev, [key]: value}));
    };
    
    const handleTagToggle = (tag: string) => {
        const current = teamData.tagsTeam || [];
        const newTags = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
        setFormValue('tagsTeam', newTags);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const newFiles = [...imageFiles];
            newFiles[index] = file;
            setImageFiles(newFiles);

            const reader = new FileReader();
            reader.onloadend = () => {
                const newPreviews = [...imagePreviews];
                newPreviews[index] = reader.result as string;
                setImagePreviews(newPreviews);
            }
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !db || !storage) {
            setError('로그인 정보가 유효하지 않습니다.');
            return;
        }
        if (!teamData.teamName?.trim()) {
            setError('팀 이름은 필수 항목입니다.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const photoURLs = await Promise.all(
                imageFiles.map(async (file, index) => {
                    if (file) {
                        const filePath = `team_images/${currentUser.uid}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, filePath);
                        await uploadBytes(storageRef, file);
                        return getDownloadURL(storageRef);
                    }
                    return imagePreviews[index];
                })
            );

            let finalPhotos = photoURLs.filter((url): url is string => !!url);
            if(finalPhotos.length === 0) {
                 finalPhotos.push(`https://ui-avatars.com/api/?name=${teamData.teamName}&background=1A263A&color=FFC700&size=400`);
            }
            
            const newTeamData = {
                ...teamData,
                teamName: teamData.teamName,
                teamPhotos: finalPhotos,
                ownerUid: currentUser.uid,
                members: [],
                createdAt: Timestamp.now(),
            };

            await addDoc(collection(db, 'teams'), newTeamData);
            alert('연주팀이 성공적으로 생성되었습니다!');
            setCurrentView('프로필');

        } catch (err) {
            console.error("Error creating team:", err);
            setError('팀 생성에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isProcessing = isSubmitting;

    return (
        <div className="bg-white dark:bg-jazz-blue-900 min-h-screen flex flex-col">
            <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-200 dark:border-jazz-blue-700 h-16">
                 <button onClick={() => setCurrentView('프로필')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-jazz-blue-800">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-xl font-bold text-jazz-blue-900 dark:text-white mx-auto">새 연주팀 만들기</h1>
                 <div className="w-8"></div>
            </header>
            <main className="flex-grow p-6 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">팀 사진 (최대 3장)</label>
                        <div className="grid grid-cols-3 gap-4">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="aspect-square">
                                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} ref={fileInputRefs[index]} className="hidden" />
                                    <button type="button" onClick={() => fileInputRefs[index].current?.click()} className="w-full h-full bg-gray-100 dark:bg-jazz-blue-800 border-2 border-dashed border-gray-300 dark:border-jazz-blue-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-jazz-gray-500 hover:border-jazz-blue-900 dark:hover:border-jazz-gold-500 transition-colors">
                                        {preview ? <img src={preview} alt={`팀 사진 ${index + 1}`} className="w-full h-full object-cover rounded-md" /> : <PlusIcon className="w-8 h-8" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">팀 이름</label>
                        <input id="teamName" type="text" value={teamData.teamName} onChange={e => setFormValue('teamName', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" required />
                    </div>
                     <TagSelector
                        availableTags={availableTags}
                        selectedTags={teamData.tagsTeam || []}
                        onTagToggle={handleTagToggle}
                        title="팀 특성 키워드"
                    />
                    <div>
                        <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">주요 활동 지역</label>
                        <input id="region" type="text" placeholder="예: 서울, 홍대" value={teamData.region} onChange={e => setFormValue('region', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                    <div>
                        <label htmlFor="teamDesc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">한 줄 소개</label>
                        <textarea id="teamDesc" rows={3} value={teamData.teamDescription} onChange={e => setFormValue('teamDescription', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                    <div>
                        <label htmlFor="teamYoutube" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube 채널 (선택)</label>
                        <input id="teamYoutube" type="url" placeholder="https://youtube.com/..." value={teamData.youtubeUrl} onChange={(e) => setFormValue('youtubeUrl', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                    <div>
                        <label htmlFor="teamInstagram" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram URL (선택)</label>
                        <input id="teamInstagram" type="url" placeholder="https://instagram.com/my_jazz_band" value={teamData.instagramUrl} onChange={(e) => setFormValue('instagramUrl', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>

                    {error && <p className="text-sm text-rose-500 text-center">{error}</p>}
                    
                    <button type="submit" disabled={isProcessing} className="w-full bg-jazz-blue-900 text-white font-bold py-3 rounded-lg hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400 mt-4">
                        {isProcessing ? '생성 중...' : '연주팀 생성하기'}
                    </button>
                </form>
            </main>
        </div>
    );
};

export default CreateTeamProfileView;
