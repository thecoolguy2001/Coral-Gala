import { createContext, useContext, useReducer, useEffect } from 'react';

const AquariumEventContext = createContext(null);

function eventReducer(state, action) {
  switch (action.type) {
    case 'FEED':
      return { ...state, feedEvent: { id: Date.now(), ...action.payload, active: true } };
    case 'PET':
      return { ...state, petEvent: { id: Date.now(), ...action.payload, active: true } };
    case 'ADD_FISH':
      return { ...state, addFishEvent: { id: Date.now(), ...action.payload, active: true } };
    case 'CLEAR_FEED':
      return { ...state, feedEvent: null };
    case 'CLEAR_PET':
      return { ...state, petEvent: null };
    case 'CLEAR_ADD_FISH':
      return { ...state, addFishEvent: null };
    default:
      return state;
  }
}

export function AquariumEventProvider({ children }) {
  const [state, dispatch] = useReducer(eventReducer, {
    feedEvent: null,
    petEvent: null,
    addFishEvent: null,
  });

  // Auto-clear feed after 8s
  useEffect(() => {
    if (state.feedEvent) {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_FEED' }), 8000);
      return () => clearTimeout(timer);
    }
  }, [state.feedEvent?.id]);

  // Auto-clear pet after 3s
  useEffect(() => {
    if (state.petEvent) {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_PET' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.petEvent?.id]);

  // Auto-clear addFish after 0.5s (just needs to be consumed once)
  useEffect(() => {
    if (state.addFishEvent) {
      const timer = setTimeout(() => dispatch({ type: 'CLEAR_ADD_FISH' }), 500);
      return () => clearTimeout(timer);
    }
  }, [state.addFishEvent?.id]);

  return (
    <AquariumEventContext.Provider value={{ events: state, dispatch }}>
      {children}
    </AquariumEventContext.Provider>
  );
}

export function useAquariumEvents() {
  const context = useContext(AquariumEventContext);
  if (!context) throw new Error('useAquariumEvents must be used within AquariumEventProvider');
  return context;
}
