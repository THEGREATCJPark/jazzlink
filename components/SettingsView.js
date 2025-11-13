

import React, { useState, useEffect } from 'react';
import { auth, db, USE_MOCK_DATA } from '../firebase/config.js';
import { 
    GoogleAuthProvider, 
    signInWithRedirect, 
    signOut, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    deleteUser
} from 'firebase/auth';
import { doc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import GoogleIcon from './icons/GoogleIcon.js';
import CheckCircleIcon from './icons/CheckCircleIcon.js';

const SettingsView = ({ currentUser, currentUserProfile, authLoading, navigateToEditor, navigateToProfileCreation, toggleTheme, theme }) => {
  const [contentProfile, setContentProfile] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resetMessageSent, setResetMessageSent] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);


  useEffect(() => {
      const handleBeforeInstallPrompt = (e) => {
          console.log('beforeinstallprompt event fired');
          e.preventDefault();
          setDeferredInstallPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
  }, []);

  useEffect(() => {
    const fetchContentProfile = async () => {
        if (currentUser && currentUserProfile && currentUserProfile.accountType && db) {
            const type = currentUserProfile.accountType;
            let collectionName = null;
            let profileType = null;
            
            if (type === 'musician') { collectionName = 'musicians'; profileType = 'musician'; }
            else if (type === 'venue_owner') { collectionName = 'venues'; profileType = 'venue'; }

            if (collectionName && profileType) {
                try {
                    const contentRef = collection(db, collectionName);
                    const q = query(contentRef, where("ownerUid", "==", currentUser.uid));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        setContentProfile({ type: profileType, id: doc.id });
                    } else {
                        setContentProfile(null);
                    }
                } catch (e) {
                    console.error("Error checking for content profile:", e);
                    if (e.code === 'failed-precondition') {
                      console.error("A Firestore index is required for this query.");
                    }
                    setContentProfile(null);
                }
            } else {
                 setContentProfile(null);
            }
        } else {
            setContentProfile(null);
        }
    };
    fetchContentProfile();
  }, [currentUser, currentUserProfile]);

  const handleEditProfile = () => {
    if (!currentUser || !currentUserProfile) return;

    if (contentProfile) {
        navigateToEditor(contentProfile);
    } else if (currentUserProfile.accountType === 'general') {
        navigateToEditor({ type: 'general', id: currentUser.uid });
    } else if (currentUserProfile.accountType === 'musician' && !contentProfile) {
        navigateToProfileCreation();
    } else {
        alert("프로필 생성 기능이 아직 지원되지 않는 계정 유형입니다.");
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google sign-in redirect initiation error", error);
      setAuthError(error);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!auth) return;

    setAuthError(null);
    setIsProcessing(true);

    try {
        if (authMode === 'signup') {
            if (password !== confirmPassword) {
                throw { code: 'auth/password-mismatch', message: '비밀번호가 일치하지 않습니다.' };
            }
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        let message = '오류가 발생했습니다. 다시 시도해주세요.';
        switch (error.code) {
            case 'auth/weak-password':
                message = '비밀번호는 6자 이상이어야 합니다.';
                break;
            case 'auth/email-already-in-use':
                message = '이미 사용 중인 이메일입니다.';
                break;
            case 'auth/invalid-credential':
                 message = '이메일 또는 비밀번호가 올바르지 않습니다.';
                 break;
            case 'auth/invalid-email':
                message = '유효하지 않은 이메일 형식입니다.';
                break;
            case 'auth/password-mismatch':
                message = error.message;
                break;
            default:
                console.error(error);
        }
        setAuthError({ code: error.code, message });
    }
    setIsProcessing(false);
  };
  
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!auth || !email) return;
    
    setIsProcessing(true);
    setAuthError(null);
    setResetMessageSent(false);

    try {
        await sendPasswordResetEmail(auth, email);
        setResetMessageSent(true);
    } catch (error) {
        setAuthError({message: '이메일 발송에 실패했습니다. 이메일 주소를 확인해주세요.'});
    } finally {
        setIsProcessing(false);
    }
  }


  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error", error);
    }
  };
  
    const handleDeleteAccount = async () => {
    if (!currentUser || !db) return;

    const confirmation = window.prompt("정말로 회원 탈퇴를 진행하시겠습니까? 되돌릴 수 없습니다. 진행하시려면 '회원탈퇴'라고 입력해주세요.");
    if (confirmation?.trim() !== '회원탈퇴') {
        if (confirmation !== null) { // User typed something but it was wrong
            alert("입력이 일치하지 않아 회원 탈퇴가 취소되었습니다.");
        }
        // If user cancelled the prompt, do nothing.
        return;
    }

    setIsProcessing(true);
    setAuthError(null);

    try {
        if (currentUserProfile?.accountType) {
            let collectionName = null;
            if (currentUserProfile.accountType === 'musician') collectionName = 'musicians';
            else if (currentUserProfile.accountType === 'venue_owner') collectionName = 'venues';

            if (collectionName) {
                const contentQuery = query(collection(db, collectionName), where("ownerUid", "==", currentUser.uid));
                const querySnapshot = await getDocs(contentQuery);
                if (!querySnapshot.empty) {
                    const contentDoc = querySnapshot.docs[0];
                    await deleteDoc(doc(db, collectionName, contentDoc.id));
                }
            }
        }

        await deleteDoc(doc(db, 'users', currentUser.uid));
        await deleteUser(currentUser);

        alert('회원 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.');
    } catch (error) {
        console.error("Account deletion error", error);
        if (error.code === 'auth/requires-recent-login') {
            setAuthError({ message: '보안을 위해 다시 로그인한 후 회원 탈퇴를 시도해주세요.' });
        } else {
            setAuthError({ message: '회원 탈퇴 중 오류가 발생했습니다: ' + error.message });
        }
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleInstallClick = async () => {
      if (!deferredInstallPrompt) {
          alert("앱을 설치할 수 없습니다. 브라우저가 PWA 설치를 지원하는지 확인해주세요. (예: Chrome, Edge, Safari 모바일)");
          return;
      }
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
      } else {
          console.log('User dismissed the install prompt');
      }
      setDeferredInstallPrompt(null);
  };

  if (authLoading) {
    return <div className="p-6 h-full flex justify-center items-center text-gray-500 dark:text-jazz-gray-400">인증 정보 확인 중...</div>;
  }
  
  if (USE_MOCK_DATA) {
     return (
        <div className="p-6 h-full flex flex-col justify-center items-center text-center bg-white dark:bg-jazz-blue-900">
            <h2 className="text-3xl font-bold text-center text-jazz-blue-900 dark:text-white mb-4">Jazzlink</h2>
            <p className="text-center text-gray-500 dark:text-jazz-gray-400 mb-8">
                Firebase가 설정되지 않아 오프라인 모드로 실행 중입니다.
            </p>
        </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col bg-white dark:bg-jazz-blue-900">
      {currentUser ? (
        <>
        <div className="text-center flex-grow flex flex-col justify-center">
          <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}&background=121B2D&color=FFC700`} alt={currentUser.displayName || 'user'} className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-jazz-blue-900 dark:border-jazz-gold-500" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{currentUser.displayName || currentUser.email}</h2>
          <p className="text-gray-500 dark:text-jazz-gray-400 mb-8">{currentUser.email}</p>

          <div className="space-y-3">
             {(contentProfile || currentUserProfile?.accountType) && (
                <button onClick={handleEditProfile} className="w-full bg-gray-100 dark:bg-jazz-blue-800 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-jazz-blue-700 transition-colors">
                    내 프로필 수정하기
                </button>
             )}
            <button onClick={toggleTheme} className="w-full bg-gray-100 dark:bg-jazz-blue-800 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-jazz-blue-700 transition-colors">
                {theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
            </button>
            <a href="https://realbook.site" target="_blank" rel="noopener noreferrer" className="block w-full bg-gray-100 dark:bg-jazz-blue-800 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-jazz-blue-700 transition-colors">
                리얼북 확인하기
            </a>
            {deferredInstallPrompt && (
                <button onClick={handleInstallClick} className="w-full bg-gray-100 dark:bg-jazz-blue-800 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-jazz-blue-700 transition-colors">
                    앱 설치하기
                </button>
            )}
            <button 
                onClick={handleLogout}
                className="w-full bg-rose-600 text-white font-bold py-3 rounded-lg hover:bg-rose-700 transition-colors"
            >
                로그아웃
            </button>
          </div>
        </div>
         <div className="mt-8 border-t border-gray-200 dark:border-jazz-blue-700 pt-6">
            <button
              onClick={handleDeleteAccount}
              disabled={isProcessing}
              className="w-full text-sm text-gray-500 dark:text-jazz-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 py-2 rounded-lg transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
            >
                {isProcessing ? '탈퇴 처리 중...' : '회원 탈퇴'}
            </button>
            {authError && <p className="text-rose-500 text-sm mt-2 text-center">{authError.message}</p>}
        </div>
        </>
      ) : (
        <div className="flex-grow flex flex-col justify-center">
            {resetMessageSent ? (
                 <div className="flex-grow flex flex-col justify-center items-center text-center animate-fade-in">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">이메일 발송 완료</h2>
                    <p className="text-gray-600 dark:text-jazz-gray-300 mt-2 max-w-xs">비밀번호 재설정 이메일을 보냈습니다. 받은편지함을 확인해주세요.</p>
                    <button
                        onClick={() => {
                            setResetMessageSent(false);
                            setAuthMode('login');
                            setEmail('');
                        }}
                        className="mt-8 w-full max-w-xs bg-jazz-blue-900 text-white font-bold py-3 rounded-lg hover:bg-jazz-blue-800 transition-colors"
                    >
                        로그인 화면으로 돌아가기
                    </button>
                </div>
            ) : (
                <>
                <h2 className="text-3xl font-bold text-center text-jazz-blue-900 dark:text-white mb-4">Jazzlink</h2>
                <p className="text-center text-gray-500 dark:text-jazz-gray-400 mb-8">재즈 커뮤니티에 오신 것을 환영합니다</p>
                
                { authMode !== 'reset' && (
                    <div className="flex bg-gray-100 dark:bg-jazz-blue-800 rounded-full p-1 mb-6">
                        <button onClick={() => setAuthMode('login')} className={`w-1/2 py-2 text-sm font-bold rounded-full transition-colors ${authMode === 'login' ? 'bg-white dark:bg-jazz-blue-700 shadow text-jazz-blue-900 dark:text-white' : 'text-gray-600 dark:text-jazz-gray-300'}`}>로그인</button>
                        <button onClick={() => setAuthMode('signup')} className={`w-1/2 py-2 text-sm font-bold rounded-full transition-colors ${authMode === 'signup' ? 'bg-white dark:bg-jazz-blue-700 shadow text-jazz-blue-900 dark:text-white' : 'text-gray-600 dark:text-jazz-gray-300'}`}>회원가입</button>
                    </div>
                )}

                { authMode === 'reset' ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <p className="text-sm text-center text-gray-600 dark:text-jazz-gray-300">가입한 이메일을 입력하시면,<br/>비밀번호 재설정 링크를 보내드립니다.</p>
                        <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-100 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 text-gray-800 dark:text-gray-200 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                        <button type="submit" disabled={isProcessing} className="w-full bg-jazz-blue-900 text-white font-bold py-3 rounded-lg hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400">
                            {isProcessing ? '처리 중...' : '재설정 이메일 받기'}
                        </button>
                        <button type="button" onClick={() => setAuthMode('login')} className="w-full text-center text-sm text-gray-500 dark:text-jazz-gray-400 hover:underline mt-2">로그인으로 돌아가기</button>
                    </form>
                ) : (
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                    <input type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-gray-100 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 text-gray-800 dark:text-gray-200 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    <input type="password" placeholder="비밀번호" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-gray-100 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 text-gray-800 dark:text-gray-200 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    {authMode === 'signup' && (
                        <input type="password" placeholder="비밀번호 확인" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-gray-100 dark:bg-jazz-blue-800 border border-gray-300 dark:border-jazz-blue-700 rounded-md p-3 text-gray-800 dark:text-gray-200 focus:ring-jazz-blue-900 focus:border-jazz-blue-900" />
                    )}
                    <button type="submit" disabled={isProcessing} className="w-full bg-jazz-blue-900 text-white font-bold py-3 rounded-lg hover:bg-jazz-blue-800 transition-colors disabled:bg-gray-400">
                        {isProcessing ? '처리 중...' : (authMode === 'login' ? '로그인' : '회원가입')}
                    </button>
                    {authMode === 'login' && <button type="button" onClick={() => setAuthMode('reset')} className="w-full text-right text-xs text-gray-500 dark:text-jazz-gray-400 hover:underline pr-1">비밀번호를 잊으셨나요?</button>}
                    </form>
                )}

                {authError && (
                    <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 p-3 rounded-md mt-4 text-sm">
                        <p>{authError.message}</p>
                    </div>
                )}
                
                <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-gray-200 dark:border-jazz-blue-700"></div>
                    <span className="flex-shrink mx-4 text-gray-400 dark:text-jazz-gray-500 text-sm">또는</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-jazz-blue-700"></div>
                </div>

                <button 
                    onClick={handleGoogleSignIn}
                    className="w-full bg-white dark:bg-jazz-blue-800 text-gray-800 dark:text-gray-200 font-bold py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-jazz-blue-700 transition-colors flex items-center justify-center space-x-2 border border-gray-300 dark:border-jazz-blue-700"
                >
                    <GoogleIcon className="w-6 h-6" />
                    <span>Google 계정으로 계속하기</span>
                </button>
                </>
            )}
        </div>
      )}
    </div>
  );
};

export default SettingsView;