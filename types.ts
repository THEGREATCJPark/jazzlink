

export interface User {
  uid: string;
  name: string | null;
  photo: string | null;
  email: string | null;
  accountType?: 'musician' | 'venue_owner' | 'general';
}

export interface CommunityFeed {
  id:string;
  category: '연주자 구함' | '연주 구함' | '잡담';
  title: string;
  content: string;
  images?: string[];
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  dateTime: string;
  instruments?: string[];
  viewedBy: string[];
  likedBy: string[];
}

export interface Performance {
    id: string;
    venueId: string;
    title: string;
    dateTime: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  photos: string[];
  description: string;
  tagsVenue: string[];
  ownerUid: string;
  coordinates: { lat: number; lng: number; };
  naverMapsUrl: string;
  instagramUrl: string;
  operatingHours: string;
  youtubeUrl?: string;
  websiteUrl?: string;
  schedule?: Performance[];
  totalRating?: number;
  ratingCount?: number;
  googlePlaceId?: string;
  googleOpeningHours?: any;
}

export interface Musician {
  id: string;
  name: string;
  instruments: string[];
  photos: string[];
  profile: string;
  tagsMusician: string[];
  ownerUid: string;
  youtubeUrl: string;
  instagramUrl: string;
  startYear: number;
  skillLevel: '초보' | '중급' | '프로';
  teamId?: string;
  totalRating?: number;
  ratingCount?: number;
}

export interface TeamMember {
  name: string;
  instrument: string;
  isLeader?: boolean;
  musicianId?: string; // Links to a musician profile in the DB
  ownerUid?: string; // The UID of the user who owns the musician profile
}


export interface Team {
  id: string;
  teamName: string;
  teamPhotos: string[];
  teamDescription: string;
  members: TeamMember[];
  ownerUid: string;
  region?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  totalRating?: number;
  ratingCount?: number;
  tagsTeam?: string[];
}

export interface Comment {
  id: string;
  authorUid: string;
  content: string;
  dateTime: string;
}

export interface Review {
  id: string;
  authorUid: string;
  content: string;
  rating: number;
  dateTime: string;
  isAnonymous?: boolean;
}


export type ViewType = '홈' | '일정' | '프로필' | '설정' | '프로필 생성' | '프로필 수정' | '프로필 생성 (재즈바)' | '프로필 생성 (연주팀)' | '어드민';