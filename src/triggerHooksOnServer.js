import getAllComponents from './getAllComponents';
import { routerHookPropName } from './constants';

export default function triggerHooksOnServer(
  renderProps,
  hooks = [],
  locals,
  {
    onComponentError = null,
  },
  callback,
) {
  const args = {
    ...renderProps,
    ...locals,
  };

  const promises = getAllComponents(renderProps.components)
    .map((component) => {
      const routerHooks = component[routerHookPropName];
      if (!routerHooks) return null;
      const runHooks = hooks.map(key => routerHooks[key]).filter(f => f);
      if (runHooks.length < 1) return null;
      return runHooks.reduce((total, current) => total.then(() => current(args)), Promise.resolve())
        .catch(err => onComponentError({ Component: component, error: err }));
    })
    .filter(p => p);

  if (callback) {
    Promise.all(promises)
      .then(() => {
        callback();
      })
      .catch(callback);
    return null;
  }
  return Promise.all(promises);
}
