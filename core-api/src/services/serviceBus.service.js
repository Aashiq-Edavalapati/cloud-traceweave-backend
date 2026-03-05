import { ServiceBusClient } from '@azure/service-bus';
import config from '../config/config.js';

let sbClient;
let sender;
let ready = false;
let disabledLogged = false;

const canInitialize = () => {
  return (
    config.serviceBus.enabled &&
    Boolean(config.serviceBus.connectionString) &&
    Boolean(config.serviceBus.queueName)
  );
};

export const initializeServiceBus = async () => {
  if (ready) return true;

  if (!canInitialize()) {
    if (!disabledLogged) {
      console.warn(
        '[ServiceBus] Disabled or missing configuration. Set SERVICE_BUS_CONNECTION_STRING and SERVICE_BUS_QUEUE_NAME to enable.'
      );
      disabledLogged = true;
    }
    return false;
  }

  try {
    sbClient = new ServiceBusClient(config.serviceBus.connectionString);
    sender = sbClient.createSender(config.serviceBus.queueName);
    ready = true;
    console.log(`[ServiceBus] Connected to queue: ${config.serviceBus.queueName}`);
    return true;
  } catch (error) {
    console.error('[ServiceBus] Initialization failed:', error.message);
    ready = false;
    return false;
  }
};

export const sendReplayRequestMessage = async (payload) => {
  const initialized = ready || (await initializeServiceBus());
  if (!initialized || !sender) return;

  try {
    await sender.sendMessages({
      body: payload,
      contentType: 'application/json',
      subject: 'replay.request',
      applicationProperties: {
        source: 'core-api',
        eventType: payload?.event || 'replay_request',
      },
    });
  } catch (error) {
    console.error('[ServiceBus] Failed to send message:', error.message);
  }
};

export const closeServiceBus = async () => {
  try {
    if (sender) {
      await sender.close();
      sender = undefined;
    }

    if (sbClient) {
      await sbClient.close();
      sbClient = undefined;
    }

    ready = false;
  } catch (error) {
    console.error('[ServiceBus] Failed to close client:', error.message);
  }
};
