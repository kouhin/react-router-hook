import { routerHookPropName } from './constants';

const routerHooks = hooks => (Component) => {
  // eslint-disable-next-line no-param-reassign
  Component[routerHookPropName] = hooks;
  return Component;
};

export default routerHooks;
