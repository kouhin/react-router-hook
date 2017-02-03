import React from 'react';
import RouterHookContext from './RouterHookContext';
import RouterHookContainer from './RouterHookContainer';

function noop() {}

export default function useRouterHook(options) {
  let container = null;
  const {
    locals = {},
    onAborted = noop,
    onCompleted = noop,
    onError = noop,
    onStarted = noop,
    routerDidEnterHooks = [],
    routerWillEnterHooks = [],
  } = options;
  return {
    renderRouterContext: (child, renderProps) => {
      const {
        components,
        location,
      } = renderProps;
      return (
        <RouterHookContext
          components={components}
          location={location}
          onAborted={onAborted}
          onCompleted={onCompleted}
          onError={onError}
          onStarted={onStarted}
        >
          {child}
        </RouterHookContext>
      );
    },
    renderRouteComponent: (child, renderProps) => {
      if (!child) {
        return null;
      }
      if (!container) {
        container = (
          <RouterHookContainer
            locals={locals}
            renderProps={renderProps}
            routerDidEnterHooks={routerDidEnterHooks}
            routerWillEnterHooks={routerWillEnterHooks}
          >
            {child}
          </RouterHookContainer>
        );
        return container;
      }
      return React.cloneElement(container, {
        locals,
        renderProps,
        routerDidEnterHooks,
        routerWillEnterHooks,
      }, child);
    },
  };
}
