

import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebase/config';
import { doc, getDoc, updateDoc, collection, getDocs, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore';
import { User as FirebaseUser, updateProfile } from 'firebase/auth';
import { ViewType, Musician, Venue, User as UserType, Team } from '../types';
import CreateTeamModal from './CreateTeamModal';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';


interface EditViewProps {
    currentUser: FirebaseUser | null;
    setCurrentView: (view: ViewType) => void;
}

// General User Profile Editor
export const EditGeneralProfileView: React.FC<EditViewProps & { userId: string }> = ({ userId, currentUser, setCurrentView }) => {
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (!db || !currentUser) return;
        setName(currentUser.displayName || '');
        setImagePreview(currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}&background=121B2D&color=FFC700`);
    }, [userId, currentUser]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            }
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !db || !storage) return;
        setIsSubmitting(true);
        setError('');

        try {
            let newPhotoURL = currentUser.photoURL;
            if (imageFile) {
                setIsUploading(true);
                const filePath = `profile_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`;
                const storageRef = ref(storage, filePath);
                const uploadResult = await uploadBytes(storageRef, imageFile);
                newPhotoURL = await getDownloadURL(uploadResult.ref);
                setIsUploading(false);
            }
            
            await updateProfile(currentUser, { displayName: name, photoURL: newPhotoURL });
            await updateDoc(doc(db, 'users', userId), { name, photo: newPhotoURL });

            alert('프로필이 업데이트되었습니다.');
            setCurrentView('MY');
        } catch (err: any) {
            console.error("Error updating general profile:", err.message, err.code);
            let errorMessage = '프로필 업데이트에 실패했습니다. 다시 시도해주세요.';
            if (err.code) {
                switch (err.code) {
                    case 'storage/unauthorized':
                        errorMessage = '이미지 업로드 권한이 없습니다. Firebase Storage의 보안 규칙과 CORS 설정을 확인해주세요.';
                        break;
                    case 'storage/object-not-found':
                    case 'storage/project-not-found':
                    case 'storage/bucket-not-found':
                        errorMessage = '이미지를 저장할 수 없습니다. Firebase 콘솔에서 Storage가 활성화되어 있는지 확인해주세요.';
                        break;
                    default:
                        errorMessage = `프로필 저장 중 오류가 발생했습니다. 브라우저 개발자 콘솔(F12)을 확인해주세요. (${err.code})`;
                }
            } else {
                errorMessage = `프로필 저장 중 알 수 없는 오류가 발생했습니다. 브라우저 개발자 콘솔(F12)을 확인해주세요.`;
            }
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };
    
    const isProcessing = isSubmitting || isUploading;

    return (
        <div className="p-6 bg-white">
            <h3 className="text-xl font-bold text-gray-800 mb-4">기본 프로필 수정</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">프로필 사진</label>
                    <div className="flex items-center space-x-4">
                        <img src={imagePreview || ''} alt="프로필 미리보기" className="w-20 h-20 rounded-full object-cover bg-gray-200 border-2 border-gray-300" />
                        <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300">
                            이미지 변경
                        </button>
                    </div>
                </div>
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">활동명</label>
                    <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                {error && <p className="text-rose-500 text-sm">{error}</p>}
                <button type="submit" disabled={isProcessing} className="w-full bg-jazz-blue-900 text-white font-bold py-3 rounded-md hover:bg-jazz-blue-800 disabled:bg-gray-400">
                    {isProcessing ? '저장 중...' : '저장하기'}
                </button>
            </form>
        </div>
    );
};


// Venue Profile Editor
export const EditVenueProfileView: React.FC<EditViewProps & { profileId: string }> = ({ profileId, setCurrentView, currentUser }) => {
    const [formData, setFormData] = useState<Partial<Venue>>({ name: '', address: '', description: '', tagsVenue: [], naverMapsUrl: '' });
    const [instagramId, setInstagramId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const fetchVenue = async () => {
            const docRef = doc(db, 'venues', profileId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Venue;
                setFormData(data);
                if (data.instagramUrl) {
                    setInstagramId(data.instagramUrl.split('/').pop() || '');
                }
                const photos = Array.isArray(data.photos) ? data.photos : [];
                setImagePreviews([...photos, null, null, null].slice(0, 3));
            } else {
                setError("프로필을 찾을 수 없습니다.");
            }
            setLoading(false);
        };
        fetchVenue();
    }, [profileId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, tagsVenue: tags }));
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !storage || !currentUser) {
            setError('데이터베이스에 연결할 수 없습니다.');
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
                        const filePath = `venue_images/${profileId}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, filePath);
                        const uploadResult = await uploadBytes(storageRef, file);
                        return getDownloadURL(uploadResult.ref);
                    }
                    return preview;
                })
            );
            setIsUploading(false);

            const finalPhotos = photoURLs.filter((url): url is string => !!url);
            
            const docRef = doc(db, 'venues', profileId);
            const updatedData: Partial<Venue> = {
                ...formData,
                photos: finalPhotos,
                instagramUrl: instagramId ? `https://instagram.com/${instagramId.replace('@', '')}` : '',
            };

            await updateDoc(docRef, updatedData);
            alert("재즈바 정보가 성공적으로 수정되었습니다.");
            setCurrentView('프로필');
        } catch (err) {
            console.error("Error updating venue profile:", err);
            setError("정보 수정에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
            setIsUploading(false);
        }
    };
    
    if (loading) return <div className="p-6 text-center text-gray-500">로딩 중...</div>

    const isProcessing = isSubmitting || isUploading;

    return (
        <div className="p-6 animate-fade-in bg-white">
             <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">📸 프로필 사진 (최대 3장)</label>
                    <div className="grid grid-cols-3 gap-4">
                        {imagePreviews.map((preview, index) => (
                            <div key={index} className="aspect-square">
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} ref={fileInputRefs[index]} className="hidden" />
                                <button type="button" onClick={() => fileInputRefs[index]?.current?.click()} className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-jazz-blue-900 hover:text-jazz-blue-900 transition-colors">
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
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">재즈바 이름</label>
                    <input id="name" name="name" type="text" value={formData.name || ''} onChange={handleChange} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                 <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                    <input id="address" name="address" type="text" value={formData.address || ''} onChange={handleChange} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                 <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">소개</label>
                    <textarea id="description" name="description" rows={4} value={formData.description || ''} onChange={handleChange} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                <div>
                    <label htmlFor="tagsVenue" className="block text-sm font-medium text-gray-700 mb-1">태그 (쉼표로 구분)</label>
                    <input id="tagsVenue" name="tagsVenue" type="text" placeholder="예: 라이브, 칵테일, 분위기 좋은" value={formData.tagsVenue?.join(', ') || ''} onChange={handleTagsChange} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                 <div>
                    <label htmlFor="instagramId" className="block text-sm font-medium text-gray-700 mb-1">Instagram ID</label>
                    <div className="flex items-center">
                        <span className="inline-block bg-gray-200 p-3 rounded-l-md border border-r-0 border-gray-300 text-gray-500">@</span>
                        <input id="instagramId" name="instagramId" type="text" placeholder="allthatjazz_club" value={instagramId} onChange={(e) => setInstagramId(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-r-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    </div>
                </div>
                <div>
                    <label htmlFor="naverMapsUrl" className="block text-sm font-medium text-gray-700 mb-1">네이버 지도 링크</label>
                    <input id="naverMapsUrl" name="naverMapsUrl" type="text" value={formData.naverMapsUrl || ''} onChange={handleChange} className="w-full bg-gray-100 border border-gray-300 rounded-md p-3 text-gray-800 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                </div>
                
                {error && <p className="text-sm text-rose-500">{error}</p>}

                <button type="submit" disabled={isProcessing} className="w-full bg-jazz-blue-900 text-white font-bold py-3 rounded-md hover:bg-jazz-blue-800 disabled:bg-gray-400">
                    {isProcessing ? '저장 중...' : '정보 저장하기'}
                </button>
            </form>
        </div>
    );
};