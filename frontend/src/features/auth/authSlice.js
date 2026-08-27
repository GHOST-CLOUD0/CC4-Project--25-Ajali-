import { createSlice } from "@reduxjs/toolkit";

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getInitialToken = () => {
  try {
    return localStorage.getItem("accessToken") || null;
  } catch {
    return null;
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: getInitialUser(),
    accessToken: getInitialToken(),
  },
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      try {
        if (action.payload.accessToken) {
          localStorage.setItem("accessToken", action.payload.accessToken);
        }
        if (action.payload.user) {
          localStorage.setItem("user", JSON.stringify(action.payload.user));
        }
      } catch {
        // Ignore localStorage write failures in restricted environments
      }
    },
    signOut(state) {
      state.user = null;
      state.accessToken = null;
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      } catch {
        // Ignore localStorage write failures
      }
    },
  },
});

export const { setCredentials, signOut } = authSlice.actions;
export default authSlice.reducer;
