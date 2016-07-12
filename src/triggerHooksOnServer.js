import configureStore from './configureStore';
import { reloadAllComponents } from './routerModule';

export default function triggerHooksOnServer(renderProps, hooks = [], locals) {
  const store = configureStore({
    ...locals,
    routerWillEnterHooks: hooks,
  });
  return store.dispatch(reloadAllComponents(renderProps.components, renderProps))
    .then(() => store);
}
