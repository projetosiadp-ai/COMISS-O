import { collection, doc, getDocs, setDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebaseClient';

const LOCAL_STORAGE_KEY = 'dp_saved_reports_v2';

function getLocalReports() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Error reading local reports:', err);
    return [];
  }
}

function saveLocalReports(reports) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.error('Error writing local reports:', err);
  }
}

export async function getSavedReports() {
  let reports = [];
  if (db) {
    try {
      const q = query(collection(db, 'saved_reports'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      reports = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate()?.toISOString() || d.data().createdAt
      }));
    } catch (err) {
      console.error('Error fetching reports from Firestore:', err);
    }
  }

  const local = getLocalReports();
  const mergedMap = new Map();
  local.forEach(r => mergedMap.set(r.id || r.month || r.key, r));
  reports.forEach(r => mergedMap.set(r.id || r.month || r.key, { ...mergedMap.get(r.id || r.month || r.key), ...r }));

  const mergedList = Array.from(mergedMap.values());
  mergedList.sort((a, b) => (b.month || b.createdAt || '').localeCompare(a.month || a.createdAt || ''));
  return mergedList;
}

export async function saveReport(reportData) {
  const reportId = reportData.id || `${reportData.month || reportData.key}_${Date.now()}`;
  const completeReport = {
    ...reportData,
    id: reportId
  };

  const current = getLocalReports();
  const filtered = current.filter(r => r.id !== reportId && r.month !== completeReport.month);
  const updated = [completeReport, ...filtered];
  saveLocalReports(updated);

  if (db) {
    try {
      const reportRef = doc(collection(db, 'saved_reports'), reportId);
      await setDoc(reportRef, {
        ...completeReport,
        date: Timestamp.now()
      });
    } catch (err) {
      console.error('Error saving report to Firestore:', err);
    }
  }
}

export async function deleteReport(id) {
  const current = getLocalReports();
  const updated = current.filter(r => r.id !== id && r.month !== id && r.key !== id);
  saveLocalReports(updated);

  if (db) {
    try {
      await deleteDoc(doc(db, 'saved_reports', id));
    } catch (err) {
      console.error('Error deleting report from Firestore:', err);
    }
  }
}
