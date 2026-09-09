import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  User,
  Cinema,
  Sala,
  EquipmentModel,
  MaintenanceReport,
  ActivityLog,
  CompanyConfig,
  DashboardStats,
  TechnicalDemand,
  DemandStatus,
  EquipmentMovement,
  MovementType,
  MovementStatus,
  InventoryItem,
  StockStatus,
} from '../types';
import {
  SEED_COMPANY_CONFIG,
  SEED_USERS,
  SEED_CINEMAS,
  SEED_SALAS,
  SEED_MODELS,
  SEED_REPORTS,
  SEED_LOGS,
  SEED_DEMANDS,
  SEED_MOVEMENTS,
  SEED_INVENTORY,
} from '../data/seed';
import { ensureReportFitsFirestore } from '../utils/imageOptimizer';

const STORAGE_KEYS = {
  CURRENT_USER: 'cmm_current_user',
  USERS: 'cmm_users',
  CINEMAS: 'cmm_cinemas',
  SALAS: 'cmm_salas',
  MODELS: 'cmm_models',
  REPORTS: 'cmm_reports',
  LOGS: 'cmm_logs',
  COMPANY_CONFIG: 'cmm_company_config',
  THEME: 'cmm_theme',
  DEMANDS: 'cmm_demands',
  MOVEMENTS: 'cmm_movements',
  INVENTORY: 'cmm_inventory',
};

// Clean object helper: removes undefined values which are rejected by Firestore
function cleanForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Global update dispatcher
export function notifyDataChanged(type?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('calibracine_data_updated', { detail: { type } }));
  }
}

// Subscribe to store changes across components and devices
export function subscribeToStorageUpdates(callback: (type?: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    callback(customEvent.detail?.type);
  };
  window.addEventListener('calibracine_data_updated', handler);
  return () => window.removeEventListener('calibracine_data_updated', handler);
}

// Active Firestore listeners
let isFirestoreInitialized = false;
const unsubscribers: Unsubscribe[] = [];

// Safe Firestore Report Synchronizer (protects against >1MB size and network hiccups)
export async function safeSyncReportToFirestore(report: MaintenanceReport): Promise<void> {
  try {
    const firestoreSafeReport = await ensureReportFitsFirestore(report);
    await setDoc(
      doc(db, 'maintenance_reports', firestoreSafeReport.id),
      cleanForFirestore(firestoreSafeReport),
      { merge: true }
    );
  } catch (err) {
    console.warn(`Firestore sync error for report ${report.id}:`, err);
  }
}

// Initialize Firestore real-time listeners for all collections
export function initFirestoreSync(): void {
  if (isFirestoreInitialized || typeof window === 'undefined') return;
  isFirestoreInitialized = true;

  try {
    // 1. Cinemas listener (Safe Merge)
    const unsubCinemas = onSnapshot(
      collection(db, 'cinemas'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getCinemas();
          seed.forEach((item) => {
            setDoc(doc(db, 'cinemas', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const cloudMap = new Map<string, Cinema>();
          snapshot.forEach((d) => {
            const item = d.data() as Cinema;
            if (item?.id) cloudMap.set(item.id, item);
          });
          const localList = getCinemas();
          localList.forEach((localItem) => {
            if (!cloudMap.has(localItem.id)) {
              cloudMap.set(localItem.id, localItem);
              setDoc(doc(db, 'cinemas', localItem.id), cleanForFirestore(localItem), { merge: true }).catch(console.error);
            }
          });
          const list = Array.from(cloudMap.values());
          localStorage.setItem(STORAGE_KEYS.CINEMAS, JSON.stringify(list));
          notifyDataChanged('cinemas');
        }
      },
      (err) => console.warn('Firestore cinemas sync warning:', err)
    );
    unsubscribers.push(unsubCinemas);

    // 2. Salas listener (Safe Merge)
    const unsubSalas = onSnapshot(
      collection(db, 'salas'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getSalas();
          seed.forEach((item) => {
            setDoc(doc(db, 'salas', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const cloudMap = new Map<string, Sala>();
          snapshot.forEach((d) => {
            const item = d.data() as Sala;
            if (item?.id) cloudMap.set(item.id, item);
          });
          const localList = getSalas();
          localList.forEach((localItem) => {
            if (!cloudMap.has(localItem.id)) {
              cloudMap.set(localItem.id, localItem);
              setDoc(doc(db, 'salas', localItem.id), cleanForFirestore(localItem), { merge: true }).catch(console.error);
            }
          });
          const list = Array.from(cloudMap.values());
          list.sort((a, b) => a.number - b.number);
          localStorage.setItem(STORAGE_KEYS.SALAS, JSON.stringify(list));
          notifyDataChanged('salas');
        }
      },
      (err) => console.warn('Firestore salas sync warning:', err)
    );
    unsubscribers.push(unsubSalas);

    // 3. Equipment Models listener (Safe Merge)
    const unsubModels = onSnapshot(
      collection(db, 'equipment_models'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getEquipmentModels();
          seed.forEach((item) => {
            setDoc(doc(db, 'equipment_models', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const cloudMap = new Map<string, EquipmentModel>();
          snapshot.forEach((d) => {
            const item = d.data() as EquipmentModel;
            if (item?.id) cloudMap.set(item.id, item);
          });
          const localList = getEquipmentModels();
          localList.forEach((localItem) => {
            if (!cloudMap.has(localItem.id)) {
              cloudMap.set(localItem.id, localItem);
              setDoc(doc(db, 'equipment_models', localItem.id), cleanForFirestore(localItem), { merge: true }).catch(console.error);
            }
          });
          const list = Array.from(cloudMap.values());
          localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(list));
          notifyDataChanged('equipment_models');
        }
      },
      (err) => console.warn('Firestore equipment models sync warning:', err)
    );
    unsubscribers.push(unsubModels);

    // 4. Maintenance Reports listener (Resilient Non-Destructive Merger)
    const unsubReports = onSnapshot(
      collection(db, 'maintenance_reports'),
      (snapshot) => {
        const firestoreMap = new Map<string, MaintenanceReport>();
        snapshot.forEach((d) => {
          const item = d.data() as MaintenanceReport;
          if (item?.id) {
            firestoreMap.set(item.id, item);
          }
        });

        const currentLocal = getReports();

        if (snapshot.empty && currentLocal.length > 0) {
          currentLocal.forEach((item) => {
            safeSyncReportToFirestore(item);
          });
          return;
        }

        // Non-destructive merge: keep any local report that is not in Firestore snapshot
        const mergedMap = new Map<string, MaintenanceReport>();

        // 1. Add all from Firestore
        firestoreMap.forEach((rep, id) => {
          mergedMap.set(id, rep);
        });

        // 2. Keep and auto-sync any local report that hasn't made it to Firestore
        currentLocal.forEach((localRep) => {
          if (!mergedMap.has(localRep.id)) {
            mergedMap.set(localRep.id, localRep);
            safeSyncReportToFirestore(localRep);
          }
        });

        const list = Array.from(mergedMap.values());
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(list));
        notifyDataChanged('reports');
      },
      (err) => console.warn('Firestore reports sync warning:', err)
    );
    unsubscribers.push(unsubReports);

    // 5. Users listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getUsers();
          seed.forEach((item) => {
            setDoc(doc(db, 'users', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const cloudMap = new Map<string, User>();
          snapshot.forEach((d) => {
            const item = d.data() as User;
            if (item?.id) cloudMap.set(item.id, item);
          });
          const localList = getUsers();
          localList.forEach((localItem) => {
            if (!cloudMap.has(localItem.id)) {
              cloudMap.set(localItem.id, localItem);
              setDoc(doc(db, 'users', localItem.id), cleanForFirestore(localItem), { merge: true }).catch(console.error);
            }
          });
          const list = Array.from(cloudMap.values());
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
          notifyDataChanged('users');
        }
      },
      (err) => console.warn('Firestore users sync warning:', err)
    );
    unsubscribers.push(unsubUsers);

    // 6. Activity Logs listener
    const unsubLogs = onSnapshot(
      collection(db, 'activity_logs'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getActivityLogs();
          seed.slice(0, 50).forEach((item) => {
            setDoc(doc(db, 'activity_logs', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const list: ActivityLog[] = [];
          snapshot.forEach((d) => list.push(d.data() as ActivityLog));
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(list.slice(0, 200)));
          notifyDataChanged('logs');
        }
      },
      (err) => console.warn('Firestore logs sync warning:', err)
    );
    unsubscribers.push(unsubLogs);

    // 7. App Settings / Company Config listener
    const unsubSettings = onSnapshot(
      doc(db, 'app_settings', 'company'),
      (snapshot) => {
        if (snapshot.exists()) {
          const cloudConfig = snapshot.data() as CompanyConfig;
          localStorage.setItem(STORAGE_KEYS.COMPANY_CONFIG, JSON.stringify(cloudConfig));
          notifyDataChanged('company_config');
        } else {
          const currentConfig = getCompanyConfig();
          setDoc(doc(db, 'app_settings', 'company'), cleanForFirestore(currentConfig)).catch(console.error);
        }
      },
      (err) => console.warn('Firestore company settings sync warning:', err)
    );
    unsubscribers.push(unsubSettings);

    // 8. Technical Demands listener (Safe Merge)
    const unsubDemands = onSnapshot(
      collection(db, 'demands'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getTechnicalDemands();
          seed.forEach((item) => {
            setDoc(doc(db, 'demands', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const cloudMap = new Map<string, TechnicalDemand>();
          snapshot.forEach((d) => {
            const item = d.data() as TechnicalDemand;
            if (item?.id) cloudMap.set(item.id, item);
          });
          const localList = getTechnicalDemands();
          localList.forEach((localItem) => {
            if (!cloudMap.has(localItem.id)) {
              cloudMap.set(localItem.id, localItem);
              setDoc(doc(db, 'demands', localItem.id), cleanForFirestore(localItem), { merge: true }).catch(console.error);
            }
          });
          const list = Array.from(cloudMap.values());
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          localStorage.setItem(STORAGE_KEYS.DEMANDS, JSON.stringify(list));
          notifyDataChanged('demands');
        }
      },
      (err) => console.warn('Firestore demands sync warning:', err)
    );
    unsubscribers.push(unsubDemands);

    // 9. Equipment Movements listener (Safe Merge)
    const unsubMovements = onSnapshot(
      collection(db, 'movements'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getMovements();
          seed.forEach((item) => {
            setDoc(doc(db, 'movements', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const cloudMap = new Map<string, EquipmentMovement>();
          snapshot.forEach((d) => {
            const item = d.data() as EquipmentMovement;
            if (item?.id) cloudMap.set(item.id, item);
          });
          const localList = getMovements();
          localList.forEach((localItem) => {
            if (!cloudMap.has(localItem.id)) {
              cloudMap.set(localItem.id, localItem);
              setDoc(doc(db, 'movements', localItem.id), cleanForFirestore(localItem), { merge: true }).catch(console.error);
            }
          });
          const list = Array.from(cloudMap.values());
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(list));
          notifyDataChanged('movements');
        }
      },
      (err) => console.warn('Firestore movements sync warning:', err)
    );
    unsubscribers.push(unsubMovements);

    // 10. Inventory Items listener (Safe Merge)
    const unsubInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        if (snapshot.empty) {
          const seed = getInventory();
          seed.forEach((item) => {
            setDoc(doc(db, 'inventory', item.id), cleanForFirestore(item)).catch(console.error);
          });
        } else {
          const cloudMap = new Map<string, InventoryItem>();
          snapshot.forEach((d) => {
            const item = d.data() as InventoryItem;
            if (item?.id) cloudMap.set(item.id, item);
          });
          const localList = getInventory();
          localList.forEach((localItem) => {
            if (!cloudMap.has(localItem.id)) {
              cloudMap.set(localItem.id, localItem);
              setDoc(doc(db, 'inventory', localItem.id), cleanForFirestore(localItem), { merge: true }).catch(console.error);
            }
          });
          const list = Array.from(cloudMap.values());
          list.sort((a, b) => a.name.localeCompare(b.name));
          localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(list));
          notifyDataChanged('inventory');
        }
      },
      (err) => console.warn('Firestore inventory sync warning:', err)
    );
    unsubscribers.push(unsubInventory);
  } catch (err) {
    console.error('Error starting Firestore sync:', err);
  }
}

// Initialize Storage with seed data if empty and start cloud sync
export function initStorage(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(SEED_USERS));
  } else {
    try {
      const rawUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      if (rawUsers) {
        const usersList: User[] = JSON.parse(rawUsers);
        let updated = false;
        usersList.forEach((u) => {
          if (u.role === 'admin' && (u.password === 'admin' || !u.password)) {
            u.password = '257910';
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(usersList));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!localStorage.getItem(STORAGE_KEYS.CINEMAS)) {
    localStorage.setItem(STORAGE_KEYS.CINEMAS, JSON.stringify(SEED_CINEMAS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SALAS)) {
    localStorage.setItem(STORAGE_KEYS.SALAS, JSON.stringify(SEED_SALAS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MODELS)) {
    localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(SEED_MODELS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.REPORTS)) {
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(SEED_REPORTS));
  } else {
    try {
      const rawReports = localStorage.getItem(STORAGE_KEYS.REPORTS);
      if (rawReports) {
        const currentReports: MaintenanceReport[] = JSON.parse(rawReports);
        const has9988 = currentReports.some((r) => r.id === 'CMM-2026-9988');
        if (!has9988) {
          const report9988 = SEED_REPORTS.find((r) => r.id === 'CMM-2026-9988');
          if (report9988) {
            currentReports.unshift(report9988);
            localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(currentReports));
            safeSyncReportToFirestore(report9988);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(SEED_LOGS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.COMPANY_CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.COMPANY_CONFIG, JSON.stringify(SEED_COMPANY_CONFIG));
  }

  if (!localStorage.getItem(STORAGE_KEYS.DEMANDS)) {
    localStorage.setItem(STORAGE_KEYS.DEMANDS, JSON.stringify(SEED_DEMANDS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(SEED_MOVEMENTS));
  }

  if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(SEED_INVENTORY));
  }

  // Clear legacy localStorage auto-login user to force login screen on app load
  if (localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // Start real-time Firestore synchronization
  initFirestoreSync();
}

// Auth / Current User (Session-based to require login on app load)
export function getCurrentUser(): User | null {
  initStorage();
  const raw = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return raw ? JSON.parse(raw) : null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

// Users
export function getUsers(): User[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  return raw ? JSON.parse(raw) : [];
}

export function saveUser(user: User): User {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.unshift(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // Sync with Firestore Cloud DB
  setDoc(doc(db, 'users', user.id), cleanForFirestore(user), { merge: true }).catch(console.error);

  // If this is an admin user, keep CompanyConfig email in sync
  if (user.role === 'admin' && user.email) {
    const config = getCompanyConfig();
    config.email = user.email;
    if (config.smtp) {
      if (!config.smtp.fromEmail || config.smtp.fromEmail === config.email) {
        config.smtp.fromEmail = user.email;
      }
      if (!config.smtp.user || config.smtp.user === config.email) {
        config.smtp.user = user.email;
      }
    }
    saveCompanyConfig(config);
  }

  notifyDataChanged('users');
  return user;
}

export function deleteUser(id: string): void {
  const users = getUsers().filter((u) => u.id !== id);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // Delete from Firestore Cloud DB
  deleteDoc(doc(db, 'users', id)).catch(console.error);
  notifyDataChanged('users');
}

// Cinemas
export function getCinemas(): Cinema[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.CINEMAS);
  return raw ? JSON.parse(raw) : [];
}

export function saveCinema(cinema: Cinema): Cinema {
  const cinemas = getCinemas();
  const index = cinemas.findIndex((c) => c.id === cinema.id);
  if (index >= 0) {
    cinemas[index] = cinema;
  } else {
    cinemas.unshift(cinema);
  }
  localStorage.setItem(STORAGE_KEYS.CINEMAS, JSON.stringify(cinemas));

  // Sync with Firestore Cloud DB
  setDoc(doc(db, 'cinemas', cinema.id), cleanForFirestore(cinema), { merge: true }).catch(console.error);
  notifyDataChanged('cinemas');
  return cinema;
}

export function deleteCinema(id: string): void {
  const cinemas = getCinemas().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CINEMAS, JSON.stringify(cinemas));

  // Clean up salas associated with this cinema
  const remainingSalas = getSalas().filter((s) => s.cinemaId !== id);
  const deletedSalas = getSalas().filter((s) => s.cinemaId === id);
  localStorage.setItem(STORAGE_KEYS.SALAS, JSON.stringify(remainingSalas));

  // Delete from Firestore Cloud DB
  deleteDoc(doc(db, 'cinemas', id)).catch(console.error);
  deletedSalas.forEach((s) => {
    deleteDoc(doc(db, 'salas', s.id)).catch(console.error);
  });

  notifyDataChanged('cinemas');
}

// Salas
export function getSalas(): Sala[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.SALAS);
  return raw ? JSON.parse(raw) : [];
}

export function saveSala(sala: Sala): Sala {
  const salas = getSalas();
  const cinemas = getCinemas();
  const cinema = cinemas.find((c) => c.id === sala.cinemaId);
  if (cinema) {
    sala.cinemaName = cinema.name;
  }

  const index = salas.findIndex((s) => s.id === sala.id);
  if (index >= 0) {
    salas[index] = sala;
  } else {
    salas.unshift(sala);
  }
  localStorage.setItem(STORAGE_KEYS.SALAS, JSON.stringify(salas));

  // Sync with Firestore Cloud DB
  setDoc(doc(db, 'salas', sala.id), cleanForFirestore(sala), { merge: true }).catch(console.error);
  notifyDataChanged('salas');
  return sala;
}

export function deleteSala(id: string): void {
  const salas = getSalas().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SALAS, JSON.stringify(salas));

  // Delete from Firestore Cloud DB
  deleteDoc(doc(db, 'salas', id)).catch(console.error);
  notifyDataChanged('salas');
}

// Models
export function getEquipmentModels(): EquipmentModel[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.MODELS);
  return raw ? JSON.parse(raw) : [];
}

export function saveEquipmentModel(model: EquipmentModel): EquipmentModel {
  const models = getEquipmentModels();
  const index = models.findIndex((m) => m.id === model.id);
  if (index >= 0) {
    models[index] = model;
  } else {
    models.unshift(model);
  }
  localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models));

  // Sync with Firestore Cloud DB
  setDoc(doc(db, 'equipment_models', model.id), cleanForFirestore(model), { merge: true }).catch(console.error);
  notifyDataChanged('equipment_models');
  return model;
}

export function deleteEquipmentModel(id: string): void {
  const models = getEquipmentModels().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models));

  // Delete from Firestore Cloud DB
  deleteDoc(doc(db, 'equipment_models', id)).catch(console.error);
  notifyDataChanged('equipment_models');
}

// Maintenance Reports
export function getReports(): MaintenanceReport[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
  return raw ? JSON.parse(raw) : [];
}

export function getReportById(id: string): MaintenanceReport | undefined {
  return getReports().find((r) => r.id === id);
}

export function saveReport(report: MaintenanceReport): MaintenanceReport {
  const reports = getReports();
  const updatedReport: MaintenanceReport = {
    ...report,
    updatedAt: new Date().toISOString(),
    createdAt: report.createdAt || new Date().toISOString(),
  };

  const index = reports.findIndex((r) => r.id === report.id);
  if (index >= 0) {
    reports[index] = updatedReport;
  } else {
    reports.unshift(updatedReport);
  }
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

  // Sync with Firestore Cloud DB safely with image optimization
  safeSyncReportToFirestore(updatedReport);
  notifyDataChanged('reports');
  return updatedReport;
}

export function deleteReport(id: string): void {
  const reports = getReports().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

  // Delete from Firestore Cloud DB
  deleteDoc(doc(db, 'maintenance_reports', id)).catch(console.error);
  notifyDataChanged('reports');
}

// Company Config
export function getCompanyConfig(): CompanyConfig {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.COMPANY_CONFIG);
  const config: CompanyConfig = raw ? JSON.parse(raw) : { ...SEED_COMPANY_CONFIG };

  // Sanitize default or dummy emails
  if (!config.email || config.email.includes('calibracine.com')) {
    const adminUser = getUsers().find((u) => u.role === 'admin');
    if (adminUser?.email && !adminUser.email.includes('calibracine.com')) {
      config.email = adminUser.email;
    }
  }

  if (config.smtp) {
    if (config.smtp.fromEmail && (config.smtp.fromEmail.includes('calibracine.com') || config.smtp.fromEmail.includes('nao-responda'))) {
      config.smtp.fromEmail = config.email;
    }
    if (config.smtp.user && (config.smtp.user.includes('calibracine.com') || config.smtp.user.includes('nao-responda'))) {
      config.smtp.user = config.email;
    }
  }

  return config;
}

export function saveCompanyConfig(config: CompanyConfig): CompanyConfig {
  // Sanitize smtp values if placeholder
  if (config.smtp) {
    if (config.smtp.fromEmail && (config.smtp.fromEmail.includes('calibracine.com') || config.smtp.fromEmail.includes('nao-responda'))) {
      config.smtp.fromEmail = config.email;
    }
    if (config.smtp.user && (config.smtp.user.includes('calibracine.com') || config.smtp.user.includes('nao-responda'))) {
      config.smtp.user = config.email;
    }
  }

  localStorage.setItem(STORAGE_KEYS.COMPANY_CONFIG, JSON.stringify(config));

  // Sync with Firestore Cloud DB
  setDoc(doc(db, 'app_settings', 'company'), cleanForFirestore(config), { merge: true }).catch(console.error);

  // Sync official email with admin user profile
  if (config.email) {
    const users = getUsers();
    const adminIndex = users.findIndex((u) => u.role === 'admin');
    if (adminIndex >= 0) {
      users[adminIndex].email = config.email;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      setDoc(doc(db, 'users', users[adminIndex].id), cleanForFirestore(users[adminIndex]), { merge: true }).catch(console.error);
    }
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      currentUser.email = config.email;
      setCurrentUser(currentUser);
    }
  }

  notifyDataChanged('company_config');
  return config;
}

// Activity Logs
export function getActivityLogs(): ActivityLog[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
  return raw ? JSON.parse(raw) : [];
}

export function addActivityLog(action: string, details: string, user?: User | null): void {
  const logs = getActivityLogs();
  const activeUser = user || getCurrentUser();
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: activeUser?.id || 'sys',
    userName: activeUser?.name || 'Sistema',
    userRole: activeUser?.role || 'admin',
    action,
    details,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  // Keep max 200 logs locally
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 200)));

  // Save to Firestore
  setDoc(doc(db, 'activity_logs', newLog.id), cleanForFirestore(newLog)).catch(console.error);
  notifyDataChanged('logs');
}

export function deleteActivityLog(id: string): void {
  const logs = getActivityLogs().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));

  // Delete from Firestore
  deleteDoc(doc(db, 'activity_logs', id)).catch(console.error);
  notifyDataChanged('logs');
}

export function deleteMultipleActivityLogs(ids: string[]): void {
  const set = new Set(ids);
  const logs = getActivityLogs().filter((l) => !set.has(l.id));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));

  // Batch delete from Firestore
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.delete(doc(db, 'activity_logs', id));
    });
    batch.commit().catch(console.error);
  } catch (e) {
    console.error('Error batch deleting logs:', e);
  }

  notifyDataChanged('logs');
}

export function clearAllActivityLogs(): void {
  const currentLogs = getActivityLogs();
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));

  // Delete all log docs in Firestore
  try {
    getDocs(collection(db, 'activity_logs')).then((snapshot) => {
      const batch = writeBatch(db);
      snapshot.forEach((d) => batch.delete(d.ref));
      batch.commit().catch(console.error);
    }).catch(console.error);
  } catch (e) {
    console.error('Error clearing Firestore logs:', e);
  }

  notifyDataChanged('logs');
}

// Stats for Dashboard
export function getDashboardStats(): DashboardStats {
  const cinemas = getCinemas();
  const salas = getSalas();
  const users = getUsers();
  const reports = getReports();

  const technicians = users.filter((u) => u.role === 'technician');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  const reportsToday = reports.filter((r) => r.date === todayStr).length;
  const reportsThisMonth = reports.filter((r) => r.date?.startsWith(currentMonthStr)).length;

  let totalEquipments = 0;
  let totalPhotos = 0;

  reports.forEach((r) => {
    totalEquipments += r.equipmentItems ? r.equipmentItems.length : 0;
    totalPhotos += r.photos ? r.photos.length : 0;
  });

  return {
    totalCinemas: cinemas.length,
    totalSalas: salas.length,
    totalTechnicians: technicians.length,
    totalReports: reports.length,
    reportsToday,
    reportsThisMonth,
    totalEquipments,
    totalPhotos,
  };
}

// Technical Demands (Demandas Técnicas)
export function getTechnicalDemands(): TechnicalDemand[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.DEMANDS);
  if (!raw) return [];
  try {
    const list: TechnicalDemand[] = JSON.parse(raw);
    // Sort newest created first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error('Error parsing demands:', e);
    return [];
  }
}

export function getTechnicalDemandById(id: string): TechnicalDemand | null {
  const demands = getTechnicalDemands();
  return demands.find((d) => d.id === id) || null;
}

export function saveTechnicalDemand(demand: TechnicalDemand, user?: User | null): void {
  initStorage();
  const demands = getTechnicalDemands();
  const index = demands.findIndex((d) => d.id === demand.id);
  const now = new Date().toISOString();
  const isNew = index < 0;

  const updatedDemand: TechnicalDemand = {
    ...demand,
    updatedAt: now,
    completedAt: demand.status === 'Concluido' ? demand.completedAt || now : undefined,
  };

  if (isNew) {
    demands.unshift(updatedDemand);
  } else {
    demands[index] = updatedDemand;
  }

  localStorage.setItem(STORAGE_KEYS.DEMANDS, JSON.stringify(demands));

  // Sync to Firestore
  try {
    setDoc(doc(db, 'demands', updatedDemand.id), cleanForFirestore(updatedDemand)).catch((err) =>
      console.error('Firestore saveDemand error:', err)
    );
  } catch (err) {
    console.error('Cloud saveDemand error:', err);
  }

  addActivityLog(
    isNew ? 'CRIAR_DEMANDA' : 'ATUALIZAR_DEMANDA',
    `Demanda ${updatedDemand.id} ("${updatedDemand.title}") para ${updatedDemand.cinemaName} - ${updatedDemand.salaName} salva com status ${updatedDemand.status}`,
    user || getCurrentUser()
  );

  notifyDataChanged('demands');
}

export function deleteTechnicalDemand(id: string, user?: User | null): void {
  initStorage();
  const demands = getTechnicalDemands();
  const target = demands.find((d) => d.id === id);
  const filtered = demands.filter((d) => d.id !== id);
  localStorage.setItem(STORAGE_KEYS.DEMANDS, JSON.stringify(filtered));

  // Remove from Firestore
  try {
    deleteDoc(doc(db, 'demands', id)).catch((err) =>
      console.error('Firestore deleteDemand error:', err)
    );
  } catch (err) {
    console.error('Cloud deleteDemand error:', err);
  }

  if (target) {
    addActivityLog(
      'EXCLUIR_DEMANDA',
      `Demanda técnica ${id} (${target.title}) foi removida`,
      user || getCurrentUser()
    );
  }

  notifyDataChanged('demands');
}

export function deleteMultipleTechnicalDemands(ids: string[], user?: User | null): void {
  if (!ids || ids.length === 0) return;
  initStorage();
  const demands = getTechnicalDemands();
  const idSet = new Set(ids);
  const filtered = demands.filter((d) => !idSet.has(d.id));
  localStorage.setItem(STORAGE_KEYS.DEMANDS, JSON.stringify(filtered));

  // Remove batch from Firestore
  try {
    ids.forEach((id) => {
      deleteDoc(doc(db, 'demands', id)).catch((err) =>
        console.error('Firestore deleteDemand error:', err)
      );
    });
  } catch (err) {
    console.error('Cloud batch deleteDemands error:', err);
  }

  addActivityLog(
    'EXCLUIR_DEMANDA',
    `${ids.length} demandas técnicas foram excluídas`,
    user || getCurrentUser()
  );

  notifyDataChanged('demands');
}

export function updateDemandStatus(id: string, newStatus: DemandStatus, user?: User | null): void {
  const demand = getTechnicalDemandById(id);
  if (!demand) return;

  const now = new Date().toISOString();
  const updatedDemand: TechnicalDemand = {
    ...demand,
    status: newStatus,
    updatedAt: now,
    completedAt: newStatus === 'Concluido' ? now : undefined,
  };

  saveTechnicalDemand(updatedDemand, user);
}

export function updateDemandObservation(id: string, observationText: string, user?: User | null): void {
  const demand = getTechnicalDemandById(id);
  if (!demand) return;

  const now = new Date().toISOString();
  const currentUser = user || getCurrentUser();

  const newHistory = [...(demand.observationHistory || [])];
  if (observationText.trim()) {
    newHistory.push({
      id: `obs-${Date.now()}`,
      authorId: currentUser?.id || 'admin',
      authorName: currentUser?.name || 'Técnico / Administrador',
      text: observationText.trim(),
      createdAt: now,
    });
  }

  const updatedDemand: TechnicalDemand = {
    ...demand,
    observations: observationText,
    observationHistory: newHistory,
    updatedAt: now,
  };

  saveTechnicalDemand(updatedDemand, user);
}

// Equipment Movements (Movimentações de Equipamentos entre Cinemas)
export function getMovements(): EquipmentMovement[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
  if (!raw) return [];
  try {
    const list: EquipmentMovement[] = JSON.parse(raw);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (e) {
    console.error('Error parsing movements:', e);
    return [];
  }
}

export function getMovementById(id: string): EquipmentMovement | null {
  const movements = getMovements();
  return movements.find((m) => m.id === id) || null;
}

export function saveMovement(movement: EquipmentMovement, user?: User | null): void {
  initStorage();
  const movements = getMovements();
  const index = movements.findIndex((m) => m.id === movement.id);
  const now = new Date().toISOString();
  const isNew = index < 0;

  const updatedMovement: EquipmentMovement = {
    ...movement,
    updatedAt: now,
    completedAt: movement.status === 'Finalizado' ? movement.completedAt || now : undefined,
  };

  if (isNew) {
    movements.unshift(updatedMovement);
  } else {
    movements[index] = updatedMovement;
  }

  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));

  // Sync to Firestore
  try {
    setDoc(doc(db, 'movements', updatedMovement.id), cleanForFirestore(updatedMovement)).catch((err) =>
      console.error('Firestore saveMovement error:', err)
    );
  } catch (err) {
    console.error('Cloud saveMovement error:', err);
  }

  addActivityLog(
    isNew ? 'CRIAR_MOVIMENTACAO' : 'ATUALIZAR_MOVIMENTACAO',
    `Movimentação ${updatedMovement.id} (${updatedMovement.type}) de "${updatedMovement.equipmentDescription}" de ${updatedMovement.sourceCinemaName} para ${updatedMovement.destinationCinemaName} [${updatedMovement.status}]`,
    user || getCurrentUser()
  );

  notifyDataChanged('movements');
}

export function deleteMovement(id: string, user?: User | null): void {
  initStorage();
  const movements = getMovements();
  const target = movements.find((m) => m.id === id);
  const filtered = movements.filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(filtered));

  // Remove from Firestore
  try {
    deleteDoc(doc(db, 'movements', id)).catch((err) =>
      console.error('Firestore deleteMovement error:', err)
    );
  } catch (err) {
    console.error('Cloud deleteMovement error:', err);
  }

  if (target) {
    addActivityLog(
      'EXCLUIR_MOVIMENTACAO',
      `Movimentação ${id} (${target.equipmentDescription} - ${target.type}) foi removida`,
      user || getCurrentUser()
    );
  }

  notifyDataChanged('movements');
}

export function deleteMultipleMovements(ids: string[], user?: User | null): void {
  if (!ids || ids.length === 0) return;
  initStorage();
  const movements = getMovements();
  const idSet = new Set(ids);
  const filtered = movements.filter((m) => !idSet.has(m.id));
  localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(filtered));

  // Remove batch from Firestore
  try {
    ids.forEach((id) => {
      deleteDoc(doc(db, 'movements', id)).catch((err) =>
        console.error('Firestore deleteMovement error:', err)
      );
    });
  } catch (err) {
    console.error('Cloud batch deleteMovements error:', err);
  }

  addActivityLog(
    'EXCLUIR_MOVIMENTACAO',
    `${ids.length} movimentações de equipamentos foram excluídas`,
    user || getCurrentUser()
  );

  notifyDataChanged('movements');
}

export function completeMovement(
  id: string,
  completedNotes?: string,
  user?: User | null
): void {
  const movement = getMovementById(id);
  if (!movement) return;

  const now = new Date().toISOString();
  const currentUser = user || getCurrentUser();

  const updated: EquipmentMovement = {
    ...movement,
    status: 'Finalizado',
    completedAt: now,
    completedNotes: completedNotes !== undefined ? completedNotes : movement.completedNotes,
    completedById: currentUser?.id,
    completedByName: currentUser?.name || 'Técnico / Administrador',
    updatedAt: now,
  };

  saveMovement(updated, user);
}

export function updateMovementStatus(
  id: string,
  newStatus: MovementStatus,
  user?: User | null
): void {
  const movement = getMovementById(id);
  if (!movement) return;

  const now = new Date().toISOString();
  const currentUser = user || getCurrentUser();

  const updated: EquipmentMovement = {
    ...movement,
    status: newStatus,
    completedAt: newStatus === 'Finalizado' ? (movement.completedAt || now) : undefined,
    completedById: newStatus === 'Finalizado' ? (movement.completedById || currentUser?.id) : undefined,
    completedByName: newStatus === 'Finalizado' ? (movement.completedByName || currentUser?.name) : undefined,
    updatedAt: now,
  };

  saveMovement(updated, user);
}

// ==========================================
// INVENTORY & STOCK MANAGEMENT
// ==========================================

export function calculateStockStatus(quantity: number, minQuantity: number = 0): StockStatus {
  if (quantity <= 0) return 'Sem Estoque';
  if (minQuantity > 0 && quantity <= minQuantity) return 'Baixo Estoque';
  return 'Em Estoque';
}

export function getInventory(cinemaId?: string): InventoryItem[] {
  initStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
  if (!raw) return [];
  try {
    const list: InventoryItem[] = JSON.parse(raw);
    if (cinemaId && cinemaId !== 'all') {
      return list.filter((i) => i.cinemaId === cinemaId);
    }
    return list;
  } catch (err) {
    console.error('Error reading inventory:', err);
    return [];
  }
}

export function getInventoryItemById(id: string): InventoryItem | null {
  const list = getInventory();
  return list.find((i) => i.id === id) || null;
}

export function saveInventoryItem(item: InventoryItem, user?: User | null): void {
  initStorage();
  const list = getInventory();
  const index = list.findIndex((i) => i.id === item.id);
  const now = new Date().toISOString();
  const currentUser = user || getCurrentUser();

  // Ensure status reflects current quantity & minQuantity
  const effectiveStatus = calculateStockStatus(item.quantity, item.minQuantity || 0);

  const updatedItem: InventoryItem = {
    ...item,
    status: effectiveStatus,
    updatedAt: now,
    createdById: item.createdById || currentUser?.id,
    createdByName: item.createdByName || currentUser?.name,
  };

  let actionType = 'create';
  if (index >= 0) {
    list[index] = updatedItem;
    actionType = 'update';
  } else {
    list.unshift(updatedItem);
  }

  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(list));

  // Sync to Firestore
  try {
    setDoc(doc(db, 'inventory', updatedItem.id), cleanForFirestore(updatedItem)).catch(console.error);
  } catch (cloudErr) {
    console.error('Error syncing inventory item to Firestore:', cloudErr);
  }

  // Activity log
  addActivityLog(
    actionType === 'create' ? 'Cadastrou item no estoque' : 'Atualizou item no estoque',
    `${updatedItem.name} (${updatedItem.quantity} ${updatedItem.unit || 'un.'}) no cinema ${updatedItem.cinemaName}`,
    currentUser
  );

  notifyDataChanged('inventory');
}

export function deleteInventoryItem(id: string, user?: User | null): void {
  initStorage();
  const list = getInventory();
  const item = list.find((i) => i.id === id);
  const currentUser = user || getCurrentUser();

  const filtered = list.filter((i) => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(filtered));

  // Delete from Firestore
  try {
    deleteDoc(doc(db, 'inventory', id)).catch(console.error);
  } catch (cloudErr) {
    console.error('Error deleting inventory item from Firestore:', cloudErr);
  }

  if (item) {
    addActivityLog(
      'Excluiu item do estoque',
      `${item.name} (${item.cinemaName})`,
      currentUser
    );
  }

  notifyDataChanged('inventory');
}

export function deleteMultipleInventoryItems(ids: string[], user?: User | null): void {
  if (!ids || ids.length === 0) return;
  initStorage();
  const list = getInventory();
  const idsSet = new Set(ids);
  const currentUser = user || getCurrentUser();

  const remaining = list.filter((i) => !idsSet.has(i.id));
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(remaining));

  // Batch delete from Firestore
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.delete(doc(db, 'inventory', id));
    });
    batch.commit().catch(console.error);
  } catch (cloudErr) {
    console.error('Error deleting multiple inventory items in Firestore:', cloudErr);
  }

  addActivityLog(
    'Exclusão em lote de itens de estoque',
    `Excluídos ${ids.length} itens do inventário de estoque.`,
    currentUser
  );

  notifyDataChanged('inventory');
}

export function adjustInventoryQuantity(
  id: string,
  delta: number,
  reason?: string,
  user?: User | null
): void {
  const item = getInventoryItemById(id);
  if (!item) return;

  const newQuantity = Math.max(0, (item.quantity || 0) + delta);
  const now = new Date().toISOString();
  const currentUser = user || getCurrentUser();

  const updated: InventoryItem = {
    ...item,
    quantity: newQuantity,
    status: calculateStockStatus(newQuantity, item.minQuantity || 0),
    lastRestockDate: delta > 0 ? now.split('T')[0] : item.lastRestockDate,
    updatedAt: now,
  };

  saveInventoryItem(updated, currentUser);

  const directionStr = delta > 0 ? `Entrada de +${delta}` : `Saída de ${delta}`;
  addActivityLog(
    'Ajuste de quantidade em estoque',
    `${directionStr} un. em "${item.name}" (${item.cinemaName}). Saldo atual: ${newQuantity}. Motivo: ${reason || 'Ajuste operacional'}`,
    currentUser
  );
}

// Backup & Restore
export function exportDatabaseJSON(): string {
  initStorage();
  const data = {
    version: '2.4',
    exportedAt: new Date().toISOString(),
    companyConfig: getCompanyConfig(),
    users: getUsers(),
    cinemas: getCinemas(),
    salas: getSalas(),
    models: getEquipmentModels(),
    reports: getReports(),
    demands: getTechnicalDemands(),
    movements: getMovements(),
    inventory: getInventory(),
    logs: getActivityLogs(),
  };
  return JSON.stringify(data, null, 2);
}

export function importDatabaseJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.users && parsed.cinemas && parsed.reports) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(parsed.users));
      localStorage.setItem(STORAGE_KEYS.CINEMAS, JSON.stringify(parsed.cinemas));
      localStorage.setItem(STORAGE_KEYS.SALAS, JSON.stringify(parsed.salas || []));
      localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(parsed.models || []));
      localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(parsed.reports));
      if (parsed.demands) {
        localStorage.setItem(STORAGE_KEYS.DEMANDS, JSON.stringify(parsed.demands));
      }
      if (parsed.movements) {
        localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(parsed.movements));
      }
      if (parsed.inventory) {
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(parsed.inventory));
      }
      if (parsed.companyConfig) {
        localStorage.setItem(STORAGE_KEYS.COMPANY_CONFIG, JSON.stringify(parsed.companyConfig));
      }
      if (parsed.logs) {
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(parsed.logs));
      }

      // Sync imported dataset to Firestore
      try {
        const batch = writeBatch(db);
        if (parsed.companyConfig) {
          batch.set(doc(db, 'app_settings', 'company'), cleanForFirestore(parsed.companyConfig));
        }
        parsed.users.forEach((u: User) => batch.set(doc(db, 'users', u.id), cleanForFirestore(u)));
        parsed.cinemas.forEach((c: Cinema) => batch.set(doc(db, 'cinemas', c.id), cleanForFirestore(c)));
        (parsed.salas || []).forEach((s: Sala) => batch.set(doc(db, 'salas', s.id), cleanForFirestore(s)));
        (parsed.models || []).forEach((m: EquipmentModel) => batch.set(doc(db, 'equipment_models', m.id), cleanForFirestore(m)));
        parsed.reports.forEach((r: MaintenanceReport) => batch.set(doc(db, 'maintenance_reports', r.id), cleanForFirestore(r)));
        (parsed.demands || []).forEach((d: TechnicalDemand) => batch.set(doc(db, 'demands', d.id), cleanForFirestore(d)));
        (parsed.movements || []).forEach((mov: EquipmentMovement) => batch.set(doc(db, 'movements', mov.id), cleanForFirestore(mov)));
        (parsed.inventory || []).forEach((inv: InventoryItem) => batch.set(doc(db, 'inventory', inv.id), cleanForFirestore(inv)));
        batch.commit().catch(console.error);
      } catch (cloudErr) {
        console.error('Error syncing imported data to Firestore:', cloudErr);
      }

      notifyDataChanged();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error importing DB JSON:', err);
    return false;
  }
}

