export type UserRole = 'admin' | 'band_member'

export interface Membership {
  uid: string
  email: string
  role: UserRole
  active: boolean
  invitedAt: string
  approvedAt?: string
  displayName?: string
}

export interface Show {
  id?: string
  title: string
  venue: string
  location: string
  datetime: string
  ticketLink?: string
  notes?: string
  status: 'confirmed' | 'pending' | 'cancelled'
  isPublic: boolean
  createdAt?: string
}

export interface MerchItem {
  id?: string
  name: string
  description: string
  price: number
  imageUrl?: string
  category: string
  available: boolean
  createdAt?: string
}

export interface MediaItem {
  id?: string
  title: string
  youtubeId: string
  description?: string
  featured: boolean
  publishedAt?: string
}

export interface Availability {
  id?: string
  userId: string
  userEmail: string
  userName: string
  dates: string[]
  notes?: string
  updatedAt: string
}

export interface SetList {
  id?: string
  showId: string
  showTitle: string
  songs: SetListSong[]
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface SetListSong {
  id: string
  title: string
  key?: string
  notes?: string
  order: number
}

export interface Opportunity {
  id?: string
  venueName: string
  location: string
  email?: string
  notes?: string
  status: 'new' | 'contacted' | 'awaiting' | 'confirmed' | 'rejected'
  createdAt?: string
}

export interface ContactMessage {
  id?: string
  name: string
  email: string
  message: string
  createdAt?: string
  read: boolean
}
