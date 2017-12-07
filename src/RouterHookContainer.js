import React from 'react';
import PropTypes from 'prop-types';

import { ComponentStatus, routerHookPropName } from './constants';
import getInitStatus from './getInitStatus';
import { renderPropsShape, routerHookContextShape } from './PropTypes';

const ABORT = 'abort';

export default class RouterHookContainer extends React.Component {
  static propTypes = {
    children: PropTypes.node.isRequired,
    locals: PropTypes.object.isRequired,
    renderProps: renderPropsShape.isRequired,
    routerDidEnterHooks: PropTypes.arrayOf(PropTypes.string).isRequired,
    routerWillEnterHooks: PropTypes.arrayOf(PropTypes.string).isRequired,
  }

  static contextTypes = {
    routerHookContext: routerHookContextShape,
  };

  constructor(props, context) {
    super(props, context);
    this.setStatus = this.setStatus.bind(this);
    this.reloadComponent = this.reloadComponent.bind(this);

    this.mounted = false;
    this.state = {
      status: getInitStatus(
        props.children.type,
        this.props.routerWillEnterHooks,
      ),
    };
  }

  componentWillMount() {
    this.context.routerHookContext.setComponentStatus(this.Component, getInitStatus(
      this.Component,
      this.props.routerWillEnterHooks,
    ));
  }

  componentDidMount() {
    this.mounted = true;
    this.reloadComponent(true);
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.renderProps.location !== nextProps.renderProps.location) {
      this.context.routerHookContext.setComponentStatus(this.Component, getInitStatus(
        this.Component,
        this.props.routerWillEnterHooks,
      ));
      this.setState({
        status: getInitStatus(
          this.Component,
          this.props.routerWillEnterHooks,
        ),
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.renderProps.location !== prevProps.renderProps.location) {
      this.reloadComponent(true);
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  get Component() {
    return this.props.children.type;
  }

  setStatus(status, shouldReport, err) {
    if (this.state.status === status || !this.mounted) {
      return;
    }
    this.setState({ status });
    if (shouldReport) {
      this.context.routerHookContext.setComponentStatus(this.Component, status, err);
    }
  }

  reloadComponent(shouldReportStatus = false) {
    if (!this.mounted) {
      return Promise.resolve();
    }
    const routerHooks = this.Component[routerHookPropName];
    if (!routerHooks) {
      return Promise.resolve();
    }
    const {
      locals,
      renderProps,
      routerDidEnterHooks,
      routerWillEnterHooks,
    } = this.props;

    const initStatus = getInitStatus(
      this.Component,
      routerWillEnterHooks,
    );

    const { location } = renderProps;
    const args = {
      ...renderProps,
      ...locals,
    };

    return Promise.resolve()
      .then(() => {
        const willEnterHooks = routerWillEnterHooks
          .map(key => routerHooks[key])
          .filter(f => f);
        if (willEnterHooks.length < 1) {
          return null;
        }
        this.setStatus(initStatus, shouldReportStatus);
        return willEnterHooks
          .reduce((total, hook) => total.then(() => {
            if (location !== renderProps.location || !this.mounted) {
              return Promise.reject(ABORT);
            }
            return hook(args);
          }), Promise.resolve());
      })
      .then(() => {
        if (location !== renderProps.location || !this.mounted) {
          return Promise.reject(ABORT);
        }
        const didEnterHooks = routerDidEnterHooks
          .map(key => routerHooks[key])
          .filter(f => f);
        if (didEnterHooks.length < 1) {
          return null;
        }
        if (this.state.status !== ComponentStatus.DEFER) {
          this.setStatus(ComponentStatus.DEFER, shouldReportStatus);
        }
        return didEnterHooks
          .reduce((total, hook) => total.then(() => {
            if (location !== renderProps.location || !this.mounted) {
              return Promise.reject(ABORT);
            }
            return hook(args);
          }), Promise.resolve());
      })
      .then(() => {
        if (location !== renderProps.location || !this.mounted) {
          return Promise.reject(ABORT);
        }
        if (this.state.status !== ComponentStatus.DONE) {
          this.setStatus(ComponentStatus.DONE, shouldReportStatus);
        }
        return null;
      })
      .catch((err) => {
        if (err === ABORT) {
          return;
        }
        this.setStatus(ComponentStatus.DONE, shouldReportStatus, err);
      });
  }

  render() {
    const {
      children,
      locals,
      renderProps,
      routerDidEnterHooks,
      routerWillEnterHooks,
      ...restProps
    } = this.props;
    const passProps = {
      ...restProps,
      componentStatus: this.state.status,
      reloadComponent: this.reloadComponent,
    };

    if (this.state.status === ComponentStatus.INIT) {
      if (!this.prevChildren) {
        return null;
      }
      return React.cloneElement(this.prevChildren, passProps);
    }

    this.prevChildren = React.cloneElement(children, passProps);
    return this.prevChildren;
  }
}
