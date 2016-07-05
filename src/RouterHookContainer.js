import React from 'react';

export default class RouterHookContainer extends React.Component {
  static propTypes = {
    children: React.PropTypes.node,
  }

  static contextTypes = {
    routerHookContext: React.PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.Component = props.children.type;
    this.state = context.routerHookContext.getComponentProps(this.Component)();
  }

  componentWillReceiveProps(nextProps, nextContext) {
    const nextState = nextContext.routerHookContext.getComponentProps(this.Component)();
    if (this.state !== nextState) {
      this.setState(nextState);
    }
  }

  render() {
    return React.cloneElement(this.props.children, this.state);
  }
}
