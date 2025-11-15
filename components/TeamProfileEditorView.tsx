import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User as FirebaseUser } from 'firebase/auth';
import { ViewType, Team, TeamMember, Musician } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import LeaderIcon from './icons/LeaderIcon';
import SearchIcon from './icons/SearchIcon';

interface TeamProfileEditorViewProps {
    currentUser: FirebaseUser | null;
    setCurrentView: (view: ViewType) => void;
    profileId?: string;
}

const availableInstruments = [
    '피아노', '키보드', '콘트라베이스', '일렉트릭베이스',
    '드럼', '기타', '보컬', '알토 색소폰', '테너 색소폰',
    '소프라노 색소폰', '바리톤 색소폰', '트럼펫', '트롬본',
    '클라리넷', '플루트', '바이올린', '비브라폰', '퍼커션'
];


const TeamProfileEditorView: React.FC<TeamProfileEditorViewProps> = ({ currentUser, setCurrentView, profileId }) => {
    const isEditMode = !!profileId;
    
    const [teamData, setTeamData] = useState<Partial<Omit<Team, 'members'>>>({});
    const [members, setMembers] = useState<TeamMember[]>([]);
    
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    const [loading, setLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');

    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [allMusicians, setAllMusicians] = useState<Musician[]>([]);
    
    useEffect(() => {
        const fetchAllMusicians = async () => {
            if (!db) return;
            try {
                const musiciansSnapshot = await getDocs(collection(db, 'musicians'));
                const musiciansList = musiciansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Musician));
                setAllMusicians(musiciansList);
            } catch (e) {
                console.error("Failed to fetch musicians", e);
            }
        };

        const fetchTeamData = async () => {
            if (!isEditMode || !db || !profileId) return;
            setLoading(true);
            try {
                const teamDoc = await getDoc(doc(db, 'teams', profileId));
                if (teamDoc.exists()) {
                    const data = teamDoc.data() as Team;
                    const { members, ...rest } = data;
                    setTeamData(rest);
                    setMembers(members || []);
                    const photos = Array.isArray(data.teamPhotos) ? data.teamPhotos : [];
                    setImagePreviews([...photos, null, null].slice(0, 3));
                } else {
                    setError('팀 정보를 찾을 수 없습니다.');
                }
            } catch (e) {
                console.error("Failed to fetch team data", e);
                setError('팀 정보를 불러오는 데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllMusicians();
        fetchTeamData();
    }, [isEditMode, profileId]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTeamData(prev => ({ ...prev, [name]: value }));
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

    const addMember = (member: TeamMember) => {
        setMembers(prev => [...prev, member]);
    };

    const removeMember = (index: number) => {
        setMembers(prev => prev.filter((_, i) => i !== index));
    };

    const setLeader = (index: number) => {
        setMembers(prev => prev.map((member, i) => ({
            ...member,
            isLeader: i === index
        })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !db || !storage) {
            setError('사용자 정보가 없거나 데이터베이스에 연결할 수 없습니다.');
            return;
        }
        if (!teamData.teamName?.trim()) {
            setError('팀 이름은 필수 항목입니다.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            setIsUploading(true);
            const photoURLs = await Promise.all(
                imagePreviews.map(async (preview, index) => {
                    const file = imageFiles[index];
                    if (file) {
                        const filePath = `team_images/${currentUser.uid}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, filePath);
                        const uploadResult = await uploadBytes(storageRef, file);
                        return getDownloadURL(uploadResult.ref);
                    }
                    return preview; 
                })
            );
            setIsUploading(false);

            const finalPhotos = photoURLs.filter((url): url is string => url !== null);
            if (finalPhotos.length === 0 && teamData.teamName) {
                const nameForAvatar = teamData.teamName;
                finalPhotos.push(`https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=1A263A&color=FFC700&size=400`);
            }
            
            const finalTeamData = {
                ...teamData,
                teamPhotos: finalPhotos,
                ownerUid: (isEditMode && teamData.ownerUid) ? teamData.ownerUid : currentUser.uid,
                members: members,
            };

            if (isEditMode && profileId) {
                await updateDoc(doc(db, 'teams', profileId), finalTeamData);
                alert('연주팀 정보가 수정되었습니다!');
            } else {
                await addDoc(collection(db, 'teams'), finalTeamData);
                alert('연주팀이 성공적으로 생성되었습니다!');
            }
            
            setCurrentView('프로필');

        } catch (err: any) {
            console.error("Error saving team profile:", err);
            
            let errorMessage = '프로필 저장 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
            const errStr = (err.message || err.toString() || '').toLowerCase();

            if (errStr.includes('network') || errStr.includes('cors') || err.code === 'storage/unknown') {
                errorMessage = '이미지 업로드에 실패했습니다. Firebase Storage의 CORS 설정이 올바르게 구성되었는지 확인해주세요. 개발자 콘솔(F12)의 네트워크 탭에서 CORS 관련 오류 메시지를 확인할 수 있습니다.';
            } else if (err.code) {
                 switch (err.code) {
                    case 'storage/unauthorized':
                        errorMessage = '이미지 업로드 권한이 없습니다. Firebase Storage의 보안 규칙을 확인해주세요. `team_images` 경로에 대한 쓰기 권한이 필요합니다.';
                        break;
                    case 'storage/object-not-found':
                    case 'storage/project-not-found':
                    case 'storage/bucket-not-found':
                        errorMessage = '이미지를 저장할 수 없습니다. Firebase 콘솔에서 Storage가 활성화되어 있는지 확인해주세요.';
                        break;
                    default:
                         errorMessage = `프로필 저장 중 오류가 발생했습니다: ${err.message} (오류 코드: ${err.code})`;
                }
            } else if (err.message) {
                errorMessage = `프로필 저장 중 오류가 발생했습니다: ${err.message}`;
            }
            
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-500 dark:text-jazz-gray-400">로딩 중...</div>;
    }
    
    const isProcessing = isSubmitting || isUploading;

    return (
        <div className="bg-white dark:bg-jazz-blue-900 min-h-screen flex flex-col">
            <header className="flex-shrink-0 flex items-center p-4 border-b border-gray-200 dark:border-jazz-blue-700 h-16">
                 <button onClick={() => setCurrentView('프로필')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-jazz-blue-800">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-xl font-bold text-jazz-blue-900 dark:text-white mx-auto">{isEditMode ? '연주팀 프로필 수정' : '새 연주팀 만들기'}</h1>
                 <div className="w-8"></div>
            </header>
            <main className="flex-grow p-6 overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                         <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">팀 이름</label>
                        <input id="teamName" name="teamName" type="text" value={teamData.teamName || ''} onChange={handleFormChange} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" required />
                    </div>
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
                         <p className="text-xs text-gray-500 mt-2">사진은 1:1 비율로 표시됩니다.</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">멤버</h3>
                            <button type="button" onClick={() => setIsAddMemberModalOpen(true)} className="bg-gray-200 text-gray-800 text-sm font-bold py-1 px-3 rounded-full hover:bg-gray-300 dark:bg-jazz-blue-700 dark:text-gray-200 dark:hover:bg-jazz-blue-600">+ 멤버 추가</button>
                        </div>
                        {members.length > 0 ? members.map((member, index) => (
                            <div key={index} className="flex items-center bg-gray-50 dark:bg-jazz-blue-800 p-2 rounded-lg">
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{member.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-jazz-gray-400">{member.instrument}</p>
                                </div>
                                <button type="button" onClick={() => setLeader(index)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-jazz-blue-700" aria-label="리더로 지정">
                                    <LeaderIcon className={`w-6 h-6 ${member.isLeader ? 'text-jazz-gold-500' : 'text-gray-400'}`} filled={member.isLeader} />
                                </button>
                                <button type="button" onClick={() => removeMember(index)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-jazz-blue-700" aria-label="멤버 삭제">
                                    <TrashIcon className="w-5 h-5 text-rose-500" />
                                </button>
                            </div>
                        )) : <p className="text-sm text-center text-gray-500 dark:text-jazz-gray-400 py-2">아직 추가된 멤버가 없습니다.</p>}
                    </div>

                    <div>
                        <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">한 줄 소개</label>
                        <textarea id="teamDescription" name="teamDescription" rows={3} value={teamData.teamDescription || ''} onChange={handleFormChange} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                     <div>
                        <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">주요 활동 지역</label>
                        <input id="region" name="region" type="text" placeholder="예: 서울, 홍대" value={teamData.region || ''} onChange={handleFormChange} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                    
                    {error && <p className="text-sm text-rose-500 text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-md">{error}</p>}
                    
                    <button type="submit" disabled={isProcessing} className="w-full bg-jazz-blue-900 text-white font-bold py-3 rounded-lg hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400 mt-4 dark:bg-jazz-gold-500 dark:text-jazz-blue-900 dark:hover:bg-jazz-gold-600">
                        {isUploading ? '이미지 업로드 중...' : isSubmitting ? '저장 중...' : (isEditMode ? '수정 완료' : '생성 완료')}
                    </button>
                </form>
            </main>
            {isAddMemberModalOpen && (
                <AddMemberModal
                    onClose={() => setIsAddMemberModalOpen(false)}
                    onAddMember={addMember}
                    existingMembers={members}
                    allMusicians={allMusicians}
                />
            )}
        </div>
    );
};

const AddMemberModal: React.FC<{
    onClose: () => void;
    onAddMember: (member: TeamMember) => void;
    existingMembers: TeamMember[];
    allMusicians: Musician[];
}> = ({ onClose, onAddMember, existingMembers, allMusicians }) => {
    const [mode, setMode] = useState<'search' | 'direct'>('search');
    const [searchQuery, setSearchQuery] = useState('');
    const [directName, setDirectName] = useState('');
    const [directInstrument, setDirectInstrument] = useState('');

    const filteredMusicians = useMemo(() => {
        if (!searchQuery) return [];
        return allMusicians.filter(m => 
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !existingMembers.some(em => em.musicianId === m.id)
        );
    }, [searchQuery, allMusicians, existingMembers]);

    const handleAddFromSearch = (musician: Musician) => {
        onAddMember({
            name: musician.name,
            instrument: (musician.instruments && musician.instruments[0]) || '악기',
            musicianId: musician.id,
            ownerUid: musician.ownerUid
        });
        onClose();
    };

    const handleAddDirect = () => {
        if (!directName.trim() || !directInstrument.trim()) return;
        onAddMember({
            name: directName,
            instrument: directInstrument
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white dark:bg-jazz-blue-800 rounded-lg max-w-sm w-full mx-4 p-5">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">멤버 추가</h3>
                <div className="flex bg-gray-200 dark:bg-jazz-blue-900 rounded-full p-1 mb-4">
                    <button onClick={() => setMode('search')} className={`w-1/2 py-1.5 text-sm font-bold rounded-full ${mode==='search' ? 'bg-white dark:bg-jazz-blue-700 shadow text-jazz-blue-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>뮤지션 검색</button>
                    <button onClick={() => setMode('direct')} className={`w-1/2 py-1.5 text-sm font-bold rounded-full ${mode==='direct' ? 'bg-white dark:bg-jazz-blue-700 shadow text-jazz-blue-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>직접 입력</button>
                </div>

                {mode === 'search' ? (
                    <div>
                        <div className="relative">
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="뮤지션 이름 검색..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-jazz-blue-700 bg-white dark:bg-jazz-blue-800 text-gray-800 dark:text-gray-200 rounded-full"/>
                            <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                        </div>
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                            {filteredMusicians.map(m => (
                                <button key={m.id} onClick={() => handleAddFromSearch(m)} className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-jazz-blue-700 rounded-md">
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">{m.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-jazz-gray-400">{(m.instruments || []).join(', ')}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <input type="text" value={directName} onChange={e => setDirectName(e.target.value)} placeholder="활동명" className="w-full p-2 border border-gray-300 dark:border-jazz-blue-700 bg-white dark:bg-jazz-blue-800 rounded"/>
                        <select value={directInstrument} onChange={e => setDirectInstrument(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-jazz-blue-700 bg-white dark:bg-jazz-blue-800 rounded">
                           <option value="">악기 선택</option>
                           {availableInstruments.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                        </select>
                        <button onClick={handleAddDirect} className="w-full bg-jazz-blue-900 text-white font-bold py-2 rounded-md dark:bg-jazz-gold-500 dark:text-jazz-blue-900">추가</button>
                    </div>
                )}
                <button onClick={onClose} className="w-full mt-4 text-center text-sm text-gray-500 dark:text-jazz-gray-400">닫기</button>
            </div>
        </div>
    );
};


export default TeamProfileEditorView;