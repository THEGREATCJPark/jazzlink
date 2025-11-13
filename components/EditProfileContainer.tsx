import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ViewType } from '../types';
import { EditVenueProfileView, EditGeneralProfileView } from './EditProfileViews';
import CreateMusicianProfileView from './CreateMusicianProfileView';

interface EditProfileContainerProps {
    profile: { type: 'musician' | 'venue' | 'team' | 'general', id: string };
    currentUser: FirebaseUser | null;
    setCurrentView: (view: ViewType) => void;
}

const EditProfileContainer: React.FC<EditProfileContainerProps> = ({ profile, currentUser, setCurrentView }) => {
    
    switch (profile.type) {
        case 'musician':
            return <CreateMusicianProfileView profileId={profile.id} currentUser={currentUser} setCurrentView={setCurrentView} />;
        case 'venue':
            return <EditVenueProfileView profileId={profile.id} currentUser={currentUser} setCurrentView={setCurrentView} />;
        case 'general':
             return <EditGeneralProfileView userId={profile.id} currentUser={currentUser} setCurrentView={setCurrentView} />;
        case 'team':
             return <div className="p-6 text-center text-jazz-gray-400">팀 프로필 수정 기능은 현재 준비 중입니다.</div>
        default:
            return <div className="p-6 text-center text-jazz-gray-400">잘못된 프로필 유형입니다.</div>
    }
};

export default EditProfileContainer;