import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type Conversation = {
  messages: ChatMessage[]
  /** Id of the assistant message currently being written into, if any. */
  streamingId: string | null
}

type ChatState = {
  /** The design whose chat window is open. One at a time. */
  openFor: string | null
  /** Keyed by shape id — every screen keeps its own history. */
  byShape: Record<string, Conversation>
}

const initialState: ChatState = { openFor: null, byShape: {} }

const conversationFor = (state: ChatState, shapeId: string): Conversation => {
  state.byShape[shapeId] ??= { messages: [], streamingId: null }
  return state.byShape[shapeId]
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    toggleChat: (state, action: PayloadAction<string>) => {
      state.openFor = state.openFor === action.payload ? null : action.payload
    },
    closeChat: (state) => {
      state.openFor = null
    },

    addUserMessage: {
      reducer: (state, action: PayloadAction<{ shapeId: string; id: string; text: string }>) => {
        const { shapeId, id, text } = action.payload
        conversationFor(state, shapeId).messages.push({ id, role: 'user', text })
      },
      prepare: (shapeId: string, text: string) => ({ payload: { shapeId, id: nanoid(), text } }),
    },

    /** Opens an empty assistant message for the stream to fill. */
    startAssistantMessage: {
      reducer: (state, action: PayloadAction<{ shapeId: string; id: string }>) => {
        const { shapeId, id } = action.payload
        const conversation = conversationFor(state, shapeId)
        conversation.messages.push({ id, role: 'assistant', text: '' })
        conversation.streamingId = id
      },
      prepare: (shapeId: string) => ({ payload: { shapeId, id: nanoid() } }),
    },

    setAssistantText: (
      state,
      action: PayloadAction<{ shapeId: string; id: string; text: string }>,
    ) => {
      const { shapeId, id, text } = action.payload
      const message = conversationFor(state, shapeId).messages.find((m) => m.id === id)
      if (message) message.text = text
    },

    endAssistantMessage: (state, action: PayloadAction<{ shapeId: string }>) => {
      conversationFor(state, action.payload.shapeId).streamingId = null
    },
  },
})

export const {
  toggleChat,
  closeChat,
  addUserMessage,
  startAssistantMessage,
  setAssistantText,
  endAssistantMessage,
} = chatSlice.actions

export default chatSlice.reducer
