import React from 'react';
import RouterHookContext from './RouterHookContext';
import RouterHookContainer from './RouterHookContainer';

export default function useRouterHook(options) {
  return {
    renderRouterContext: (child, renderProps) => (
      <RouterHookContext
        {...renderProps}
        {...options}
      >
        {child}
      </RouterHookContext>
    ),
    renderRouteComponent: (child, renderProps) => {
      if (child.type['@@react-router-hooks']) {
        return (
          <RouterHookContainer
            {...renderProps}
          >
            {child}
          </RouterHookContainer>
        );
      }
      return child;
    },
  };
}
