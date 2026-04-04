import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig)
  }
  return getApps()[0]
}

// Lazy getters — Firebase is only initialized when first accessed at runtime,
// not during static page prerendering at build time.
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAuth(getApp())
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(instance) : value
  },
})

let _dbInstance: Firestore | null = null
function getRealDb(): Firestore {
  if (!_dbInstance) _dbInstance = getFirestore(getApp())
  return _dbInstance
}

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getRealDb()
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(instance) : value
  },
  set(_target, prop, value) {
    ;(getRealDb() as unknown as Record<string | symbol, unknown>)[prop] = value
    return true
  },
  getPrototypeOf(_target) {
    return Object.getPrototypeOf(getRealDb())
  },
  has(_target, prop) {
    return prop in getRealDb()
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getRealDb())
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(getRealDb(), prop)
  },
})

export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_target, prop) {
    const instance = getStorage(getApp())
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(instance) : value
  },
})

export default { getApp }
