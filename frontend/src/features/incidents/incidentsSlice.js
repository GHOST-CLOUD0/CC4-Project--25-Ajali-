import { createSlice } from "@reduxjs/toolkit";

const incidentsSlice = createSlice({
  name: "incidents",
  initialState: { items: [], pagination: null, loading: false, error: null },
  reducers: {
    setIncidents(state, action) {
      state.items = action.payload.items;
      state.pagination = action.payload.pagination;
    },
  },
});

export const { setIncidents } = incidentsSlice.actions;
export default incidentsSlice.reducer;
