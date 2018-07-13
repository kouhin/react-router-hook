import createStore from 'unistore';

function mapActions(actionMap, store) {
  const acts = typeof actionMap === 'function' ? actionMap(store) : actionMap;
  const mapped = {};
  Object.keys(acts).forEach(k => {
    mapped[k] = store.action(acts[k]);
  });
  return mapped;
}

export { mapActions, createStore as createHookStore };
