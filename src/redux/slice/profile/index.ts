import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Doc } from '../../../../convex/_generated/dataModel'

export type ProfileState = {
  user: Doc<'users'> | null
}

const initialState: ProfileState = {
  user: null,
}

export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Doc<'users'> | null>) => {
      state.user = action.payload
    },
    clearProfile: (state) => {
      state.user = null
    },
  },
})

export const { setProfile, clearProfile } = profileSlice.actions
export default profileSlice.reducer
