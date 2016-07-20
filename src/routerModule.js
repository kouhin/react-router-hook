import getAllComponents from './getAllComponents';
import getInitStatus from './getInitStatus';
import { routerHookPropName } from './routerHooks';
import Debug from 'debug';

const debug = new Debug('react-router-hook:routerModule');

/**
 * Router action types:
 * ROUTER_WILL_CHANGE: before data loading
 */
const ROUTER_WILL_LOAD = '@@react-router-hook/ROUTER_WILL_LOAD';
const ROUTER_DID_LOAD = '@react-router-hook/ROUTER_DID_LOAD';

// component action types:
// init [blocking loading] - post  -  [defer loading] - done
const COMPONENT_WILL_LOAD = '@@react-router-hook/COMPONENT_WILL_LOAD';
const COMPONENT_DID_PRELOAD = '@@react-router-hook/COMPONENT_DID_PRELOAD';
const COMPONENT_DID_LOAD = '@@react-router-hook/COMPONENT_DID_LOAD';

function arrayReplace(array, index, item) {
  return [
    ...array.slice(0, index),
    item,
    ...array.slice(index + 1),
  ];
}

function arrayPush(array, item) {
  return [
    ...array,
    item,
  ];
}

export const initialState = {
  routerLoading: true,
  components: [],
  componentProps: [],
  componentStatuses: [], // init | defer | done
};

export default function routerHookReducer(state = initialState, { type, payload }) {
  switch (type) {
    case ROUTER_WILL_LOAD: {
      const { components, initStatuses } = payload;
      const componentProps = components.map(() => ({}));
      const componentStatuses = initStatuses;
      return {
        routerLoading: true,
        components,
        componentProps,
        componentStatuses,
      };
    }
    case ROUTER_DID_LOAD: {
      return {
        ...state,
        routerLoading: false,
      };
    }
    case COMPONENT_WILL_LOAD: {
      const { component, initStatus } = payload;
      const {
        components,
        componentProps,
        componentStatuses,
      } = state;
      const idx = components.indexOf(component);
      if (idx === -1) {
        return {
          ...state,
          components: arrayPush(components, component),
          componentProps: arrayPush(componentProps, {}),
          componentStatuses: arrayPush(componentStatuses, initStatus),
        };
      }
      return {
        ...state,
        components: arrayReplace(components, idx, component),
        componentProps: arrayReplace(componentProps, idx, {}),
        componentStatuses: arrayReplace(componentStatuses, idx, initStatus),
      };
    }
    case COMPONENT_DID_PRELOAD: {
      const { component, props = {} } = payload;
      if (!component) {
        console.error('Component does not exist in payload', component);
        return state;
      }
      const {
        components,
        componentProps,
        componentStatuses,
      } = state;
      const idx = components.indexOf(component);
      if (idx === -1) {
        if (!component) {
          console.error('Component does not exist in store', component);
          return state;
        }
        return state;
      }
      return {
        ...state,
        componentProps: arrayReplace(componentProps, idx, {
          ...componentProps[idx],
          ...props,
        }),
        componentStatuses: arrayReplace(componentStatuses, idx, 'defer'),
      };
    }
    case COMPONENT_DID_LOAD: {
      const { component, props = {} } = payload;
      if (!component) {
        console.error('Component does not exist in payload', component);
        return state;
      }
      const {
        components,
        componentProps,
        componentStatuses,
      } = state;
      const idx = components.indexOf(component);
      if (idx === -1) {
        if (!component) {
          console.error('Component does not exist in store', component);
          return state;
        }
        return state;
      }
      return {
        ...state,
        componentProps: arrayReplace(componentProps, idx, {
          ...componentProps[idx],
          ...props,
        }),
        componentStatuses: arrayReplace(componentStatuses, idx, 'done'),
      };
    }
    default:
      return state;
  }
}

export function selectProps(state, component) {
  const idx = state.components.indexOf(component);
  return state.componentProps[idx];
}

export function selectStatus(state, component) {
  const idx = state.components.indexOf(component);
  return state.componentStatuses[idx];
}

export function routerWillLoad(components, initStatuses) {
  return {
    type: ROUTER_WILL_LOAD,
    payload: {
      components,
      initStatuses,
    },
  };
}

export function routerDidLoad() {
  return {
    type: ROUTER_DID_LOAD,
  };
}

export function componentWillLoad(component, initStatus) {
  return {
    type: COMPONENT_WILL_LOAD,
    payload: {
      component,
      initStatus,
    },
  };
}

export function componentDidPreload(component, props = {}) {
  return {
    type: COMPONENT_DID_PRELOAD,
    payload: {
      component,
      props,
    },
  };
}

export function componentDidLoad(component, props = {}) {
  return {
    type: COMPONENT_DID_LOAD,
    payload: {
      component,
      props,
    },
  };
}

export function reloadComponent(component, {
  components,
  location,
  params,
  route,
  routes,
}) {
  return (dispatch, getState, extraArguments) => {
    const start = Date.now();
    if (!component || !component[routerHookPropName]) {
      return Promise.resolve();
    }
    if (debug.enabled) {
      debug('Reloading component', (component.displayName || component));
    }
    const routerHooks = component[routerHookPropName];
    let props = {};
    const {
      routerDidEnterHooks = [],
      routerWillEnterHooks = [],
      onAborted, // eslint-disable-line no-unused-vars
      onCompleted, // eslint-disable-line no-unused-vars
      onError, // eslint-disable-line no-unused-vars
      onStarted, // eslint-disable-line no-unused-vars
      ...restArgs,
    } = extraArguments;

    const locals = {
      ...restArgs,
      components,
      location,
      params,
      route: route || routes[routes.length - 1],
      routes,
      getProps: () => selectProps(getState(), component),
      setProps: p => {
        props = {
          ...selectProps(getState(), component),
          ...p,
        };
      },
    };

    const willEnterHooks = routerWillEnterHooks
      .map(key => routerHooks[key])
      .filter(f => f);
    const didEnterHooks = routerDidEnterHooks
      .map(key => routerHooks[key])
      .filter(f => f);
    const initStatus = getInitStatus(component, routerWillEnterHooks);
    dispatch(componentWillLoad(component, initStatus));
    const willEnterHooksPromise = initStatus === 'init' ? willEnterHooks.reduce(
      (total, current) => total.then(() => current(locals))
      , Promise.resolve()).then(() => {
        dispatch(componentDidPreload(component, props));
      }) : Promise.resolve();

    return didEnterHooks.reduce(
      (total, current) => total.then(() => current(locals))
      , willEnterHooksPromise).then(() => {
        if (debug.enabled) {
          debug(`Reloading component... finished in ${Date.now() - start} ms`, (component.displayName || component)); // eslint-disable-line max-len
        }
        dispatch(componentDidLoad(component, props));
      });
  };
}

export function reloadAllComponents(components, renderProps) {
  return (dispatch, getState, extraArguments) => {
    const start = Date.now();
    if (debug.enabled) {
      debug('Reloading all components');
    }
    const {
      routerWillEnterHooks = [],
      onAborted = () => {},
      onCompleted = () => {},
      onError = () => {},
      onStarted = () => {},
    } = extraArguments;

    if (getState().routerLoading) {
      onAborted();
    }

    const allComponents = getAllComponents(components);
    const initStatuses = allComponents.map(c => getInitStatus(c, routerWillEnterHooks));
    onStarted();
    dispatch(routerWillLoad(allComponents, initStatuses));
    const promises = allComponents.map(c => dispatch(reloadComponent(c, renderProps)));
    return Promise
      .all(promises)
      .then(() => {
        if (debug.enabled) {
          debug(`Reloading all components...finished in ${Date.now() - start} ms`);
        }
        dispatch(routerDidLoad());
        onCompleted();
      })
      .catch(err => {
        dispatch(routerDidLoad());
        onError(err);
        throw err;
      });
  };
}
