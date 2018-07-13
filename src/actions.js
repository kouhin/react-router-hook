import delve from 'dlv';

export default {
  startLoading: (state, key, version) => {
    if (state[key] && state[key].version === version && !!state[key].loading) {
      return state;
    }
    return {
      ...state,
      [key]: {
        ...(state[key] || {}),
        version,
        loading: true
      }
    };
  },
  startTriggerHook: (state, key, hook, version) => {
    if (
      !state[key] ||
      state[key].version !== version ||
      delve(state, [key, 'hooks', hook]) === version
    ) {
      return state;
    }
    return {
      ...state,
      [key]: {
        ...state[key],
        hooks: {
          ...delve(state, [key, 'hooks'], {}),
          [hook]: version
        }
      }
    };
  },
  finishLoading: (state, key, version) => {
    if (!state[key] || state[key].version !== version) {
      return state;
    }
    return {
      ...state,
      [key]: {
        ...state[key],
        loading: false
      }
    };
  },
  updateProps: (state, key, props, version) => {
    if (!state[key] || state[key].version !== version) {
      return state;
    }
    return {
      ...state,
      [key]: {
        ...state[key],
        props
      }
    };
  }
};
