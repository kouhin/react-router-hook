import uuid from 'uuid';
import React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import delve from 'dlv';
import PropTypes from 'prop-types';

import propName from './propName';
import { RouterHookConsumer } from './context';
import triggerHooks from './triggerHooks';

const DEFAULT_HOOK_OPTIONS = {
  preventUpdateOnLoad: true,
  exposeLoading: false,
  exposeReloadComponent: false
};

const configProp = '@@triggerConfig';
const versionProp = '@@version';

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

    class RouterHookInnerLoadable extends React.Component {
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
        const { [configProp]: triggerConfig } = this.props;
        const { store } = triggerConfig;
        this.unsubscribe = store.subscribe(this.updateState);
        setTimeout(this.reloadComponent);
      }

      shouldComponentUpdate(nextProps, nextState) {
        const { [versionProp]: version } = this.props;
        const { [versionProp]: nextVersion } = nextProps;

        const { loading } = this.state;

        if (!hookOptions.preventUpdateOnLoad) return true;
        if (hookOptions.exposeLoading && loading !== nextState.loading) {
          return true;
        }
        return !nextState.loading || version !== nextVersion;
      }

      componentDidUpdate(prevProps) {
        const { [versionProp]: version } = this.props;
        const { [versionProp]: prevVersion } = prevProps;
        if (version !== prevVersion) {
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
        const { [configProp]: triggerConfig } = this.props;
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
        const {
          [configProp]: triggerConfig,
          [versionProp]: version
        } = this.props;
        return triggerHooks(Component, triggerConfig, version);
      }

      render() {
        const { [configProp]: triggerConfig, ...restProps } = this.props;
        const { loading } = this.state;
        const { store } = triggerConfig;

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

    RouterHookInnerLoadable.propTypes = {
      [configProp]: PropTypes.shape({
        hookNames: PropTypes.arrayOf(PropTypes.string).isRequired,
        locals: PropTypes.object.isRequired,
        store: PropTypes.object.isRequired,
        onError: PropTypes.func
      }).isRequired,
      [versionProp]: PropTypes.string.isRequired
    };

    function RouterHookLoadable(props) {
      return (
        <RouterHookConsumer>
          {({ triggerConfig, version }) => {
            if (!triggerConfig || !version) return <Component {...props} />;
            const passProps = {
              ...props,
              [configProp]: triggerConfig,
              [versionProp]: version
            };
            return <RouterHookInnerLoadable {...passProps} />;
          }}
        </RouterHookConsumer>
      );
    }

    RouterHookLoadable.WrappedComponent = Component;

    return hoistNonReactStatics(RouterHookLoadable, Component);
  };
};

export default routerHooks;
