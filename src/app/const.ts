export const DEFAULT_PORT = 4000;
export const DEFAULT_BASE_URL = 'localhost';
export const DEFAULT_CLUSTER_MODE = 'none';

export const CONTENT_TYPE_JSON = { 'content-Type': 'application/json' };

type ClusterCommandsMap = {
  [key: string]: string;
};
export const clusterCommandsMap: ClusterCommandsMap = {
  workersRequest: 'workersResponse',
  getAllUsersRequest: 'getAllUsersResponse',
  getOneUserRequest: 'getOneUserResponse',
  createUserRequest: 'createUserResponse',
  updateUserRequest: 'updateUserResponse',
  deleteUserRequest: 'deleteUserResponse',
};
