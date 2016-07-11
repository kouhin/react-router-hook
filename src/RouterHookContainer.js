import React from 'react';
import { routerHookPropName } from './routerHooks';
import { selectProps, selectStatus } from './routerModule';

export default class RouterHookContainer extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
    location: React.PropTypes.object.isRequired,
  }

  static contextTypes = {
    routerHookContext: React.PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.Component = props.children.type;
    this.state = {};
  }

  componentDidMount() {
    this.trySubscribe();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.location !== nextProps.location) {
      return true;
    }
    return nextState.componentStatus !== 'init' &&
      (this.state.routerLoading !== nextState.routerLoading ||
        this.state.componentStatus !== nextState.componentStatus);
  }

  componentWillUnmount() {
    this.tryUnsubscribe();
    this.clearCache();
  }

  shouldSubscribe() {
    return !!this.Component && !!this.Component[routerHookPropName];
  }

  trySubscribe() {
    if (this.shouldSubscribe() && !this.unsubscribe) {
      this.unsubscribe = this.context.routerHookContext.subscribe(this.handleChange.bind(this));
      this.handleChange();
    }
  }

  tryUnsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  clearCache() {
    this.hasStoreStateChanged = null;
  }

  handleChange() {
    if (!this.unsubscribe) {
      return;
    }

    const storeState = this.context.routerHookContext.getState();
    if (!storeState) {
      console.error('storeState is empty', storeState, this.context.routerHookContext);
    }
    const prevStoreState = this.state.storeState;
    if (prevStoreState === storeState) {
      return;
    }

    this.hasStoreStateChanged = true;
    this.setState({
      storeState,
      componentProps: selectProps(storeState, this.Component),
      componentStatus: selectStatus(storeState, this.Component),
      routerLoading: storeState.routerLoading,
    });
  }

  render() {
    this.hasStoreStateChanged = false;
    const {
      componentProps = {},
      componentStatus,
      routerLoading,
    } = this.state;
    const {
      reloadComponent,
    } = this.context.routerHookContext;

    if (componentStatus === 'init') {
      return null;
    }

    return React.cloneElement(this.props.children, {
      ...componentProps,
      componentStatus,
      reloadComponent: () => reloadComponent(this.Component),
      routerLoading,
    });
  }
}
