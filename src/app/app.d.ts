export type ClusterMessage = {
  cmd: string;
  data?: {
    portIndex?: number;
  };
};
