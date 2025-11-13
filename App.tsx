
import React, { useState, useEffect } from 'react';
import { ViewType, User as UserType } from './types';
import BottomNav from './components/BottomNav';
import HomeView from './components/HomeView';
import ScheduleView from './components/ScheduleView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import PencilIcon from './components/icons/PencilIcon';
import { auth, db } from './firebase/config';
import { onAuthStateChanged, User as FirebaseUser, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import AccountTypeSelectionModal from './components/AccountTypeSelectionModal';
import CreateMusicianProfileView from './components/CreateMusicianProfileView';
import EditProfileContainer from './components/EditProfileContainer';
import ChevronLeftIcon from './components/icons/ChevronLeftIcon';
import CommunityFeedDetailView from './components/CommunityFeedDetailView';
import CreatePostView from './components/CreatePostView';
import CreateVenueProfileView from './components/CreateVenueProfileView';
import CreateTeamProfileView from './components/CreateTeamProfileView';
import SearchIcon from './components/icons/SearchIcon';
import PlusIcon from './components/icons/PlusIcon';


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('홈');
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserType | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAccountTypeSelection, setShowAccountTypeSelection] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  const [editingProfile, setEditingProfile] = useState<{ type: 'musician' | 'venue' | 'team' | 'general', id: string } | null>(null);
  const [viewBeforeEdit, setViewBeforeEdit] = useState<ViewType | null>(null);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [overlayProfileUid, setOverlayProfileUid] = useState<string | null>(null);
  const [fetchFeedTrigger, setFetchFeedTrigger] = useState(0);
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileViewTab, setProfileViewTab] = useState<'재즈바' | '연주자' | '연주팀'>('연주자');


  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const handleSetView = (view: ViewType) => {
    if (!currentUser && (view === '일정' || view === '프로필' || view === '프로필 생성 (연주팀)')) {
      alert("서비스를 이용하려면 로그인이 필요합니다. '설정' 탭에서 로그인 또는 회원가입을 진행해주세요.");
      setCurrentView('설정');
      return;
    }
    setCurrentView(view);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const fetchUserProfile = async (user: FirebaseUser): Promise<UserType | null> => {
      if (!db) return null;
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
          return { uid: user.uid, ...userDocSnap.data() } as UserType;
      }
      return null;
  }

  const processUser = async (user: FirebaseUser) => {
    if (!db) return;
    const userDocRef = doc(db, 'users', user.uid);
    let userProfile = await fetchUserProfile(user);

    if (!userProfile) {
      const newUserProfileData = {
        name: user.displayName || user.email?.split('@')[0],
        email: user.email,
        photo: user.photoURL,
      };
      await setDoc(userDocRef, newUserProfileData);
      setCurrentUserProfile({ uid: user.uid, ...newUserProfileData });
      setShowAccountTypeSelection(true);
    } else {
      setCurrentUserProfile(userProfile);
      if (!userProfile.accountType) {
        setShowAccountTypeSelection(true);
      }
    }
  };

  useEffect(() => {
    if (!auth || !db) {
      setAuthLoading(false);
      return;
    }
    
    getRedirectResult(auth).catch((error) => console.error("Google redirect error", error));

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setCurrentUser(user);
            await processUser(user);
        } else {
            setCurrentUser(null);
            setCurrentUserProfile(null);
            setShowAccountTypeSelection(false);
        }
        setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const navigateToEditor = (profile: { type: 'musician' | 'venue' | 'team' | 'general', id: string }) => {
    setViewBeforeEdit(currentView);
    setEditingProfile(profile);
    handleSetView('프로필 수정');
  };
  
  const navigateToProfileCreation = () => {
    handleSetView('프로필 생성');
  };

  const handleBack = () => {
    if (selectedFeedId) {
        setSelectedFeedId(null);
        return;
    }
    if (['프로필 수정', '프로필 생성', '프로필 생성 (재즈바)', '프로필 생성 (연주팀)'].includes(currentView)) {
        setEditingProfile(null);
        handleSetView(viewBeforeEdit || '설정');
        setViewBeforeEdit(null);
        return;
    }
  };

  const handleAccountTypeSelected = async (user: FirebaseUser) => {
    setShowAccountTypeSelection(false);
    const updatedProfile = await fetchUserProfile(user);
    if (updatedProfile) {
        setCurrentUserProfile(updatedProfile);
        if (updatedProfile.accountType === 'musician') {
            handleSetView('프로필 생성');
        } else if (updatedProfile.accountType === 'venue_owner') {
            handleSetView('프로필 생성 (재즈바)');
        }
        else {
            handleSetView('홈');
        }
    }
  };
  
  const handleSelectFeedItem = (feedId: string) => {
    if (!currentUser) {
        alert("게시물을 보려면 로그인이 필요합니다. '설정' 탭에서 로그인 또는 회원가입을 진행해주세요.");
        setCurrentView('설정');
        return;
    }
    setSelectedFeedId(feedId);
  }
  
  const handleViewUserProfile = (uid: string) => {
    if (!currentUser) {
        alert("프로필을 보려면 로그인이 필요합니다.");
        setCurrentView('설정');
        return;
    }
    setOverlayProfileUid(uid);
  };

  const renderView = () => {
    if (isCreatingPost) {
        return <CreatePostView 
            onClose={() => setIsCreatingPost(false)} 
            onPostCreated={() => {
                setIsCreatingPost(false);
                setFetchFeedTrigger(t => t + 1); // Trigger a re-fetch
            }}
            currentUser={currentUser}
            currentUserProfile={currentUserProfile}
        />
    }
    if (selectedFeedId) {
        return <CommunityFeedDetailView feedId={selectedFeedId} currentUser={currentUser} onViewUserProfile={handleViewUserProfile} />;
    }

    switch (currentView) {
      case '홈':
        return <HomeView 
            currentUser={currentUser}
            onSelectFeedItem={handleSelectFeedItem}
            fetchFeedTrigger={fetchFeedTrigger}
            showSearch={showSearch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            />;
      case '일정':
        return <ScheduleView />;
      case '프로필':
        return <ProfileView 
            currentUser={currentUser} 
            navigateToEditor={navigateToEditor} 
            onTabChange={setProfileViewTab}
        />;
      case '프로필 생성':
        return <CreateMusicianProfileView currentUser={currentUser} setCurrentView={handleSetView} />;
      case '프로필 생성 (재즈바)':
        return <CreateVenueProfileView currentUser={currentUser} setCurrentView={handleSetView} />;
      case '프로필 생성 (연주팀)':
        return <CreateTeamProfileView currentUser={currentUser} setCurrentView={handleSetView} />;
      case '프로필 수정':
        if (!editingProfile) return <ProfileView currentUser={currentUser} navigateToEditor={navigateToEditor} onTabChange={setProfileViewTab} />;
        return <EditProfileContainer profile={editingProfile} currentUser={currentUser} setCurrentView={handleSetView} />;
      case '설정':
        return <SettingsView 
                  currentUser={currentUser} 
                  currentUserProfile={currentUserProfile}
                  authLoading={authLoading} 
                  navigateToEditor={navigateToEditor}
                  navigateToProfileCreation={navigateToProfileCreation}
                  toggleTheme={toggleTheme}
                  theme={theme}
               />;
      default:
        return <HomeView 
            currentUser={currentUser} 
            onSelectFeedItem={handleSelectFeedItem}
            fetchFeedTrigger={fetchFeedTrigger}
            showSearch={showSearch}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            />;
    }
  };

  const getHeaderTitle = () => {
    if (selectedFeedId) return '게시물';
    if (currentView === '프로필 수정') return '프로필 수정';
    if (currentView === '프로필 생성') return '연주자 프로필 만들기';
    if (currentView === '프로필 생성 (재즈바)') return '재즈바 프로필 만들기';
    if (currentView === '프로필 생성 (연주팀)') return '연주팀 프로필 만들기';

    return currentView;
  };
  
  const handleNewPostClick = () => {
      if (!currentUser) {
          alert("게시물을 작성하려면 로그인이 필요합니다. '설정' 탭에서 로그인해주세요.");
          setCurrentView('설정');
          return;
      }
      setIsCreatingPost(true);
  }
  
  const isBottomNavVisible = !['프로필 생성', '프로필 수정', '프로필 생성 (재즈바)', '프로필 생성 (연주팀)'].includes(currentView) && !selectedFeedId && !isCreatingPost;
  const isNavigableBack = ['프로필 수정'].includes(currentView) || !!selectedFeedId;
  const isCreationFlow = ['프로필 생성', '프로필 수정', '프로필 생성 (재즈바)', '프로필 생성 (연주팀)'].includes(currentView) || isCreatingPost;

  return (
    <div className="relative max-w-md mx-auto bg-gray-50 dark:bg-jazz-blue-900 text-gray-800 dark:text-gray-200 h-screen font-sans flex flex-col overflow-hidden">
      {!isCreationFlow && (
        <header className="sticky top-0 bg-white/80 dark:bg-jazz-blue-900/80 backdrop-blur-sm z-20 p-4 border-b border-gray-200 dark:border-jazz-blue-700 flex items-center h-16 flex-shrink-0">
           {currentView === '홈' ? (
             <>
               <h1 className="text-2xl font-bold text-jazz-blue-900 dark:text-white">Jazzlink</h1>
               <div className="flex-grow" />
               <button onClick={() => setShowSearch(!showSearch)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-jazz-blue-800">
                 <SearchIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
               </button>
             </>
           ) : (
             <>
               <div className="w-10">
                 {isNavigableBack && (
                   <button onClick={handleBack} className="text-jazz-blue-900 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-jazz-blue-800 p-1 -ml-1 rounded-full">
                     <ChevronLeftIcon className="w-6 h-6" />
                   </button>
                 )}
               </div>
               <h1 className="text-xl font-bold text-jazz-blue-900 dark:text-white text-center flex-grow truncate">{getHeaderTitle()}</h1>
               <div className="w-10 flex justify-end" />
             </>
           )}
        </header>
      )}
      
      <main className={`flex-grow overflow-y-auto ${isBottomNavVisible ? 'pb-20' : ''}`}>
        {renderView()}
      </main>

      {showAccountTypeSelection && currentUser && (
        <AccountTypeSelectionModal 
            user={currentUser} 
            onSelected={() => handleAccountTypeSelected(currentUser)} 
        />
      )}
      
      {overlayProfileUid && (
        <ProfileView
            currentUser={currentUser}
            navigateToEditor={navigateToEditor}
            onTabChange={() => {}}
            targetUid={overlayProfileUid}
            isOverlay={true}
            onCloseOverlay={() => setOverlayProfileUid(null)}
        />
       )}

      {isBottomNavVisible && currentView === '홈' && (
         <button onClick={handleNewPostClick} className="absolute bottom-28 right-5 w-14 h-14 bg-jazz-blue-900 dark:bg-jazz-gold-500 rounded-full flex items-center justify-center shadow-lg hover:bg-jazz-blue-800 dark:hover:bg-jazz-gold-600 transition-transform hover:scale-105 z-30">
            <PencilIcon className="w-7 h-7 text-white dark:text-jazz-blue-900" />
         </button>
      )}
      
      {isBottomNavVisible && currentView === '프로필' && profileViewTab === '연주팀' && (
         <button onClick={() => handleSetView('프로필 생성 (연주팀)')} className="absolute bottom-28 right-5 w-14 h-14 bg-jazz-blue-900 dark:bg-jazz-gold-500 rounded-full flex items-center justify-center shadow-lg hover:bg-jazz-blue-800 dark:hover:bg-jazz-gold-600 transition-transform hover:scale-105 z-30">
            <PlusIcon className="w-7 h-7 text-white dark:text-jazz-blue-900" />
         </button>
      )}

      {isBottomNavVisible && <BottomNav currentView={currentView} setCurrentView={handleSetView} />}
    </div>
  );
};

export default App;
