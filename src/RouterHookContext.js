import React from 'react';
import EventEmitter from 'eventemitter3';
import { ComponentStatus, routerHookPropName } from './constants';
import getAllComponents from './getAllComponents';
import { componentsShape, locationShape, routerHookContextShape } from './PropTypes';

const CHANGE_LOADING_STATE = 'changeLoadingState';
const canUseDOM = !!(
  typeof window !== 'undefined' &&
    window.document &&
    window.document.createElement
);
const noop = () => null;

export default class RouterHookContext extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
    components: React.PropTypes.arrayOf(componentsShape).isRequired,
    location: locationShape.isRequired,
    onAborted: React.PropTypes.func.isRequired,
    onCompleted: React.PropTypes.func.isRequired,
    onError: React.PropTypes.func.isRequired,
    onStarted: React.PropTypes.func.isRequired,
  };

  static childContextTypes = {
    routerHookContext: routerHookContextShape,
  };

  constructor(props) {
    super(props);
    this.componentStatuses = {};
    this.setComponentStatus = this.setComponentStatus.bind(this);
    this.getComponentStatus = this.getComponentStatus.bind(this);
    this.addLoadingListener = this.addLoadingListener.bind(this);
    this.updateRouterLoading = this.updateRouterLoading.bind(this);
    this.loading = false;
  }

  getChildContext() {
    return {
      routerHookContext: {
        getComponentStatus: this.getComponentStatus,
        setComponentStatus: this.setComponentStatus,
        addLoadingListener: this.addLoadingListener,
      },
    };
  }

  componentDidMount() {
    this.props.onStarted();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location === this.props.location) {
      return;
    }
    this.componentStatuses = {};
    if (this.loading) {
      this.props.onAborted();
    }
  }

  componentWillUnmount() {
    if (this.routerEventEmitter) {
      this.routerEventEmitter.removeAllListeners(CHANGE_LOADING_STATE);
      this.routerEventEmitter = null;
    }
  }

  setComponentStatus(Component, status, err) {
    const routerHooks = Component[routerHookPropName];
    if (!routerHooks) {
      return;
    }
    this.componentStatuses[routerHooks.id] = status;
    if (err) {
      this.props.onError({ Component, error: err });
      this.componentStatuses[routerHooks.id] = ComponentStatus.DONE;
    }
    this.updateRouterLoading();
  }

  getComponentStatus(Component) {
    const routerHooks = Component[routerHookPropName];
    if (!routerHooks) {
      return null;
    }
    return this.componentStatuses[routerHooks.id];
  }

  addLoadingListener(listener) {
    if (!canUseDOM) {
      return noop;
    }
    if (!this.routerEventEmitter) {
      this.routerEventEmitter = new EventEmitter();
    }
    this.routerEventEmitter.on(CHANGE_LOADING_STATE, listener);
    return () => {
      this.routerEventEmitter.removeListener(CHANGE_LOADING_STATE, listener);
    };
  }

  updateRouterLoading() {
    if (!canUseDOM) {
      return;
    }
    const components = getAllComponents(this.props.components);
    let total = 0;
    let init = 0;
    let defer = 0;
    let done = 0;
    for (let i = 0, length = components.length; i < length; i += 1) {
      const hookId = components[i][routerHookPropName].id;
      total += 1;
      const status = this.componentStatuses[hookId];
      switch (status) {
        case ComponentStatus.INIT:
          init += 1;
          break;
        case ComponentStatus.DEFER:
          defer += 1;
          break;
        case ComponentStatus.DONE:
          done += 1;
          break;
        default:
          init += 1;
      }
    }

    const loading = done < total;
    if (this.routerEventEmitter) {
      this.routerEventEmitter.emit(CHANGE_LOADING_STATE, loading, {
        total,
        init,
        defer,
        done,
      });
    }
    if (this.loading !== loading) {
      this.loading = loading;
      if (!loading) {
        this.props.onCompleted();
      } else {
        this.props.onStarted();
      }
    }
  }

  render() {
    return this.props.children;
  }
}
