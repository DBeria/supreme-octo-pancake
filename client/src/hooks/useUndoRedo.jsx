import { useState, useCallback } from 'react';

export const useUndoRedo = (initialState) => {
    const [state, setState] = useState({
        past: [],
        present: initialState,
        future: [],
    });

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    const undo = useCallback(() => {
        if (!canUndo) return;
        setState(currentState => {
            const newFuture = [currentState.present, ...currentState.future];
            const newPresent = currentState.past[currentState.past.length - 1];
            const newPast = currentState.past.slice(0, currentState.past.length - 1);
            return { past: newPast, present: newPresent, future: newFuture };
        });
    }, [canUndo]);

    const redo = useCallback(() => {
        if (!canRedo) return;
        setState(currentState => {
            const newPast = [...currentState.past, currentState.present];
            const newPresent = currentState.future[0];
            const newFuture = currentState.future.slice(1);
            return { past: newPast, present: newPresent, future: newFuture };
        });
    }, [canRedo]);
    
    const set = useCallback((newStateOrFn, preventPush = false) => {
        setState(currentState => {
            const newState = typeof newStateOrFn === 'function' 
                ? newStateOrFn(currentState.present) 
                : newStateOrFn;

            if (preventPush) {
                if (JSON.stringify(newState) === JSON.stringify(currentState.present)) {
                    return currentState;
                }
                return { ...currentState, present: newState };
            }
            
            if (JSON.stringify(newState) === JSON.stringify(currentState.present)) {
                return currentState;
            }

            return {
                past: [...currentState.past, currentState.present],
                present: newState,
                future: [],
            };
        });
    }, []);

    const push = useCallback((newStateOrFn) => {
        set(newStateOrFn, false);
    }, [set]);

    return { 
        state: state.present, 
        setState: set, 
        push, 
        undo, 
        redo, 
        canUndo, 
        canRedo 
    };
};