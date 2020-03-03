const REMOTE_MANAGEMENT_ENDPOINT = "wss://remote-mgmt.edgeimpulse.com";
const INGESTION_API = "https://ingestion.edgeimpulse.com";
const LS_API_KEY = "apiKey";
const LS_DEVICE_ID_KEY = "deviceId";

const getRandomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(length);

export const getApiKey = () =>
  new URLSearchParams(window.location.search).get("apiKey") ||
  localStorage.getItem(LS_API_KEY) ||
  "";
export const storeApiKey = (deviceId: string) => {
  localStorage.setItem(LS_API_KEY, deviceId);
};

export const getDeviceId = () =>
  localStorage.getItem(LS_DEVICE_ID_KEY) || `id_${getRandomString(5)}`;
export const storeDeviceId = (deviceId: string) => {
  localStorage.setItem(LS_DEVICE_ID_KEY, deviceId);
};

export const getIngestionApi = () =>
    new URLSearchParams(window.location.search).get("ingestionApi") ||
    INGESTION_API;

export const getRemoteManagementEndpoint = () =>
    new URLSearchParams(window.location.search).get("remoteManagement") ||
    REMOTE_MANAGEMENT_ENDPOINT;