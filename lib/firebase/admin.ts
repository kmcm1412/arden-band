import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'

let _app: App | null = null

function getAdminApp(): App {
  if (_app) return _app
  if (getApps().length > 0) {
    _app = getApp()
    return _app
  }
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  _app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey,
    }),
  })
  return _app
}

let _db: Firestore | null = null
let _auth: Auth | null = null

export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp())
  return _db
}

export function getAdminAuth(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp())
  return _auth
}

// Lazy proxy exports — initialization deferred until first use at request time
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    const db = getAdminDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (db as any)[prop]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof value === 'function' ? (value as any).bind(db) : value
  },
})

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAdminAuth()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (auth as any)[prop]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof value === 'function' ? (value as any).bind(auth) : value
  },
})
