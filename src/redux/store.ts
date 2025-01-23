import { configureStore, combineReducers, createAction, Action } from "@reduxjs/toolkit";
import neurojsonReducer from "./neurojson/neurojson.slice";

const appReducer = combineReducers({
  neurojson: neurojsonReducer, // Add other slices here as needed
});

export const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: Action<string>) => {
  if (action.type === "RESET_STATE") {
    // Reset the Redux state when the RESET_STATE action is dispatched
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

// Configure the Redux store
export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== "production", // Enable Redux dev tools in development
});

// Action to reset the Redux state
export const restoreReduxState = createAction("RESET_STATE");

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
