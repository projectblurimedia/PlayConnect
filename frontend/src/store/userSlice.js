import { createSlice } from '@reduxjs/toolkit'

const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    theme: null,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
    },
    logout(state) {
      state.user = null
      state.token = null
      state.isAuthenticated = false
    },
    toggleTheme(state) {
      if (state.theme === 'dark') state.theme = 'light'
      else state.theme = 'dark'
    },
    setTheme(state, action) {
      state.theme = action.payload
    },
  },
})

export const { setUser, logout, toggleTheme, setTheme } = userSlice.actions
export default userSlice.reducer
