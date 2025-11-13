import { User as FirebaseUser } from 'firebase/auth';

export type AccountType = 'musician' | 'venue_owner' | 'general';

export interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  photo: string | null;
  accountType?: AccountType;
}

export interface MusicianProfile {
  id: string;
  name: string;
  instruments: string[];
  photos: string[];
  profile: string;
  tagsMusician: string[];
  ownerUid: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  startYear: number;
  skillLevel: '초보' | '중급' | '프로';
  teamId?: string;
  ratingCount?: number;
  totalRating?: number;
}

export interface VenueProfile {
  id: string;
  name: string;
  address: string;
  photos: string[];
  description: string;
  tagsVenue: string[];
  ownerUid: string;
  coordinates: { lat: number; lng: number };
  naverMapsUrl?: string;
  instagramUrl?: string;
  operatingHours?: string;
  youtubeUrl?: string;
  schedule: any[];
  ratingCount?: number;
  totalRating?: number;
}

export interface TeamProfile {
  id: string;
  teamName: string;
  teamPhotos: string[];
  teamDescription: string;
  members: string[];
  ownerUid: string;
  region?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  ratingCount?: number;
  totalRating?: number;
}

export interface FeedItem {
  id: string;
  category: string;
  title: string;
  content: string;
  authorUid: string;
  authorName: string;
  authorPhoto: string;
  dateTime: string;
  instruments?: string[];
  images?: string[];
  viewedBy: string[];
  likedBy: string[];
}

export interface Comment {
    id: string;
    authorUid: string;
    content: string;
    dateTime: string;
}

export interface Performance {
  id: string;
  venueId: string;
  title: string;
  dateTime: string;
}

export interface IconProps {
  className?: string;
  filled?: boolean;
}
