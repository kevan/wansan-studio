import { create } from 'zustand'

interface ChatStore {
  replyToId: string | null
  setReplyTo: (id: string | null) => void
}

export const useChatStore = create<ChatStore>(set => ({
  replyToId: null,
  setReplyTo: id => set({ replyToId: id }),
}))
