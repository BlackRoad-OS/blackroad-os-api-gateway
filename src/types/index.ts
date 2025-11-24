export type ServiceMap = {
  api: string;
  operator: string;
  core: string;
  prism: string;
};

export type GatewayContext = {
  services: ServiceMap;
};
