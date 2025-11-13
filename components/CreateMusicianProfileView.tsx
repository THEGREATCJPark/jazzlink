
import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc, writeBatch, arrayRemove } from 'firebase/firestore';
import { User as FirebaseUser, updateProfile } from 'firebase/auth';
import { ViewType, Team, Musician } from '../types';
import CreateTeamModal from './CreateTeamModal';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ChevronLeftIcon from './icons/ChevronLeftIcon';

interface MusicianProfileEditorProps {
    currentUser: FirebaseUser | null;
    setCurrentView: (view: ViewType) => void;
    profileId?: string;
}

const skillLevels = {
    '초보': '연습한 곡 위주로 합주 가능',
    '중급': '대부분의 스탠다드 연주 가능',
    '프로': '공연 리딩 및 즉흥 연주 가능'
};

const availableInstruments = [
    '피아노', '키보드', '콘트라베이스', '일렉트릭베이스',
    '드럼', '기타', '보컬', '알토 색소폰', '테너 색소폰',
    '소프라노 색소폰', '바리톤 색소폰', '트럼펫', '트롬본',
    '클라리넷', '플루트', '바이올린', '비브라폰', '퍼커션'
];

const availableTags = [
    '스탠다드 선호', '모던 선호', '가요 편곡', '자작곡',
    '즉흥 연주 자신있음', '리딩 가능', '빅밴드 경험',
    '트리오 선호', '쿼텟 선호', '다양한 장르 가능', '펑키',
    '라틴', '발라드', '비밥', '하드밥', '스윙'
];

const TagSelector: React.FC<{
    availableTags: string[],
    selectedTags: string[],
    onTagToggle: (tag: string) => void,
    title: string
}> = ({ availableTags, selectedTags, onTagToggle, title }) => (
    <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
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

const CreateMusicianProfileView: React.FC<MusicianProfileEditorProps> = ({ currentUser, setCurrentView, profileId }) => {
    const isEditMode = !!profileId;
    
    // Wizard State
    const [step, setStep] = useState(1);
    const totalSteps = 6;

    // Form state
    const [formData, setFormData] = useState<Partial<Musician>>({
      name: '',
      instruments: [],
      tagsMusician: [],
      startYear: new Date().getFullYear(),
      skillLevel: '중급',
      profile: '',
      youtubeUrl: '',
      instagramUrl: '',
      teamId: '',
      photos: [],
    });
    const [instagramId, setInstagramId] = useState('');
    const [originalTeamId, setOriginalTeamId] = useState<string | undefined>(undefined);
    
    // Control state
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(isEditMode);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [showTeamCreateModal, setShowTeamCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    
    // Image upload state
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const setFormValue = <K extends keyof Musician>(key: K, value: Musician[K]) => {
      setFormData(prev => ({...prev, [key]: value}));
    };

    useEffect(() => {
      const fetchProfileData = async () => {
        if (!isEditMode || !db) return;
        setLoading(true);
        try {
          const docRef = doc(db, 'musicians', profileId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Musician;
            setFormData(data);
            setOriginalTeamId(data.teamId);
            if (data.instagramUrl) {
                setInstagramId(data.instagramUrl.split('/').pop() || '');
            }
            // Ensure photos is an array before spreading
            const photos = Array.isArray(data.photos) ? data.photos : [];
            setImagePreviews([...photos, null, null, null].slice(0, 3));

          } else {
            setError('프로필 정보를 불러올 수 없습니다.');
          }
        } catch (e) {
          setError('데이터 로딩 중 오류가 발생했습니다.');
          console.error(e);
        }
        setLoading(false);
      };

      fetchProfileData();
    }, [profileId, isEditMode]);
    
     useEffect(() => {
        if (!isEditMode && currentUser) {
           setFormValue('name', currentUser.displayName || '');
           const currentPreviews = [...imagePreviews];
           if (currentUser.photoURL) {
             currentPreviews[0] = currentUser.photoURL;
             setImagePreviews(currentPreviews);
           }
        }
    }, [currentUser, isEditMode]);


    useEffect(() => {
        const fetchTeams = async () => {
            if (!db) return;
            setLoadingTeams(true);
            try {
                const teamsSnapshot = await getDocs(collection(db, 'teams'));
                const teamsList = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
                setTeams(teamsList);
            } catch (error) {
                console.error("Error fetching teams: ", error);
            }
            setLoadingTeams(false);
        };
        fetchTeams();
    }, []);
    
    const handleTeamCreated = (newTeam: Team) => {
        const fullTeam = { ...newTeam, id: newTeam.id };
        setTeams(prev => [...prev, fullTeam]);
        setFormValue('teamId', fullTeam.id);
        setShowTeamCreateModal(false);
    }
    
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

    const handleTagToggle = (tag: string, type: 'instrument' | 'musicianTag') => {
        if (type === 'instrument') {
            const current = formData.instruments || [];
            const newInstruments = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
            setFormValue('instruments', newInstruments);
        } else {
            const current = formData.tagsMusician || [];
            const newTags = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
            setFormValue('tagsMusician', newTags);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!currentUser || !db || !storage) {
            setError('사용자 정보가 없거나 데이터베이스에 연결할 수 없습니다.');
            return;
        }
        if (!formData.name?.trim() || (formData.instruments || []).length === 0 || !formData.startYear) {
            setError('활동명, 연주 악기, 경력 시작 연도는 필수 항목입니다.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // 1. Upload photos
            setIsUploading(true);
            const photoURLs = await Promise.all(
                imagePreviews.map(async (preview, index) => {
                    const file = imageFiles[index];
                    if (file) { // New file to upload
                        const filePath = `profile_images/${currentUser.uid}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, filePath);
                        const uploadResult = await uploadBytes(storageRef, file);
                        return getDownloadURL(uploadResult.ref);
                    }
                    return preview; // Existing URL or null
                })
            );
            setIsUploading(false);

            const finalPhotos = photoURLs.filter((url): url is string => url !== null);
            if(finalPhotos.length === 0) {
                 finalPhotos.push(`https://ui-avatars.com/api/?name=${formData.name || '?'}&background=1A263A&color=FFC700&size=400`);
            }

            const musicianData = {
                ...formData,
                photos: finalPhotos,
                instagramUrl: instagramId ? `https://instagram.com/${instagramId.replace('@', '')}` : '',
                ownerUid: currentUser.uid,
            };

            // 2. Perform DB operations
            if (isEditMode) {
                 const batch = writeBatch(db);
                 const musicianDocRef = doc(db, 'musicians', profileId);
                 batch.update(musicianDocRef, musicianData);
                 
                 if (originalTeamId !== formData.teamId) {
                     if (originalTeamId) batch.update(doc(db, 'teams', originalTeamId), { members: arrayRemove(profileId) });
                     if (formData.teamId) batch.update(doc(db, 'teams', formData.teamId), { members: arrayUnion(profileId) });
                 }
                 await batch.commit();

            } else { // Create mode
                const newMusicianDocRef = await addDoc(collection(db, 'musicians'), musicianData);
                if (formData.teamId) await updateDoc(doc(db, 'teams', formData.teamId), { members: arrayUnion(newMusicianDocRef.id) });
            }
            
            // 3. Update user's main profile in 'users' and auth
            await updateDoc(doc(db, 'users', currentUser.uid), { name: formData.name, photo: finalPhotos[0] });
            await updateProfile(currentUser, { displayName: formData.name, photoURL: finalPhotos[0] });
            
            alert(`프로필이 성공적으로 ${isEditMode ? '수정' : '생성'}되었습니다!`);
            setCurrentView('프로필');

        } catch (e: any) {
            console.error("Error saving musician profile:", e);
            setError(`프로필 저장 중 오류가 발생했습니다: ${e.message}`);
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };
    
    if (loading) {
        return <div className="p-6 text-center text-gray-500">프로필 정보를 불러오는 중...</div>;
    }
    
    const isProcessing = isSubmitting || isUploading;

    if(isEditMode) {
        // RENDER EDIT FORM
        return (
            <div className="p-6 animate-fade-in bg-white">
            <form onSubmit={handleSubmit} className="space-y-8">
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📸 프로필 사진 (최대 3장)</label>
                    <div className="grid grid-cols-3 gap-4">
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="aspect-square">
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} ref={fileInputRefs[index]} className="hidden" />
                                <button type="button" onClick={() => fileInputRefs[index].current?.click()} className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-jazz-blue-900 hover:text-jazz-blue-900 transition-colors">
                                    {preview ? (
                                        <img src={preview} alt={`프로필 ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" /></svg>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">👤 활동명</label>
                    <input id="name" type="text" placeholder="예: Count Basie" value={formData.name || ''} onChange={(e) => setFormValue('name', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                
                 <TagSelector availableTags={availableInstruments} selectedTags={formData.instruments || []} onTagToggle={(tag) => handleTagToggle(tag, 'instrument')} title="🎸 연주 악기 (다중 선택 가능)" />
                
                <div>
                    <label htmlFor="startYear" className="block text-sm font-medium text-gray-700 mb-1">🗓️ 경력 시작 연도</label>
                    <select id="startYear" value={formData.startYear} onChange={(e) => setFormValue('startYear', parseInt(e.target.value))} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900">
                       {Array.from({ length: 70 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}년</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">🏆 실력</label>
                    <div className="space-y-2">
                        {Object.entries(skillLevels).map(([level, desc]) => (
                            <label key={level} className="flex items-center p-3 bg-white rounded-md border border-gray-300 cursor-pointer">
                                <input type="radio" name="skillLevel" value={level} checked={formData.skillLevel === level} onChange={() => setFormValue('skillLevel', level as any)} className="h-4 w-4 text-jazz-blue-900 bg-gray-100 border-gray-300 focus:ring-jazz-blue-900" />
                                <span className="ml-3 text-sm text-gray-700">{desc}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <TagSelector availableTags={availableTags} selectedTags={formData.tagsMusician || []} onTagToggle={(tag) => handleTagToggle(tag, 'musicianTag')} title="✨ 나를 표현하는 키워드" />

                <div>
                    <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">🎺 소속 연주팀 (선택)</label>
                    <select id="team" value={formData.teamId} onChange={(e) => e.target.value === 'create_new' ? setShowTeamCreateModal(true) : setFormValue('teamId', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900">
                        <option value="">소속팀 없음</option>
                        {teams.map(team => <option key={team.id} value={team.id}>{team.teamName}</option>)}
                        <option value="create_new" className="text-jazz-blue-900 font-bold">-- 새 연주팀 생성 --</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-1">📺 YouTube 채널 주소 (선택)</label>
                    <input id="youtube" type="text" placeholder="https://youtube.com/channel/..." value={formData.youtubeUrl} onChange={(e) => setFormValue('youtubeUrl', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                <div>
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">🖼️ Instagram ID (선택)</label>
                    <div className="flex items-center">
                        <span className="inline-block bg-gray-200 p-3 rounded-l-md border border-r-0 border-gray-300 text-gray-500">@</span>
                        <input id="instagram" type="text" placeholder="jazzlink_official" value={instagramId} onChange={(e) => setInstagramId(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-r-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                </div>
                <div>
                    <label htmlFor="profile" className="block text-sm font-medium text-gray-700 mb-1">📝 한 줄 소개 (선택)</label>
                    <textarea id="profile" placeholder="자신을 자유롭게 표현해보세요!" rows={3} value={formData.profile} onChange={(e) => setFormValue('profile', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900"></textarea>
                </div>
                
                {error && <p className="text-sm text-rose-500">{error}</p>}

                <button type="submit" disabled={isProcessing} className="w-full bg-jazz-blue-900 text-white font-bold py-3 rounded-md hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-6">
                    {isUploading ? '이미지 업로드 중...' : isSubmitting ? '수정 중...' : '프로필 수정하기'}
                </button>
            </form>

            {showTeamCreateModal && <CreateTeamModal onClose={() => setShowTeamCreateModal(false)} onTeamCreated={handleTeamCreated} currentUser={currentUser}/>}
        </div>
        );
    }
    
    // RENDER CREATE WIZARD
    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));
    const isLastStep = step === totalSteps;

    const wizardHeader = (
        <div className="p-4 flex items-center border-b border-gray-200">
            <button onClick={step === 1 ? () => setCurrentView('MY') : prevStep} className="p-2 rounded-full hover:bg-gray-100">
                <ChevronLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex-grow mx-4 h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-jazz-blue-900 rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
            </div>
            <button onClick={() => setCurrentView('MY')} className="text-sm font-semibold text-gray-600 hover:text-gray-900">나가기</button>
        </div>
    );
    
    return (
        <div className="bg-white min-h-screen flex flex-col">
            {wizardHeader}
            <div className="flex-grow p-6 flex flex-col">
                <div className="flex-grow">
                    {step === 1 && (
                        <div className="text-center flex flex-col items-center">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">프로필 사진과 활동명을<br/>설정해주세요.</h2>
                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 0)} ref={fileInputRefs[0]} className="hidden" />
                             <button type="button" onClick={() => fileInputRefs[0].current?.click()} className="w-32 h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400 hover:border-jazz-blue-900 hover:text-jazz-blue-900 transition-colors mb-6">
                                {imagePreviews[0] ? (
                                    <img src={imagePreviews[0]} alt="프로필" className="w-full h-full object-cover rounded-full" />
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                )}
                            </button>
                            <input type="text" placeholder="활동명 입력" value={formData.name} onChange={e => setFormValue('name', e.target.value)} className="w-full max-w-sm text-center bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                        </div>
                    )}
                    {step === 2 && <TagSelector availableTags={availableInstruments} selectedTags={formData.instruments || []} onTagToggle={(tag) => handleTagToggle(tag, 'instrument')} title="연주할 수 있는 악기를 모두 선택해주세요." />}
                    {step === 3 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">언제부터 연주를 시작했고,<br/>현재 실력은 어느 정도인가요?</h2>
                            <div className="mb-6">
                                <label htmlFor="startYear" className="block text-sm font-medium text-gray-700 mb-1">경력 시작 연도</label>
                                 <select id="startYear" value={formData.startYear} onChange={(e) => setFormValue('startYear', parseInt(e.target.value))} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900">
                                   {Array.from({ length: 70 }, (_, i) => new Date().getFullYear() - i).map(year => <option key={year} value={year}>{year}년</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">실력</label>
                                <div className="space-y-3">
                                    {Object.entries(skillLevels).map(([level, desc]) => (
                                        <label key={level} className={`flex items-start p-4 rounded-lg border cursor-pointer transition-colors ${formData.skillLevel === level ? 'bg-blue-50 border-jazz-blue-900' : 'bg-white border-gray-300 hover:bg-gray-50'}`}>
                                            <input type="radio" name="skillLevel" value={level} checked={formData.skillLevel === level} onChange={() => setFormValue('skillLevel', level as any)} className="h-5 w-5 mt-0.5 text-jazz-blue-900 border-gray-300 focus:ring-jazz-blue-900" />
                                            <span className="ml-3 text-sm flex flex-col">
                                              <span className="font-bold text-gray-800">{level}</span>
                                              <span className="text-gray-600">{desc}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {step === 4 && <TagSelector availableTags={availableTags} selectedTags={formData.tagsMusician || []} onTagToggle={(tag) => handleTagToggle(tag, 'musicianTag')} title="자신을 가장 잘 표현하는 키워드를 골라주세요." />}
                    {step === 5 && (
                        <div>
                             <h2 className="text-2xl font-bold text-gray-800 mb-4">소속된 팀이나 활동 중인<br/>소셜 미디어가 있나요? (선택)</h2>
                             <div className="space-y-6">
                                <div>
                                    <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">소속 연주팀</label>
                                    <select id="team" value={formData.teamId} onChange={(e) => e.target.value === 'create_new' ? setShowTeamCreateModal(true) : setFormValue('teamId', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900">
                                        <option value="">소속팀 없음</option>
                                        {teams.map(team => <option key={team.id} value={team.id}>{team.teamName}</option>)}
                                        <option value="create_new" className="text-jazz-blue-900 font-bold">-- 새 연주팀 생성 --</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 mb-1">YouTube 채널 주소</label>
                                    <input id="youtube" type="text" placeholder="https://youtube.com/channel/..." value={formData.youtubeUrl} onChange={(e) => setFormValue('youtubeUrl', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                                </div>
                                <div>
                                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">Instagram ID</label>
                                    <div className="flex items-center">
                                        <span className="inline-block bg-gray-200 p-3 rounded-l-md border border-r-0 border-gray-300 text-gray-500">@</span>
                                        <input id="instagram" type="text" placeholder="jazzlink_official" value={instagramId} onChange={(e) => setInstagramId(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-r-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                    {step === 6 && (
                        <div>
                             <h2 className="text-2xl font-bold text-gray-800 mb-4">마지막이에요!<br/>자신을 한 줄로 소개해주세요. (선택)</h2>
                              <textarea id="profile" placeholder="자신을 자유롭게 표현해보세요!" rows={5} value={formData.profile} onChange={(e) => setFormValue('profile', e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900"></textarea>
                        </div>
                    )}
                </div>
                
                <div className="mt-8">
                     {error && <p className="text-sm text-rose-500 mb-4 text-center">{error}</p>}
                     <button 
                        type="button" 
                        onClick={isLastStep ? () => handleSubmit() : nextStep} 
                        disabled={isProcessing}
                        className="w-full bg-jazz-blue-900 text-white font-bold py-3 px-4 rounded-lg hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400"
                     >
                        {isProcessing ? '저장 중...' : (isLastStep ? '완료' : '다음')}
                    </button>
                </div>
            </div>
            {showTeamCreateModal && <CreateTeamModal onClose={() => setShowTeamCreateModal(false)} onTeamCreated={handleTeamCreated} currentUser={currentUser}/>}
        </div>
    );
};

export default CreateMusicianProfileView;