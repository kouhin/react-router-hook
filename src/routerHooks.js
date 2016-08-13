import { routerHookPropName } from './constants';

const routerHooks = hooks => Component => {
  Component[routerHookPropName] = hooks; // eslint-disable-line no-param-reassign
};

export default routerHooks;
