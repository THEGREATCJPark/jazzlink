
import React, { useState, useRef } from 'react';
import { db, storage } from '../firebase/config';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User as FirebaseUser } from 'firebase/auth';
import { User as UserType } from '../types';

interface CreatePostViewProps {
    onClose: () => void;
    onPostCreated: () => void;
    currentUser: FirebaseUser | null;
    currentUserProfile: UserType | null;
}

const CreatePostView: React.FC<CreatePostViewProps> = ({ onClose, onPostCreated, currentUser, currentUserProfile }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<'연주자 구함' | '연주 구함' | '잡담'>('잡담');
    const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null]);
    const [imagePreviews, setImagePreviews] = useState<(string | null)[]>([null, null, null]);
    const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

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

    const handleSubmit = async () => {
        if (!currentUser || !currentUserProfile) {
            setError('로그인 후 게시물을 작성할 수 있습니다.');
            return;
        }
        if (!title.trim() || !content.trim()) {
            setError('제목과 내용을 모두 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            if (!db || !storage) throw new Error("Firebase is not initialized");
            
            const imageURLs = await Promise.all(
                imageFiles.map(async (file) => {
                    if (file) {
                        const filePath = `post_images/${currentUser.uid}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, filePath);
                        await uploadBytes(storageRef, file);
                        return getDownloadURL(storageRef);
                    }
                    return null;
                })
            );
            const finalImages = imageURLs.filter((url): url is string => url !== null);

            await addDoc(collection(db, 'communityFeed'), {
                title,
                content,
                category,
                images: finalImages,
                authorUid: currentUser.uid,
                authorName: currentUserProfile.name || '익명',
                authorPhoto: currentUserProfile.photo || `https://ui-avatars.com/api/?name=${currentUserProfile.name || '익명'}&background=1A263A&color=FFC700`,
                dateTime: Timestamp.fromDate(new Date()),
                viewedBy: [],
                likedBy: [],
            });
            onPostCreated();
        } catch (e) {
            console.error("Error adding document: ", e);
            setError('게시물 등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const canSubmit = title.trim() && content.trim() && !isSubmitting;

    return (
        <div className="fixed inset-0 bg-white dark:bg-jazz-blue-900 z-40 flex flex-col">
            <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 dark:border-jazz-blue-700 h-16">
                <button onClick={onClose} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-lg">취소</button>
                <button onClick={handleSubmit} disabled={!canSubmit} className="text-lg font-bold text-jazz-blue-900 dark:text-jazz-gold-500 disabled:text-gray-400 dark:disabled:text-gray-600">등록</button>
            </header>

            <main className="flex-grow p-4 overflow-y-auto">
                <div className="max-w-md mx-auto">
                    <div className="mb-4">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as any)}
                            className="w-auto bg-transparent text-gray-800 dark:text-gray-200 font-bold text-lg border-0 focus:ring-0 p-0"
                        >
                            <option value="잡담">잡담</option>
                            <option value="연주자 구함">연주자 구함</option>
                            <option value="연주 구함">연주 구함</option>
                        </select>
                    </div>
                    
                    <input 
                        type="text" 
                        placeholder="제목 (예: 색소폰 연주자 구합니다)" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-2xl font-bold bg-transparent border-0 border-b border-gray-200 dark:border-jazz-blue-700 focus:ring-0 focus:border-jazz-blue-900 dark:focus:border-jazz-gold-500 p-0 pb-2 mb-4 placeholder-gray-400 dark:placeholder-jazz-gray-500 text-gray-900 dark:text-white"
                    />
                    <textarea 
                        placeholder="내용 (예: 클럽 에반스에서 11월 15일 금요일 18시~20시 색소폰 연주자 구합니다.)" 
                        rows={10}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full bg-transparent border-0 focus:ring-0 p-0 text-base placeholder-gray-400 dark:placeholder-jazz-gray-500 text-gray-800 dark:text-gray-200"
                    ></textarea>

                    <div className="mt-4 grid grid-cols-3 gap-4">
                        {imagePreviews.map((preview, index) => (
                             <div key={index} className="aspect-square">
                                <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, index)} ref={fileInputRefs[index]} className="hidden" />
                                <button type="button" onClick={() => fileInputRefs[index].current?.click()} className="w-full h-full bg-gray-100 dark:bg-jazz-blue-800 border-2 border-dashed border-gray-300 dark:border-jazz-blue-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-jazz-gray-500 hover:border-jazz-blue-900 hover:text-jazz-blue-900 dark:hover:border-jazz-gold-500 dark:hover:text-jazz-gold-500 transition-colors">
                                    {preview ? (
                                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" /></svg>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                    
                    {error && <p className="text-sm text-rose-500 mt-4">{error}</p>}
                </div>
            </main>
        </div>
    );
};

export default CreatePostView;
