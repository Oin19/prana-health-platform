const DB_NAME = "prana-offline";
const STORE_NAME = "health-data";
const REPORT_STORE_NAME = "medical-reports";
const DB_VERSION = 2;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(REPORT_STORE_NAME)) {
        db.createObjectStore(REPORT_STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueHealthData(payload) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ payload, queuedAt: new Date().toISOString() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getQueuedHealthDataCount() {
  const db = await openDb();
  const count = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return count;
}

export async function syncQueuedHealthData(send) {
  const db = await openDb();
  const records = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  let synced = 0;
  for (const record of records) {
    try {
      await send(record.payload);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(record.id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      synced += 1;
    } catch {
      break;
    }
  }
  db.close();
  return synced;
}


export async function enqueueMedicalReport(patientId, file) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(REPORT_STORE_NAME, "readwrite");
    tx.objectStore(REPORT_STORE_NAME).add({ patientId, file, filename: file.name, queuedAt: new Date().toISOString() });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getQueuedMedicalReportCount() {
  const db = await openDb();
  const count = await new Promise((resolve, reject) => {
    const request = db.transaction(REPORT_STORE_NAME, "readonly").objectStore(REPORT_STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return count;
}

export async function syncQueuedMedicalReports(send) {
  const db = await openDb();
  const records = await new Promise((resolve, reject) => {
    const request = db.transaction(REPORT_STORE_NAME, "readonly").objectStore(REPORT_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  let synced = 0;
  for (const record of records) {
    try {
      await send(record.patientId, record.file);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(REPORT_STORE_NAME, "readwrite");
        tx.objectStore(REPORT_STORE_NAME).delete(record.id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      synced += 1;
    } catch {
      break;
    }
  }
  db.close();
  return synced;
}
