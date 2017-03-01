/* eslint-disable no-param-reassign */
import uuid from 'uuid';

import { routerHookPropName } from './constants';

const routerHooks = (hooks) => {
  hooks.id = hooks.id || uuid();
  return (Component) => {
    Component[routerHookPropName] = hooks;
    return Component;
  };
};

export default routerHooks;
