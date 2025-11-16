
import { User, CommunityFeed, Venue, Musician, Team, Performance, Comment } from '../types';

// This mock data is now primarily for reference, as the app will fetch live data from Firebase.
export const users: User[] = [
  { uid: 'user1_uid', name: '김민준', photo: 'https://picsum.photos/seed/user1/100', email: 'minjun.kim@example.com', accountType: 'musician' },
  { uid: 'user2_uid', name: '이서연', photo: 'https://picsum.photos/seed/user2/100', email: 'seoyeon.lee@example.com', accountType: 'musician' },
  { uid: 'user3_uid', name: '박하은', photo: 'https://picsum.photos/seed/user3/100', email: 'haeun.park@example.com', accountType: 'venue_owner' },
];

export const communityFeed: CommunityFeed[] = [
  { id: 'feed1', category: '연주자 구함', title: '강남 재즈 클럽에서 피아니스트 구합니다', content: '매주 금, 토 연주 가능하신 분 찾습니다. 스탠다드 재즈 위주로 연주합니다. 페이는 협의 후 결정하겠습니다.', authorUid: 'user2_uid', authorName: '이서연', authorPhoto: 'https://picsum.photos/seed/user2/100', dateTime: '2024-11-08T20:00:00Z', instruments: ['피아노'], viewedBy: ['user1_uid', 'user3_uid'], likedBy: ['user1_uid'] },
  { id: 'feed2', category: '연주 구함', title: '경력 10년차 드러머입니다. 밴드 구해요.', content: '비밥, 퓨전, 펑크 등 다양한 장르 가능합니다. 합주 영상 링크 첨부합니다. 연락 주세요!', authorUid: 'user1_uid', authorName: '김민준', authorPhoto: 'https://picsum.photos/seed/user1/100', dateTime: '2024-11-09T18:30:00Z', instruments: ['드럼'], viewedBy: ['user2_uid', 'user3_uid', 'user1_uid'], likedBy: ['user2_uid', 'user3_uid'] },
];

export const comments: { [key: string]: Comment[] } = {
    'feed1': [
        { id: 'c1f1', authorUid: 'user1_uid', content: '저 관심있습니다! 이력서 어디로 보내면 될까요?', dateTime: '2024-11-08T21:00:00Z' },
        { id: 'c2f1', authorUid: 'user2_uid', content: '네, minjun.kim@example.com 으로 보내주세요. 감사합니다!', dateTime: '2024-11-08T21:05:00Z' },
    ],
    'feed2': [
        { id: 'c1f2', authorUid: 'user3_uid', content: '연주 영상 잘 봤습니다. 저희 팀에서 드러머 찾고 있는데 연락 한번 주세요.', dateTime: '2024-11-09T19:00:00Z' },
    ],
};


export const performances: Performance[] = [
    { id: 'p1', venueId: 'ChIJxbxyTQqifDUR1F3z17j8384', title: '이서연 트리오', dateTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString() },
    { id: 'p2', venueId: 'ChIJHZ_zRQyfezURz5RQuvYk-A0', title: '김민준 퀄텟', dateTime: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString() },
    { id: 'p3', venueId: 'ChIJ-0tC8YCkfDURMvK4tJ4v-c4', title: '스페셜 잼데이', dateTime: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString() },
    { id: 'p4', venueId: 'ChIJwdwN6ymlfDURdQ4yJ9k-TNM', title: '박하은 보컬 나잇', dateTime: new Date(new Date().setDate(new Date().getDate() + 4)).toISOString() },
];


export const venues: Venue[] = [
  { id: 'ChIJHZ_zRQyfezURz5RQuvYk-A0', name: 'Flat Nine', address: '서울 서초구 강남대로65길 10 5층', photos: ['https://picsum.photos/seed/venue_flatnine/400/300'], description: '강남역에 위치한 모던하고 세련된 분위기의 재즈바. 수준 높은 라이브 연주를 가까이에서 즐길 수 있습니다.', tagsVenue: ['라이브', '칵테일', '강남역'], ownerUid: 'owner1_uid', coordinates: { lat: 37.5002, lng: 127.0271 }, naverMapsUrl: 'https://map.naver.com/p/entry/place/1316823377', instagramUrl: 'https://www.instagram.com/flatnine.official', operatingHours: '매일 19:00 - 01:00', googlePlaceId: 'ChIJHZ_zRQyfezURz5RQuvYk-A0', googleOpeningHours: {} },
  { id: 'ChIJxbxyTQqifDUR1F3z17j8384', name: 'Club Evans', address: '서울 마포구 와우산로 63', photos: ['https://picsum.photos/seed/venue_evans/400/300'], description: '홍대에 위치한 재즈 클럽으로, 실력 있는 뮤지션들의 잼세션이 유명합니다.', tagsVenue: ['잼세션', '라이브', '홍대'], ownerUid: 'owner2_uid', coordinates: { lat: 37.5517, lng: 126.9234 }, naverMapsUrl: 'https://map.naver.com/p/entry/place/11579213', instagramUrl: 'https://instagram.com/club_evans', operatingHours: '매일 19:30 - 24:00', googlePlaceId: 'ChIJxbxyTQqifDUR1F3z17j8384', googleOpeningHours: {} },
  { id: 'ChIJ-0tC8YCkfDURMvK4tJ4v-c4', name: 'All That Jazz', address: '서울 용산구 이태원로27가길 12', photos: ['https://picsum.photos/seed/venue_allthatjazz/400/300'], description: '1976년에 오픈한 한국 최초의 재즈 클럽. 이태원의 자유로운 분위기를 느낄 수 있습니다.', tagsVenue: ['역사적인', '이태원', '라이브'], ownerUid: 'owner3_uid', coordinates: { lat: 37.5348, lng: 126.9944 }, naverMapsUrl: 'https://map.naver.com/p/entry/place/11543232', instagramUrl: 'https://instagram.com/allthatjazz_itaewon', operatingHours: '월-목 18:00 - 23:00, 금-일 18:00 - 24:00', googlePlaceId: 'ChIJ-0tC8YCkfDURMvK4tJ4v-c4', googleOpeningHours: {} },
  { id: 'ChIJwdwN6ymlfDURdQ4yJ9k-TNM', name: 'Diva Janus', address: '서울 서초구 서초대로42길 19', photos: ['https://picsum.photos/seed/venue_janus/400/300'], description: '교대역 근처에 위치한 재즈 클럽으로, 편안한 분위기에서 공연을 즐길 수 있습니다.', tagsVenue: ['스탠다드', '보컬', '아늑한'], ownerUid: 'owner4_uid', coordinates: { lat: 37.4906, lng: 127.0094 }, naverMapsUrl: 'https://map.naver.com/p/entry/place/13352276', instagramUrl: 'https://instagram.com/divajanus', operatingHours: '매일 19:00 - 24:00', googlePlaceId: 'ChIJwdwN6ymlfDURdQ4yJ9k-TNM', googleOpeningHours: {} },
];

export const musicians: Musician[] = [
  { id: 'musician1', name: '김민준', instruments: ['드럼'], photos: ['https://picsum.photos/seed/m1/400/400', 'https://picsum.photos/seed/m1_2/400/400', 'https://picsum.photos/seed/m1_3/400/400'], profile: 'Art Blakey의 열정과 Tony Williams의 섬세함을 추구합니다.', tagsMusician: ['정통파', '비밥', '하드밥'], ownerUid: 'user1_uid', youtubeUrl: 'https://youtube.com/user/drummerkim', instagramUrl: 'https://instagram.com/drummerkim', startYear: 2012, skillLevel: '프로' },
  { id: 'musician2', name: '이서연', instruments: ['피아노', '키보드'], photos: ['https://picsum.photos/seed/m2/400/400'], profile: 'Bill Evans와 같은 서정적인 연주를 좋아합니다.', tagsMusician: ['서정적인', '스탠다드', '트리오'], ownerUid: 'user2_uid', youtubeUrl: 'https://youtube.com/user/pianolee', instagramUrl: 'https://instagram.com/pianolee', startYear: 2018, skillLevel: '중급' },
];

export const teams: Team[] = [
  { id: 'team1', teamName: '미드나잇 그루브', teamPhotos: ['https://picsum.photos/seed/t1/400/300'], teamDescription: '서울을 중심으로 활동하는 퓨전 재즈 밴드입니다. 함께 그루브를 만들어갈 멤버를 찾습니다.', members: [
    { name: '김민준', instrument: '드럼', isLeader: true, musicianId: 'musician1', ownerUid: 'user1_uid' },
    { name: '이서연', instrument: '피아노', musicianId: 'musician2', ownerUid: 'user2_uid' },
  ], ownerUid: 'user1_uid' },
];
