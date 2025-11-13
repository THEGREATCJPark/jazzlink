import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser, updateProfile } from 'firebase/auth';
import { ViewType, Venue } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import PlusIcon from './icons/PlusIcon';

interface CreateVenueProfileViewProps {
    currentUser: FirebaseUser | null;
    setCurrentView: (view: ViewType) => void;
}

const availableTags = [
    '라이브', '스탠다드', '모던', '비밥', '퓨전', '펑크', 
    '보컬 위주', '연주 위주', '칵테일', '위스키', '와인',
    '식사 가능', '분위기 좋은', '데이트 코스', '단체석'
];

const TagSelector: React.FC<{
    availableTags: string[],
    selectedTags: string[],
    onTagToggle: (tag: string) => void,
    title: string
}> = ({ availableTags, selectedTags, onTagToggle, title }) => (
    <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">{title}</h2>
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
                                ? 'bg-jazz-blue-900 text-white border-jazz-blue-900 dark:bg-jazz-gold-500 dark:text-jazz-blue-900 dark:border-jazz-gold-500'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-jazz-blue-900 dark:bg-jazz-blue-800 dark:text-gray-300 dark:border-jazz-blue-600 dark:hover:border-jazz-gold-500'
                        }`}
                    >
                        {tag}
                    </button>
                )
            })}
        </div>
    </div>
);


const CreateVenueProfileView: React.FC<CreateVenueProfileViewProps> = ({ currentUser, setCurrentView }) => {
    const [step, setStep] = useState(1);
    const totalSteps = 5;

    const [formData, setFormData] = useState<Partial<Venue>>({
        name: '',
        address: '',
        operatingHours: '',
        naverMapsUrl: '',
        instagramUrl: '',
        youtubeUrl: '',
        description: '',
        tagsVenue: [],
        photos: [],
    });
    const [instagramId, setInstagramId] = useState('');
    
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const setFormValue = <K extends keyof Venue>(key: K, value: Venue[K]) => {
      setFormData(prev => ({...prev, [key]: value}));
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

    const handleTagToggle = (tag: string) => {
        const current = formData.tagsVenue || [];
        const newTags = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
        setFormValue('tagsVenue', newTags);
    };

    const handleSubmit = async () => {
        if (!currentUser || !db || !storage) return setError('사용자 정보가 없거나 데이터베이스에 연결할 수 없습니다.');
        if (!formData.name?.trim() || !formData.address?.trim()) return setError('재즈바 이름과 주소는 필수 항목입니다.');

        setIsSubmitting(true);
        setError('');

        try {
            const photoURLs = await Promise.all(
                imageFiles.map(async (file, index) => {
                    if (file) {
                        const filePath = `venue_images/${currentUser.uid}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, filePath);
                        await uploadBytes(storageRef, file);
                        return getDownloadURL(storageRef);
                    }
                    return imagePreviews[index];
                })
            );
            const finalPhotos = photoURLs.filter((url): url is string => !!url);
             if(finalPhotos.length === 0) {
                 finalPhotos.push(`https://ui-avatars.com/api/?name=${formData.name}&background=1A263A&color=FFC700&size=400`);
            }

            const venueData: Omit<Venue, 'id' | 'schedule' | 'totalRating' | 'ratingCount'> = {
                ...formData,
                name: formData.name!,
                address: formData.address!,
                description: formData.description || '',
                tagsVenue: formData.tagsVenue || [],
                ownerUid: currentUser.uid,
                photos: finalPhotos,
                instagramUrl: instagramId ? `https://instagram.com/${instagramId.replace('@', '')}` : '',
                naverMapsUrl: formData.naverMapsUrl || '',
                operatingHours: formData.operatingHours || '',
                youtubeUrl: formData.youtubeUrl || '',
                coordinates: { lat: 0, lng: 0 }, // TODO: Implement geocoding from address
            };

            await addDoc(collection(db, 'venues'), venueData);
            
            // Update user's main profile in 'users' and auth if needed
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userUpdateData: { name?: string, photo?: string } = {};
            let shouldUpdateAuth = false;

            if (!currentUser.displayName) {
                userUpdateData.name = formData.name;
                shouldUpdateAuth = true;
            }
             if (!currentUser.photoURL) {
                userUpdateData.photo = finalPhotos[0];
                shouldUpdateAuth = true;
            }
            
            if (Object.keys(userUpdateData).length > 0) {
                 await updateDoc(userDocRef, userUpdateData);
            }
            if (shouldUpdateAuth) {
                await updateProfile(currentUser, { displayName: userUpdateData.name, photoURL: userUpdateData.photo });
            }

            alert('재즈바 프로필이 성공적으로 생성되었습니다!');
            setCurrentView('프로필');

        } catch (e: any) {
            console.error("Error saving venue profile:", e);
            setError(`프로필 저장 중 오류가 발생했습니다: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));
    const isLastStep = step === totalSteps;

    const wizardHeader = (
        <div className="p-4 flex items-center border-b border-gray-200 dark:border-jazz-blue-700 sticky top-0 bg-white dark:bg-jazz-blue-900 z-10">
            <button onClick={step === 1 ? () => setCurrentView('설정') : prevStep} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-jazz-blue-800">
                <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="flex-grow mx-4 h-2 bg-gray-200 dark:bg-jazz-blue-700 rounded-full">
                <div className="h-2 bg-jazz-blue-900 dark:bg-jazz-gold-500 rounded-full transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
            </div>
            <button onClick={() => setCurrentView('설정')} className="text-sm font-semibold text-gray-600 dark:text-jazz-gray-300 hover:text-gray-900 dark:hover:text-white">나가기</button>
        </div>
    );

    return (
        <div className="bg-white dark:bg-jazz-blue-900 min-h-screen flex flex-col">
            {wizardHeader}
            <div className="flex-grow p-6 flex flex-col">
                <div className="flex-grow">
                     {step === 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">재즈바 이름과<br/>프로필 사진을 등록해주세요.</h2>
                            <div className="mb-6">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">재즈바 이름</label>
                                <input id="name" type="text" placeholder="예: 블루노트 서울" value={formData.name} onChange={e => setFormValue('name', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">프로필 사진 (최대 3장)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="aspect-square">
                                            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} ref={fileInputRefs[index]} className="hidden" />
                                            <button type="button" onClick={() => fileInputRefs[index].current?.click()} className="w-full h-full bg-gray-100 dark:bg-jazz-blue-800 border-2 border-dashed border-gray-300 dark:border-jazz-blue-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-jazz-gray-500 hover:border-jazz-blue-900 dark:hover:border-jazz-gold-500 transition-colors">
                                                {preview ? <img src={preview} alt={`프로필 ${index + 1}`} className="w-full h-full object-cover rounded-md" /> : <PlusIcon className="w-8 h-8" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                     {step === 2 && <TagSelector availableTags={availableTags} selectedTags={formData.tagsVenue || []} onTagToggle={handleTagToggle} title="어떤 키워드가 당신의 재즈바를 잘 표현하나요?" />}
                     {step === 3 && (
                        <div>
                             <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">재즈바의 기본 정보를<br/>입력해주세요.</h2>
                             <div className="space-y-6">
                                <div>
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">주소</label>
                                    <input id="address" type="text" placeholder="예: 서울시 강남구" value={formData.address} onChange={e => setFormValue('address', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                                </div>
                                <div>
                                    <label htmlFor="operatingHours" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">영업 시간</label>
                                    <input id="operatingHours" type="text" placeholder="예: 매일 18:00 - 02:00" value={formData.operatingHours} onChange={e => setFormValue('operatingHours', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                                </div>
                                <div>
                                    <label htmlFor="naverMapsUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">네이버 지도 링크</label>
                                    <input id="naverMapsUrl" type="url" placeholder="https://map.naver.com/p/..." value={formData.naverMapsUrl} onChange={e => setFormValue('naverMapsUrl', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                                </div>
                             </div>
                        </div>
                    )}
                     {step === 4 && (
                        <div>
                             <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">운영 중인 소셜 미디어가<br/>있다면 알려주세요. (선택)</h2>
                             <div className="space-y-6">
                                <div>
                                    <label htmlFor="youtube" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">YouTube 채널 주소</label>
                                    <input id="youtube" type="url" placeholder="https://youtube.com/channel/..." value={formData.youtubeUrl} onChange={(e) => setFormValue('youtubeUrl', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                                </div>
                                <div>
                                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram ID</label>
                                    <div className="flex items-center">
                                        <span className="inline-block bg-gray-200 dark:bg-jazz-blue-700 p-3 rounded-l-md border border-r-0 border-gray-300 dark:border-jazz-blue-600 text-gray-500 dark:text-jazz-gray-300">@</span>
                                        <input id="instagram" type="text" placeholder="allthatjazz_club" value={instagramId} onChange={(e) => setInstagramId(e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-r-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                     {step === 5 && (
                        <div>
                             <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">마지막이에요!<br/>재즈바를 한 줄로 소개해주세요. (선택)</h2>
                              <textarea id="profile" placeholder="정통 뉴욕 재즈의 감성을 느낄 수 있는 공간입니다." rows={5} value={formData.description} onChange={(e) => setFormValue('description', e.target.value)} className="w-full bg-gray-50 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 focus:ring-jazz-blue-900 focus:border-jazz-blue-900"></textarea>
                        </div>
                    )}
                </div>
                 <div className="mt-8">
                     {error && <p className="text-sm text-rose-500 mb-4 text-center">{error}</p>}
                     <button 
                        type="button" 
                        onClick={isLastStep ? handleSubmit : nextStep} 
                        disabled={isSubmitting}
                        className="w-full bg-jazz-blue-900 text-white font-bold py-3 px-4 rounded-lg hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400 dark:bg-jazz-gold-500 dark:text-jazz-blue-900 dark:hover:bg-jazz-gold-600 dark:disabled:bg-jazz-gray-500"
                     >
                        {isSubmitting ? '저장 중...' : (isLastStep ? '완료' : '다음')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateVenueProfileView;
