import React from 'react';
import series from 'async/series';
import asyncify from 'async/asyncify';
import mapSeries from 'async/mapSeries';

import { ComponentStatus, routerHookPropName } from './constants';
import getInitStatus from './getInitStatus';
import { renderPropsShape, routerHookContextShape } from './PropTypes';

const ABORT = 'abort';

export default class RouterHookContainer extends React.Component {
  static propTypes = {
    children: React.PropTypes.node.isRequired,
    locals: React.PropTypes.object.isRequired,
    renderProps: renderPropsShape.isRequired,
    routerDidEnterHooks: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
    routerWillEnterHooks: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
  }

  static contextTypes = {
    routerHookContext: routerHookContextShape,
  };

  constructor(props, context) {
    super(props, context);
    this.setStatus = this.setStatus.bind(this);
    this.reloadComponent = this.reloadComponent.bind(this);
    this.mounted = false;

    const initStatus = getInitStatus(
      props.children.type,
      this.props.routerWillEnterHooks,
    );
    this.shouldReload = false;
    this.status = initStatus;
    this.childProps = {};
  }

  componentWillMount() {
    this.context.routerHookContext.setComponentStatus(this.Component, this.status);
  }

  componentDidMount() {
    this.mounted = true;
    setTimeout(() => {
      this.reloadComponent(true);
    });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.renderProps.location !== nextProps.renderProps.location) {
      this.status = getInitStatus(
        this.Component,
        this.props.routerWillEnterHooks,
      );
      this.childProps = {};
      this.shouldReload = true;
      if (this.mounted) {
        this.forceUpdate();
      }
      return;
    }

    if (this.mounted) {
      this.forceUpdate();
    }
  }

  shouldComponentUpdate() {
    return false;
  }

  componentDidUpdate() {
    if (this.shouldReload) {
      this.shouldReload = false;
      setTimeout(() => {
        this.reloadComponent(true);
      });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  setStatus(status, shouldReport, err) {
    const shouldUpdate = this.status !== status;
    this.status = status;
    if (shouldReport) {
      this.context.routerHookContext.setComponentStatus(this.Component, status, err);
    }
    if (shouldUpdate) {
      if (this.mounted) {
        this.forceUpdate();
      }
    }
  }

  get Component() {
    return this.props.children.type;
  }

  reloadComponent(shouldReportStatus = false) {
    const routerHooks = this.Component[routerHookPropName];
    if (!routerHooks) {
      return;
    }
    /* eslint-disable no-unused-vars */
    const {
      children,
      locals,
      renderProps,
      routerDidEnterHooks,
      routerWillEnterHooks,
    } = this.props;
    /* eslint-enable no-unused-vars */

    const initStatus = getInitStatus(
      this.Component,
      routerWillEnterHooks,
    );

    this.setStatus(initStatus, shouldReportStatus);
    if (initStatus === ComponentStatus.DONE) {
      return;
    }

    const location = renderProps.location;

    const args = {
      ...renderProps,
      ...locals,
      getProps: () => this.childProps,
      setProps: (p) => {
        if (location === renderProps.location) {
          this.childProps = {
            ...this.childProps,
            ...p,
          };
          if (this.mounted) {
            this.forceUpdate();
          }
        }
      },
    };

    series([
      (callback) => {
        if (location !== renderProps.location) {
          callback(ABORT);
          return;
        }
        if (initStatus === 'init') {
          callback();
          return;
        }
        const willEnterHooks = routerWillEnterHooks
              .map(key => routerHooks[key])
              .filter(f => f)
              .map(f => asyncify(f));
        if (willEnterHooks.length > 0) {
          mapSeries(willEnterHooks, (hook, cb) => {
            if (location === renderProps.location) {
              hook(args, cb);
            }
          }, callback);
        } else {
          callback();
        }
      },
      (callback) => {
        if (location !== renderProps.location) {
          callback(ABORT);
          return;
        }
        this.setStatus(ComponentStatus.DEFER, shouldReportStatus);
        callback();
      },
      (callback) => {
        if (location !== renderProps.location) {
          callback(ABORT);
          return;
        }
        const didEnterHooks = routerDidEnterHooks
          .map(key => routerHooks[key])
          .filter(f => f)
              .map(f => asyncify(f));
        if (didEnterHooks.length > 0) {
          mapSeries(didEnterHooks, (hook, cb) => {
            if (location === renderProps.location) {
              hook(args, cb);
            }
          }, callback);
        } else {
          callback();
        }
      },
      (callback) => {
        if (location !== renderProps.location) {
          callback(ABORT);
          return;
        }
        this.setStatus(ComponentStatus.DONE, shouldReportStatus);
        callback();
      },
    ], (err) => {
      if (err && err === ABORT) {
        return;
      }
      this.setStatus(ComponentStatus.DONE, shouldReportStatus, err);
    });
  }

  render() {
    const status = this.status;
    /* eslint-disable no-unused-vars */
    const {
      children,
      locals,
      renderProps,
      routerDidEnterHooks,
      routerWillEnterHooks,
      ...restProps
    } = this.props;
    /* eslint-enable no-unused-vars */
    const passProps = {
      ...restProps,
      ...this.childProps,
      componentStatus: status,
      reloadComponent: this.reloadComponent,
    };

    if (status === ComponentStatus.INIT) {
      if (!this.prevChildren) {
        return null;
      }
      return React.cloneElement(this.prevChildren, passProps);
    }

    this.prevChildren = React.cloneElement(this.props.children, passProps);
    return this.prevChildren;
  }
}
