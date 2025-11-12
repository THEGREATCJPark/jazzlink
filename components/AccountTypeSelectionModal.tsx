import React, { useState } from 'react';
import { db } from '../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';

interface AccountTypeSelectionModalProps {
  user: FirebaseUser;
  onSelected: () => void;
}

const accountTypes: { type: User['accountType']; label: string; description: string }[] = [
  { type: 'musician', label: '연주자', description: '개인 프로필을 만들고 구인/구직 활동을 합니다.' },
  { type: 'venue_owner', label: '재즈바 사장님', description: '재즈바 정보를 등록하고 연주자를 구합니다.' },
  { type: 'general', label: '일반 회원', description: '커뮤니티 활동 및 공연 정보 확인이 주목적입니다.' },
];

const AccountTypeSelectionModal: React.FC<AccountTypeSelectionModalProps> = ({ user, onSelected }) => {
  const [isSubmitting, setIsSubmitting] = useState<User['accountType'] | null>(null);
  const [error, setError] = useState('');

  const handleSelect = async (type: User['accountType']) => {
    if (!db || isSubmitting) return;
    setIsSubmitting(type);
    setError('');

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { accountType: type });
      onSelected();
    } catch (e) {
      console.error("Failed to update account type:", e);
      setError('역할 선택에 실패했습니다. 다시 시도해주세요.');
      setIsSubmitting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-lg max-w-sm w-full mx-4 p-6">
        <h2 className="text-xl font-bold text-jazz-blue-900 mb-2">환영합니다!</h2>
        <p className="text-gray-600 mb-6">Jazzlink에서 어떤 활동을 하고 싶으신가요?</p>
        
        <div className="space-y-3">
          {accountTypes.map(({ type, label, description }) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              disabled={!!isSubmitting}
              className="w-full text-left p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 border border-gray-200"
            >
              <p className="font-bold text-gray-800">{label}</p>
              <p className="text-sm text-gray-500">{description}</p>
              {isSubmitting === type && <p className="text-xs text-jazz-blue-900 mt-1">처리 중...</p>}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-rose-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default AccountTypeSelectionModal;