import uuid from 'uuid';
import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import delve from 'dlv';

import propName from './propName';
import { RouterHookConsumer } from './context';
import triggerHooks from './triggerHooks';

const DEFAULT_HOOK_OPTIONS = {
  preventUpdateOnLoad: true,
  exposeLoading: false,
  exposeReloadComponent: false
};

const contextProp = '@@hookctx';

function getDisplayName(Component) {
  return (
    Component.displayName ||
    Component.name ||
    (typeof Component === 'string' && Component.length > 0
      ? Component
      : 'Unknown')
  );
}

const routerHooks = (hooks, hookOpts) => {
  // eslint-disable-next-line no-param-reassign
  hooks.id = hooks.id || uuid();
  const hookOptions = {
    ...DEFAULT_HOOK_OPTIONS,
    ...(hookOpts || {})
  };
  return Component => {
    // eslint-disable-next-line no-param-reassign
    Component[propName] = hooks;

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
        const { [contextProp]: context } = this.props;
        const { triggerConfig } = context;
        const { store } = triggerConfig;
        this.unsubscribe = store.subscribe(this.updateState);
        setTimeout(this.reloadComponent);
      }

      shouldComponentUpdate(nextProps, nextState) {
        const { [contextProp]: context } = this.props;
        const { [contextProp]: nextContext } = nextProps;
        const { loading } = this.state;
        if (!hookOptions.preventUpdateOnLoad) return true;
        if (hookOptions.exposeLoading && loading !== nextState.loading) {
          return true;
        }
        return !nextState.loading || context.version !== nextContext.version;
      }

      componentDidUpdate(prevProps) {
        const { [contextProp]: context } = this.props;
        const { [contextProp]: prevContext } = prevProps;
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
        const { [contextProp]: context } = this.props;
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
        const { [contextProp]: context } = this.props;
        const { triggerConfig, version } = context;
        return triggerHooks(Component, triggerConfig, version);
      }

      render() {
        const { [contextProp]: context, ...restProps } = this.props;
        const { triggerConfig } = context;
        const { store } = triggerConfig;
        const { loading } = this.state;

        const props = {
          ...restProps,
          ...delve(store.getState(), [hooks.id, 'props'], {})
        };
        if (hookOptions.exposeLoading) {
          props.loading = loading;
        }
        if (hookOptions.exposeReloadComponent) {
          props.reloadComponent = this.reloadComponent;
        }
        return <Component {...props} />;
      }
    }
    RouterHookLoadable.displayName = `RouterHookLoadable(${getDisplayName(
      Component
    )})`;

    const WithRouterHookConsumer = props => (
      <RouterHookConsumer>
        {context => {
          const passProps = {
            ...props,
            [contextProp]: context
          };
          return <RouterHookLoadable {...passProps} />;
        }}
      </RouterHookConsumer>
    );
    WithRouterHookConsumer.WrappedComponent = Component;
    hoistNonReactStatics(WithRouterHookConsumer, Component);
    WithRouterHookConsumer.displayName = `@routerHooks(${getDisplayName(
      RouterHookLoadable
    )})`;
    return WithRouterHookConsumer;
  };
};

export default routerHooks;
