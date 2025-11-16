
import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { ViewType } from '../types';
import { EditVenueProfileView, EditGeneralProfileView } from './EditProfileViews';
import CreateMusicianProfileView from './CreateMusicianProfileView';
import TeamProfileEditorView from './TeamProfileEditorView';

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
             return <TeamProfileEditorView profileId={profile.id} currentUser={currentUser} setCurrentView={setCurrentView} />;
        default:
            return <div className="p-6 text-center text-jazz-gray-400">잘못된 프로필 유형입니다.</div>
    }
};

export default EditProfileContainer;