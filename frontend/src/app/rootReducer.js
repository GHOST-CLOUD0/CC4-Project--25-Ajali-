import authReducer from "../features/auth/authSlice";
import incidentsReducer from "../features/incidents/incidentsSlice";

const rootReducer = {
  auth: authReducer,
  incidents: incidentsReducer,
};

export default rootReducer;
