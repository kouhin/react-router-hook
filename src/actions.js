import get from 'dlv';

export default store => ({
  reset: (state, version) => {
    if (state.version !== version) {
      store.setState({ version }, true);
    }
  },
  startLoading: (state, key, hook, version) => {
    if (
      state.version !== version ||
      get(state, [key, 'hooks', hook]) === version
    ) {
      return null;
    }
    return {
      [key]: {
        ...(state[key] || {}),
        hooks: {
          ...get(state, [key, 'hooks'], {}),
          [hook]: version
        },
        loading: true
      }
    };
  },
  finishLoading: (state, key, version) => {
    if (state.version !== version) {
      return null;
    }
    return {
      [key]: {
        ...(state[key] || {}),
        loading: false
      }
    };
  },
  updateProps: (state, key, props, version) => {
    if (state.version !== version) {
      return null;
    }
    return {
      [key]: {
        ...(state[key] || {}),
        props
      }
    };
  }
});
