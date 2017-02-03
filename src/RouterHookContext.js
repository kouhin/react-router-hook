import React from 'react';
import throttle from 'lodash/throttle';
import { ComponentStatus } from './constants';
import getAllComponents from './getAllComponents';
import { componentsShape, locationShape } from './PropTypes';

export default class RouterHookContext extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
    components: componentsShape.isRequired,
    location: locationShape.isRequired,
    onAborted: React.PropTypes.func.isRequired,
    onCompleted: React.PropTypes.func.isRequired,
    onError: React.PropTypes.func.isRequired,
    onStarted: React.PropTypes.func.isRequired,
  };

  static childContextTypes = {
    routerHookContext: React.PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.componentStatuses = new WeakMap();
    this.setComponentStatus = this.setComponentStatus.bind(this);
    this.getComponentStatus = this.getComponentStatus.bind(this);
    this.updateRouterLoading = throttle(this.updateRouterLoading, 100).bind(this);
    this.loading = false;
    this.state = {
      routerLoading: this.loading,
    };
  }

  getChildContext() {
    return {
      routerHookContext: {
        getComponentStatus: this.getComponentStatus,
        routerLoading: this.state.routerLoading,
        setComponentStatus: this.setComponentStatus,
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
    if (this.loading) {
      this.props.onAborted();
    }
  }

  setComponentStatus(Component, status, err) {
    setTimeout(() => {
      this.componentStatuses.set(Component, status);
      this.updateRouterLoading();
      if (err) {
        this.props.onError({ Component, error: err });
      }
    });
  }

  getComponentStatus(Component) {
    return this.componentStatuses.get(Component);
  }

  updateRouterLoading() {
    const loading = (() => {
      const components = getAllComponents(this.props.components);
      for (let i = 0, length = components.length; i < length; i += 1) {
        const status = this.componentStatuses.get(components[i]);
        if (status && status !== ComponentStatus.DONE) {
          return true;
        }
      }
      return false;
    })();
    if (this.loading !== loading) {
      this.loading = loading;
      if (!loading) {
        this.props.onCompleted();
      }
      this.setState({
        routerLoading: this.loading,
      });
    }
  }

  render() {
    return this.props.children;
  }
}
