import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import delve from 'dlv';

import propName from './propName';
import { RouterHookConsumer } from './context';
import triggerHooks from './triggerHooks';

const DEFAULT_HOOK_OPTIONS = {
  withRef: false,
  blockMode: true,
  exposeLoading: false,
  exposeReloadComponent: false
};

function getDisplayName(Component) {
  return (
    Component.displayName ||
    Component.name ||
    (typeof Component === 'string' && Component.length > 0
      ? Component
      : 'Unknown')
  );
}

function withForwardRef(withRef) {
  return withRef && React.forwardRef
    ? fn => React.forwardRef((props, ref) => fn(props, ref))
    : fn => props => fn(props);
}

const routerHooks = (hooks, hookOpts) => {
  const hookOptions = {
    ...DEFAULT_HOOK_OPTIONS,
    ...(hookOpts || {})
  };
  return Component => {
    const componentDisplayName = getDisplayName(Component);
    /* eslint no-param-reassign:0 */
    hooks.id =
      hooks.id ||
      `${componentDisplayName}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    Component[propName] = hooks;
    /* eslint no-param-reassign:1 */

    class RouterHookLoadable extends React.Component {
      constructor(props) {
        super(props);
        this.updateState = this.updateState.bind(this);
        this.reloadComponent = this.reloadComponent.bind(this);
        this.state = {
          loading: false,
          props: null
        };
      }

      componentDidMount() {
        const { context } = this.props;
        const { triggerConfig } = context;
        const { store } = triggerConfig;
        this.unsubscribe = store.subscribe(this.updateState);
        setTimeout(this.reloadComponent);
      }

      shouldComponentUpdate(nextProps, nextState) {
        const { context } = this.props;
        const { context: nextContext } = nextProps;
        const { loading } = this.state;
        if (!hookOptions.blockMode) return true;
        if (hookOptions.exposeLoading && loading !== nextState.loading) {
          return true;
        }
        return !nextState.loading || context.version !== nextContext.version;
      }

      componentDidUpdate(prevProps) {
        const { context } = this.props;
        const { context: prevContext } = prevProps;
        if (context.version !== prevContext.version) {
          setTimeout(this.reloadComponent);
        }
      }

      componentWillUnmount() {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = undefined;
        }
      }

      updateState() {
        const { context } = this.props;
        const { triggerConfig } = context;
        const { store } = triggerConfig;
        const loading = delve(store.getState(), [hooks.id, 'loading'], false);
        const props = delve(store.getState(), [hooks.id, 'props'], null);
        const { loading: currentLoading, props: currentProps } = this.state;
        if (loading !== currentLoading || props !== currentProps) {
          this.setState({
            loading,
            props
          });
        }
      }

      reloadComponent() {
        const { context } = this.props;
        const { triggerConfig, version } = context;
        return triggerHooks(Component, triggerConfig, version);
      }

      render() {
        const { context, forwardedRef, ownProps } = this.props;
        const { triggerConfig } = context;
        const { store } = triggerConfig;
        const { loading } = this.state;

        const props = {
          ...ownProps,
          ...delve(store.getState(), [hooks.id, 'props'], {})
        };
        if (hookOptions.exposeLoading) props.loading = loading;
        if (hookOptions.exposeReloadComponent)
          props.reloadComponent = this.reloadComponent;
        if (forwardedRef) props.ref = forwardedRef;
        return <Component {...props} />;
      }
    }
    RouterHookLoadable.displayName = `RouterHookLoadable(${componentDisplayName})`;

    const WithRouterHookConsumer = withForwardRef(hookOptions.withRef)(
      (ownProps, ref) => (
        <RouterHookConsumer>
          {context => {
            const passProps = {
              ownProps,
              context,
              forwardedRef: ref
            };
            return <RouterHookLoadable {...passProps} />;
          }}
        </RouterHookConsumer>
      )
    );
    WithRouterHookConsumer.WrappedComponent = Component;
    hoistNonReactStatics(WithRouterHookConsumer, Component);
    WithRouterHookConsumer.displayName = `@routerHooks(${componentDisplayName})`;
    return WithRouterHookConsumer;
  };
};

export default routerHooks;
