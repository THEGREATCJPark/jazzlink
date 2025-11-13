
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// --- 중요 ---
// 1. Firebase 콘솔에서 서비스 계정 키를 다운로드 받으세요.
//    [프로젝트 설정] > [서비스 계정] > [새 비공개 키 생성]
// 2. 다운로드한 파일을 'serviceAccountKey.json' 이름으로 이 스크립트와 같은 디렉터리에 저장하세요.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ES 모듈에서는 require()를 직접 사용할 수 없으므로, fs.readFileSync를 사용하여 JSON 파일을 읽습니다.
const serviceAccount = JSON.parse(readFileSync(join(__dirname, 'serviceAccountKey.json')));


// --- 중요 ---
// 3. 사용 중인 Firebase 프로젝트의 데이터베이스 URL로 수정해주세요.
//    Firebase 콘솔 > Firestore Database 에서 확인할 수 있습니다.
const databaseURL = 'https://jazzlink-eb611.firebaseio.com';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = admin.firestore();
const data = JSON.parse(readFileSync(join(__dirname, 'db_seed.json'), 'utf8'));

async function uploadData() {
  console.log('Firestore 데이터 업로드를 시작합니다...');
  
  // 기존 데이터를 삭제하고 싶을 경우, 아래 주석을 해제하세요. (주의!)
  /*
  console.log('기존 데이터를 삭제하는 중...');
  for (const collectionName in data) {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`'${collectionName}' 컬렉션 삭제 완료.`);
  }
  */

  for (const collectionName in data) {
    const collectionData = data[collectionName];
    console.log(`컬렉션 업로드 중: ${collectionName}...`);

    for (const docId in collectionData) {
      const docData = { ...collectionData[docId] };
      const docRef = db.collection(collectionName).doc(docId);

      // 메인 문서의 dateTime 필드를 Timestamp로 변환
      if (docData.dateTime && typeof docData.dateTime === 'string') {
        docData.dateTime = admin.firestore.Timestamp.fromDate(new Date(docData.dateTime));
      }

      const subcollections = {};
      
      // 'comments'와 같이 서브컬렉션으로 처리할 객체를 찾습니다.
      if (docData.comments) {
        subcollections['comments'] = docData.comments;
        delete docData.comments;
      }

      // 메인 문서를 업로드합니다.
      await docRef.set(docData);
      console.log(`  - 문서 업로드 완료: ${collectionName}/${docId}`);

      // 서브컬렉션을 업로드합니다.
      for (const subcollectionName in subcollections) {
        const subcollectionData = subcollections[subcollectionName];
        for (const subDocId in subcollectionData) {
          const subDocData = subcollectionData[subDocId];
          // 서브컬렉션 문서의 dateTime 필드를 Timestamp로 변환
          if (subDocData.dateTime && typeof subDocData.dateTime === 'string') {
             subDocData.dateTime = admin.firestore.Timestamp.fromDate(new Date(subDocData.dateTime));
          }
          await docRef.collection(subcollectionName).doc(subDocId).set(subDocData);
          console.log(`    - 서브컬렉션 문서 업로드 완료: ${collectionName}/${docId}/${subcollectionName}/${subDocId}`);
        }
      }
    }
  }
  console.log('--- 모든 데이터 업로드가 완료되었습니다! ---');
}

uploadData().catch(error => {
  console.error('데이터 업로드 중 오류 발생:', error);
});