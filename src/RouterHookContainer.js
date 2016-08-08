import React from 'react';
import { selectProps, selectStatus } from './routerModule';

export default class RouterHookContainer extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
    initStatus: React.PropTypes.oneOf(['init', 'defer', 'done']),
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
    return this.props.location !== nextProps.location ||
      this.state.routerLoading !== nextState.routerLoading ||
      this.state.componentStatus !== nextState.componentStatus;
  }

  componentWillUnmount() {
    this.tryUnsubscribe();
    this.clearCache();
  }

  trySubscribe() {
    if (!this.unsubscribe) {
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

    const { reloadComponent } = this.context.routerHookContext;
    const initStatus = componentStatus || this.props.initStatus;

    if (initStatus === 'init') {
      if (!this.prevChildren) {
        return null;
      }
      return React.cloneElement(this.prevChildren, {
        componentStatus: initStatus,
        reloadComponent: () => reloadComponent(this.Component),
        routerLoading,
      });
    }

    this.prevChildren = React.cloneElement(this.props.children, {
      ...componentProps,
      componentStatus: initStatus,
      reloadComponent: () => reloadComponent(this.Component),
      routerLoading,
    });
    return this.prevChildren;
  }
}
