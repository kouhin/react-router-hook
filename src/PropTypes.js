import PropTypes from 'prop-types';

const {
  func,
  object,
  arrayOf,
  oneOfType,
  element,
  shape,
  string,
} = PropTypes;

export const componentShape = oneOfType([func, string]);
export const componentsShape = oneOfType([componentShape, object]);

export const routeShape = oneOfType([object, element]);
export const routesShape = oneOfType([routeShape, arrayOf(routeShape)]);

export const routerShape = shape({
  push: func.isRequired,
  replace: func.isRequired,
  go: func.isRequired,
  goBack: func.isRequired,
  goForward: func.isRequired,
  setRouteLeaveHook: func.isRequired,
  isActive: func.isRequired,
});

export const locationShape = shape({
  pathname: string.isRequired,
  search: string.isRequired,
  state: object,
  action: string.isRequired,
  key: string,
});


export const renderPropsShape = shape({
  location: locationShape,
  routes: routesShape,
  params: object,
  components: componentsShape,
  router: routerShape,
});

export const routerHookContextShape = shape({
  getComponentStatus: func,
  setComponentStatus: func,
  addLoadingListener: func,
});
